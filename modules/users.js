// users.js - Module de gestion des utilisateurs
// Module pour l'authentification et la gestion des utilisateurs Linux

import { resolvePath } from './filesystem.js';

let currentUser = {
    username: 'root',
    uid: 0,
    gid: 0,
    home: '/root',
    shell: '/bin/bash',
    groups: ['root']
};

/**
 * Crée une entrée de fichier avec de vraies métadonnées
 * @param {string} content - Contenu du fichier
 * @returns {Object} - Objet fichier avec métadonnées
 */
function createFileEntry(content = '') {
    const now = new Date();
    return {
        type: 'file',
        size: content.length,
        content: content,
        created: now,
        modified: now,
        accessed: now,
        permissions: '-rw-r--r--',
        owner: 'root',
        group: 'root',
        links: 1
    };
}

/**
 * Initialise les fichiers système pour la gestion des utilisateurs
 * @param {Object} fileSystem - Système de fichiers
 */
export function initUserSystem(fileSystem) {
    // Créer /etc si n'existe pas
    if (!fileSystem['/etc']) {
        const now = new Date();
        fileSystem['/etc'] = {
            type: 'dir',
            size: 4096,
            created: now,
            modified: now,
            accessed: now,
            permissions: 'drwxr-xr-x',
            owner: 'root',
            group: 'root',
            links: 2
        };
    }

    // Créer /etc/passwd avec utilisateurs par défaut
    const passwdContent = `root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
sys:x:3:3:sys:/dev:/usr/sbin/nologin
sync:x:4:65534:sync:/bin:/bin/sync
games:x:5:60:games:/usr/games:/usr/sbin/nologin
man:x:6:12:man:/var/cache/man:/usr/sbin/nologin
lp:x:7:7:lp:/var/spool/lpd:/usr/sbin/nologin
mail:x:8:8:mail:/var/mail:/usr/sbin/nologin
news:x:9:9:news:/var/spool/news:/usr/sbin/nologin
nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin`;

    fileSystem['/etc/passwd'] = createFileEntry(passwdContent);

    // Créer /etc/shadow avec mots de passe
    const shadowContent = `root:$6$rounds=656000$YJBFzBTWdhk$fakehashedpassword::0:99999:7:::
daemon:*:19024:0:99999:7:::
bin:*:19024:0:99999:7:::
sys:*:19024:0:99999:7:::
sync:*:19024:0:99999:7:::
games:*:19024:0:99999:7:::
man:*:19024:0:99999:7:::
lp:*:19024:0:99999:7:::
mail:*:19024:0:99999:7:::
news:*:19024:0:99999:7:::
nobody:*:19024:0:99999:7:::`;

    fileSystem['/etc/shadow'] = createFileEntry(shadowContent);
    // Permissions restrictives pour shadow
    fileSystem['/etc/shadow'].permissions = '-rw-------';

    // Créer /etc/group
    const groupContent = `root:x:0:
daemon:x:1:
bin:x:2:
sys:x:3:
adm:x:4:
tty:x:5:
disk:x:6:
lp:x:7:
mail:x:8:
news:x:9:
users:x:100:
nogroup:x:65534:`;

    fileSystem['/etc/group'] = createFileEntry(groupContent);

    // Créer /etc/sudoers
    const sudoersContent = `# sudoers file
#
# This file MUST be edited with the 'visudo' command as root.
#
# See the man page for details on how to write a sudoers file.
#
Defaults        env_reset
Defaults        mail_badpass
Defaults        secure_path="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

# User privilege specification
root    ALL=(ALL:ALL) ALL

# Allow members of group sudo to execute any command
%sudo   ALL=(ALL:ALL) ALL`;

    fileSystem['/etc/sudoers'] = createFileEntry(sudoersContent);
    fileSystem['/etc/sudoers'].permissions = '-r--r-----';
    fileSystem['/etc/sudoers'].group = 'root';
}

/**
 * Parse le fichier /etc/passwd pour obtenir la liste des utilisateurs
 * @param {Object} fileSystem - Système de fichiers
 * @returns {Array} - Liste des utilisateurs
 */
export function parsePasswdFile(fileSystem) {
    const passwdFile = fileSystem['/etc/passwd'];
    if (!passwdFile || passwdFile.type !== 'file' || !passwdFile.content) {
        return [];
    }

    const lines = passwdFile.content.split('\n').filter(line => line.trim());
    return lines.map(line => {
        const [username, password, uid, gid, gecos, home, shell] = line.split(':');
        return {
            username,
            password, // 'x' signifie que le mot de passe est dans /etc/shadow
            uid: parseInt(uid),
            gid: parseInt(gid),
            gecos: gecos || '',
            home: home || '/home/' + username,
            shell: shell || '/bin/bash'
        };
    });
}

/**
 * Parse le fichier /etc/group pour obtenir les groupes
 * @param {Object} fileSystem - Système de fichiers
 * @returns {Array} - Liste des groupes
 */
export function parseGroupFile(fileSystem) {
    const groupFile = fileSystem['/etc/group'];
    if (!groupFile || groupFile.type !== 'file' || !groupFile.content) {
        return [];
    }

    const lines = groupFile.content.split('\n').filter(line => line.trim());
    return lines.map(line => {
        const [name, password, gid, members] = line.split(':');
        return {
            name,
            password: password || 'x',
            gid: parseInt(gid),
            members: members ? members.split(',').filter(m => m) : []
        };
    });
}

/**
 * Ajoute un utilisateur au système
 * @param {string} username - Nom d'utilisateur
 * @param {Object} options - Options (uid, gid, home, shell, gecos)
 * @param {Object} fileSystem - Système de fichiers
 * @param {Function} saveFileSystem - Fonction de sauvegarde
 */
export function addUser(username, options, fileSystem, saveFileSystem) {
    const users = parsePasswdFile(fileSystem);
    
    // Vérifier si l'utilisateur existe déjà
    if (users.find(u => u.username === username)) {
        throw new Error(`useradd: l'utilisateur '${username}' existe déjà`);
    }

    // Déterminer l'UID automatiquement si non spécifié
    let uid = options.uid;
    if (uid === undefined) {
        const existingUids = users.map(u => u.uid).sort((a, b) => a - b);
        uid = 1000; // Commencer à 1000 pour les utilisateurs normaux
        while (existingUids.includes(uid)) {
            uid++;
        }
    }

    // Vérifier si l'UID est déjà utilisé
    if (users.find(u => u.uid === uid)) {
        throw new Error(`useradd: l'UID ${uid} est déjà utilisé`);
    }

    const newUser = {
        username,
        password: 'x',
        uid,
        gid: options.gid || uid, // Par défaut, créer un groupe avec le même ID
        gecos: options.gecos || '',
        home: options.home || `/home/${username}`,
        shell: options.shell || '/bin/bash'
    };

    // Ajouter à /etc/passwd
    const passwdLine = `${newUser.username}:x:${newUser.uid}:${newUser.gid}:${newUser.gecos}:${newUser.home}:${newUser.shell}`;
    const currentPasswd = fileSystem['/etc/passwd'].content || '';
    fileSystem['/etc/passwd'].content = currentPasswd + '\n' + passwdLine;
    fileSystem['/etc/passwd'].size = fileSystem['/etc/passwd'].content.length;
    fileSystem['/etc/passwd'].modified = new Date();

    // Ajouter à /etc/shadow (mot de passe verrouillé par défaut)
    const shadowLine = `${newUser.username}:!:${Math.floor(Date.now() / 86400000)}:0:99999:7:::`;
    const currentShadow = fileSystem['/etc/shadow'].content || '';
    fileSystem['/etc/shadow'].content = currentShadow + '\n' + shadowLine;
    fileSystem['/etc/shadow'].size = fileSystem['/etc/shadow'].content.length;
    fileSystem['/etc/shadow'].modified = new Date();

    // Créer le groupe principal si nécessaire
    const groups = parseGroupFile(fileSystem);
    if (!groups.find(g => g.gid === newUser.gid)) {
        const groupLine = `${newUser.username}:x:${newUser.gid}:`;
        const currentGroup = fileSystem['/etc/group'].content || '';
        fileSystem['/etc/group'].content = currentGroup + '\n' + groupLine;
        fileSystem['/etc/group'].size = fileSystem['/etc/group'].content.length;
        fileSystem['/etc/group'].modified = new Date();
    }

    // Créer le répertoire home
    if (!fileSystem[newUser.home]) {
        const now = new Date();
        fileSystem[newUser.home] = {
            type: 'dir',
            size: 4096,
            created: now,
            modified: now,
            accessed: now,
            permissions: 'drwxr-xr-x',
            owner: newUser.username,
            group: newUser.username,
            links: 2
        };
    }

    saveFileSystem();
    return newUser;
}

/**
 * Supprime un utilisateur du système
 * @param {string} username - Nom d'utilisateur
 * @param {boolean} removeHome - Supprimer le répertoire home
 * @param {Object} fileSystem - Système de fichiers
 * @param {Function} saveFileSystem - Fonction de sauvegarde
 */
export function removeUser(username, removeHome, fileSystem, saveFileSystem) {
    if (username === 'root') {
        throw new Error(`userdel: impossible de supprimer l'utilisateur 'root'`);
    }

    const users = parsePasswdFile(fileSystem);
    const user = users.find(u => u.username === username);
    
    if (!user) {
        throw new Error(`userdel: l'utilisateur '${username}' n'existe pas`);
    }

    // Supprimer de /etc/passwd
    const passwdLines = (fileSystem['/etc/passwd'].content || '').split('\n');
    const newPasswdLines = passwdLines.filter(line => !line.startsWith(username + ':'));
    fileSystem['/etc/passwd'].content = newPasswdLines.join('\n');
    fileSystem['/etc/passwd'].size = fileSystem['/etc/passwd'].content.length;
    fileSystem['/etc/passwd'].modified = new Date();

    // Supprimer de /etc/shadow
    const shadowLines = (fileSystem['/etc/shadow'].content || '').split('\n');
    const newShadowLines = shadowLines.filter(line => !line.startsWith(username + ':'));
    fileSystem['/etc/shadow'].content = newShadowLines.join('\n');
    fileSystem['/etc/shadow'].size = fileSystem['/etc/shadow'].content.length;
    fileSystem['/etc/shadow'].modified = new Date();

    // Supprimer le répertoire home si demandé
    if (removeHome && fileSystem[user.home]) {
        // Supprimer récursivement le home et son contenu
        const homePrefix = user.home === '/' ? '/' : user.home + '/';
        const pathsToDelete = Object.keys(fileSystem).filter(path => 
            path === user.home || path.startsWith(homePrefix)
        );
        pathsToDelete.forEach(path => delete fileSystem[path]);
    }

    saveFileSystem();
}

/**
 * Change l'utilisateur courant
 * @param {string} username - Nom d'utilisateur
 * @param {Object} fileSystem - Système de fichiers
 * @returns {Object} - Nouvel utilisateur courant
 */
export function switchUser(username, fileSystem) {
    const users = parsePasswdFile(fileSystem);
    const user = users.find(u => u.username === username);
    
    if (!user) {
        throw new Error(`su: l'utilisateur '${username}' n'existe pas`);
    }

    const groups = parseGroupFile(fileSystem);
    const userGroups = groups.filter(g => 
        g.gid === user.gid || g.members.includes(username)
    ).map(g => g.name);

    currentUser = {
        username: user.username,
        uid: user.uid,
        gid: user.gid,
        home: user.home,
        shell: user.shell,
        groups: userGroups
    };

    return currentUser;
}

/**
 * Obtient l'utilisateur courant
 * @returns {Object} - Utilisateur courant
 */
export function getCurrentUser() {
    return { ...currentUser };
}

/**
 * Vérifie si l'utilisateur courant est root
 * @returns {boolean} - true si root
 */
export function isRoot() {
    return currentUser.uid === 0;
}

/**
 * Vérifie si l'utilisateur courant peut utiliser sudo
 * @param {Object} fileSystem - Système de fichiers
 * @returns {boolean} - true si peut utiliser sudo
 */
export function canUseSudo(fileSystem) {
    if (isRoot()) return true;

    const sudoersFile = fileSystem['/etc/sudoers'];
    if (!sudoersFile || sudoersFile.type !== 'file' || !sudoersFile.content) {
        return false;
    }

    const content = sudoersFile.content;
    
    // Vérifier si l'utilisateur est explicitement mentionné
    if (content.includes(`${currentUser.username}    ALL=(ALL:ALL) ALL`)) {
        return true;
    }

    // Vérifier si l'utilisateur est dans le groupe sudo
    return currentUser.groups.includes('sudo');
}

/**
 * Change le mot de passe d'un utilisateur
 * @param {string} username - Nom d'utilisateur
 * @param {string} newPassword - Nouveau mot de passe
 * @param {Object} fileSystem - Système de fichiers
 * @param {Function} saveFileSystem - Fonction de sauvegarde
 */
export function changePassword(username, newPassword, fileSystem, saveFileSystem) {
    // Simulation simple du changement de mot de passe
    // Dans un vrai système, on utiliserait des fonctions de hachage
    const hashedPassword = '$6$rounds=656000$salt$' + btoa(newPassword + 'salt');
    
    const shadowLines = (fileSystem['/etc/shadow'].content || '').split('\n');
    const newShadowLines = shadowLines.map(line => {
        if (line.startsWith(username + ':')) {
            const parts = line.split(':');
            parts[1] = hashedPassword; // Remplacer le hash du mot de passe
            parts[2] = Math.floor(Date.now() / 86400000).toString(); // Date de dernière modification
            return parts.join(':');
        }
        return line;
    });

    fileSystem['/etc/shadow'].content = newShadowLines.join('\n');
    fileSystem['/etc/shadow'].size = fileSystem['/etc/shadow'].content.length;
    fileSystem['/etc/shadow'].modified = new Date();
    
    saveFileSystem();
}

/**
 * Obtient les informations d'un utilisateur
 * @param {string} username - Nom d'utilisateur
 * @param {Object} fileSystem - Système de fichiers
 * @returns {Object|null} - Informations utilisateur ou null si introuvable
 */
export function getUserInfo(username, fileSystem) {
    const users = parsePasswdFile(fileSystem);
    return users.find(u => u.username === username) || null;
}

/**
 * Vérifie les permissions pour accéder à un fichier
 * @param {string} filepath - Chemin du fichier
 * @param {string} mode - Mode d'accès ('r', 'w', 'x')
 * @param {Object} fileSystem - Système de fichiers
 * @returns {boolean} - true si l'accès est autorisé
 */
export function checkFilePermissions(filepath, mode, fileSystem) {
    const file = fileSystem[filepath];
    if (!file) return false;

    // Root peut tout faire
    if (isRoot()) return true;

    const permissions = file.permissions || '';
    const owner = file.owner || 'root';
    const group = file.group || 'root';

    let permBits;
    if (owner === currentUser.username) {
        // Permissions du propriétaire (caractères 1-3)
        permBits = permissions.substring(1, 4);
    } else if (currentUser.groups.includes(group)) {
        // Permissions du groupe (caractères 4-6)
        permBits = permissions.substring(4, 7);
    } else {
        // Permissions des autres (caractères 7-9)
        permBits = permissions.substring(7, 10);
    }

    switch (mode) {
        case 'r': return permBits[0] === 'r';
        case 'w': return permBits[1] === 'w';
        case 'x': return permBits[2] === 'x';
        default: return false;
    }
}