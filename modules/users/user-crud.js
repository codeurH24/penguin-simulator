// modules/users/user-crud.js
// CRUD (Create, Read, Update, Delete) pour les utilisateurs - VERSION CORRIGÉE

import { parsePasswdFile, parseGroupFile } from './parsers.js';
import { copySkelFiles } from './home-dirs.js';
import { createDirEntry } from '../filesystem/file-entries.js';

/**
 * Ajoute une ligne à un fichier système en gérant correctement les retours à la ligne
 * @param {Object} file - Objet fichier du système de fichiers
 * @param {string} newLine - Nouvelle ligne à ajouter
 */
function appendLineToSystemFile(file, newLine) {
    let content = file.content || '';
    
    // Si le contenu existe et ne finit pas par \n, ajouter \n
    if (content && !content.endsWith('\n')) {
        content += '\n';
    }
    
    // Ajouter la nouvelle ligne
    content += newLine;
    
    // S'assurer que le fichier finit par \n (standard Debian)
    if (!content.endsWith('\n')) {
        content += '\n';
    }
    
    file.content = content;
    file.size = content.length;
    file.modified = new Date();
}

/**
 * Obtient les informations d'un utilisateur
 * @param {string} username - Nom d'utilisateur
 * @param {Object} fileSystem - Système de fichiers
 * @returns {Object|null} - Informations utilisateur ou null
 */
export function getUserInfo(username, fileSystem) {
    const users = parsePasswdFile(fileSystem);
    return users.find(u => u.username === username) || null;
}

/**
 * Ajoute un utilisateur au système avec support /etc/skel
 * @param {string} username - Nom d'utilisateur
 * @param {Object} options - Options (uid, gid, home, shell, gecos)
 * @param {Object} fileSystem - Système de fichiers
 * @param {Function} saveFileSystem - Fonction de sauvegarde
 * @param {boolean} createHome - Créer le répertoire home (défaut: false)
 */
export function addUser(username, options, fileSystem, saveFileSystem, createHome = false) {
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

    // ✅ CORRECTION: Ajouter à /etc/passwd avec gestion correcte des retours à la ligne
    const passwdLine = `${newUser.username}:x:${newUser.uid}:${newUser.gid}:${newUser.gecos}:${newUser.home}:${newUser.shell}`;
    appendLineToSystemFile(fileSystem['/etc/passwd'], passwdLine);

    // ✅ CORRECTION: Ajouter à /etc/shadow avec gestion correcte des retours à la ligne
    const shadowLine = `${newUser.username}:!:${Math.floor(Date.now() / 86400000)}:0:99999:7:::`;
    appendLineToSystemFile(fileSystem['/etc/shadow'], shadowLine);

    // Créer le groupe principal si nécessaire
    const groups = parseGroupFile(fileSystem);
    if (!groups.find(g => g.gid === newUser.gid)) {
        const groupLine = `${newUser.username}:x:${newUser.gid}:`;
        appendLineToSystemFile(fileSystem['/etc/group'], groupLine);
    }

    // Créer le répertoire home avec copie de /etc/skel
    if (createHome && !fileSystem[newUser.home]) {
        // Créer le répertoire home avec les bonnes permissions
        fileSystem[newUser.home] = createDirEntry(newUser.username, newUser.username, 'drwxr-xr-x');
        
        // Copier les fichiers depuis /etc/skel (comportement Debian standard)
        copySkelFiles(fileSystem, newUser.home, newUser.username, newUser.username);
    }

    saveFileSystem();
    return newUser;
}

/**
 * Ajoute un utilisateur à des groupes supplémentaires
 * @param {string} username - Nom d'utilisateur
 * @param {Array} groupNames - Noms des groupes
 * @param {Object} fileSystem - Système de fichiers
 * @param {Function} saveFileSystem - Fonction de sauvegarde
 */
export function addUserToGroups(username, groupNames, fileSystem, saveFileSystem) {
    const groups = parseGroupFile(fileSystem);
    
    // Vérifier que tous les groupes existent
    for (const groupName of groupNames) {
        const group = groups.find(g => g.name === groupName);
        if (!group) {
            throw new Error(`useradd: le groupe '${groupName}' n'existe pas`);
        }
    }
    
    // Ajouter l'utilisateur à chaque groupe
    for (const groupName of groupNames) {
        const group = groups.find(g => g.name === groupName);
        if (!group.members.includes(username)) {
            group.members.push(username);
        }
    }
    
    // ✅ CORRECTION: Reconstruire le contenu de /etc/group avec gestion correcte des retours à la ligne
    const groupLines = groups.map(g => 
        `${g.name}:x:${g.gid}:${g.members.join(',')}`
    );
    
    fileSystem['/etc/group'].content = groupLines.join('\n') + '\n';
    fileSystem['/etc/group'].size = fileSystem['/etc/group'].content.length;
    fileSystem['/etc/group'].modified = new Date();
    
    saveFileSystem();
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
    const newPasswdLines = users.filter(u => u.username !== username)
        .map(u => `${u.username}:x:${u.uid}:${u.gid}:${u.gecos}:${u.home}:${u.shell}`);
    
    fileSystem['/etc/passwd'].content = newPasswdLines.join('\n') + '\n';
    fileSystem['/etc/passwd'].size = fileSystem['/etc/passwd'].content.length;
    fileSystem['/etc/passwd'].modified = new Date();

    // Supprimer de /etc/shadow
    const shadowLines = fileSystem['/etc/shadow'].content.split('\n')
        .filter(line => line && !line.startsWith(username + ':'));
    
    fileSystem['/etc/shadow'].content = shadowLines.join('\n') + '\n';
    fileSystem['/etc/shadow'].size = fileSystem['/etc/shadow'].content.length;
    fileSystem['/etc/shadow'].modified = new Date();

    // Supprimer des groupes
    const groups = parseGroupFile(fileSystem);
    groups.forEach(group => {
        const index = group.members.indexOf(username);
        if (index > -1) {
            group.members.splice(index, 1);
        }
    });

    const newGroupLines = groups.map(g => 
        `${g.name}:x:${g.gid}:${g.members.join(',')}`
    );
    
    fileSystem['/etc/group'].content = newGroupLines.join('\n') + '\n';
    fileSystem['/etc/group'].size = fileSystem['/etc/group'].content.length;
    fileSystem['/etc/group'].modified = new Date();

    // Supprimer le répertoire home si demandé
    if (removeHome && fileSystem[user.home]) {
        delete fileSystem[user.home];
    }

    saveFileSystem();
}