// modules/users.js - Module de gestion des utilisateurs (DÉMARRAGE avec /etc/skel)
// Module pour l'authentification et la gestion des utilisateurs Linux
// ✨ CORRECTION: /etc/skel créé automatiquement au démarrage

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
 * Crée une entrée de répertoire avec métadonnées
 * @param {string} owner - Propriétaire
 * @param {string} group - Groupe
 * @param {string} permissions - Permissions
 * @returns {Object} - Objet répertoire avec métadonnées
 */
function createDirEntry(owner = 'root', group = 'root', permissions = 'drwxr-xr-x') {
    const now = new Date();
    return {
        type: 'dir',
        size: 4096,
        created: now,
        modified: now,
        accessed: now,
        permissions: permissions,
        owner: owner,
        group: group,
        links: 2
    };
}

/**
 * ✨ NOUVEAU: Initialise /etc/skel avec les fichiers de configuration par défaut Debian
 * @param {Object} fileSystem - Système de fichiers
 */
function initSkelDirectory(fileSystem) {
    const skelPath = '/etc/skel';
    
    // Créer le répertoire /etc/skel s'il n'existe pas
    if (!fileSystem[skelPath]) {
        fileSystem[skelPath] = createDirEntry('root', 'root', 'drwxr-xr-x');
        console.log('📁 Création de /etc/skel');
    }
    
    // Fichier .bashrc par défaut Debian
    if (!fileSystem[`${skelPath}/.bashrc`]) {
        const bashrcContent = `# ~/.bashrc: executed by bash(1) for non-login shells.
# see /usr/share/doc/bash/examples/startup-files (in the package bash-doc)
# for examples

# If not running interactively, don't do anything
case $- in
    *i*) ;;
      *) return;;
esac

# don't put duplicate lines or lines starting with space in the history.
# See bash(1) for more options
HISTCONTROL=ignoreboth

# append to the history file, don't overwrite it
shopt -s histappend

# for setting history length see HISTSIZE and HISTFILESIZE in bash(1)
HISTSIZE=1000
HISTFILESIZE=2000

# check the window size after each command and, if necessary,
# update the values of LINES and COLUMNS.
shopt -s checkwinsize

# If set, the pattern "**" used in a pathname expansion context will
# match all files and zero or more directories and subdirectories.
#shopt -s globstar

# make less more friendly for non-text input files, see lesspipe(1)
[ -x /usr/bin/lesspipe ] && eval "$(SHELL=/bin/sh lesspipe)"

# set variable identifying the chroot you work in (used in the prompt below)
if [ -z "\${debian_chroot:-}" ] && [ -r /etc/debian_chroot ]; then
    debian_chroot=\$(cat /etc/debian_chroot)
fi

# set a fancy prompt (non-color, unless we know we "want" color)
case "\$TERM" in
    xterm-color|*-256color) color_prompt=yes;;
esac

# uncomment for a colored prompt, if the terminal has the capability; turned
# off by default to not distract the user: the focus in a terminal window
# should be on the output of commands, not on the prompt
#force_color_prompt=yes

if [ -n "\$force_color_prompt" ]; then
    if [ -x /usr/bin/tput ] && tput setaf 1 >&/dev/null; then
	# We have color support; assume it's compliant with Ecma-48
	# (ISO/IEC-6429). (Lack of such support is extremely rare, and such
	# a case would tend to support setf rather than setaf.)
	color_prompt=yes
    else
	color_prompt=
    fi
fi

if [ "\$color_prompt" = yes ]; then
    PS1='\${debian_chroot:+(\$debian_chroot)}\\[\\033[01;32m\\]\\u@\\h\\[\\033[00m\\]:\\[\\033[01;34m\\]\\w\\[\\033[00m\\]\\$ '
else
    PS1='\${debian_chroot:+(\$debian_chroot)}\\u@\\h:\\w\\$ '
fi
unset color_prompt force_color_prompt

# If this is an xterm set the title to user@host:dir
case "\$TERM" in
xterm*|rxvt*)
    PS1="\\[\\e]0;\${debian_chroot:+(\$debian_chroot)}\\u@\\h: \\w\\a\\]\$PS1"
    ;;
*)
    ;;
esac

# enable color support of ls and also add handy aliases
if [ -x /usr/bin/dircolors ]; then
    test -r ~/.dircolors && eval "\$(dircolors -b ~/.dircolors)" || eval "\$(dircolors -b)"
    alias ls='ls --color=auto'
    #alias dir='dir --color=auto'
    #alias vdir='vdir --color=auto'

    alias grep='grep --color=auto'
    alias fgrep='fgrep --color=auto'
    alias egrep='egrep --color=auto'
fi

# colored GCC warnings and errors
#export GCC_COLORS='error=01;31:warning=01;35:note=01;36:caret=01;32:locus=01:quote=01'

# some more ls aliases
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'

# Add an "alert" alias for long running commands.  Use like so:
#   sleep 10; alert
alias alert='notify-send --urgency=low -i "\$([ $? = 0 ] && echo terminal || echo error)" "\$(history|tail -n1|sed -e '\''s/^\\s*[0-9]\\+\\s*//;s/[;&|]\\s*alert$//'\'')"'

# Alias definitions.
# You may want to put all your additions into a separate file like
# ~/.bash_aliases, instead of adding them here directly.
# See /usr/share/doc/bash-doc/examples in the bash-doc package.

if [ -f ~/.bash_aliases ]; then
    . ~/.bash_aliases
fi

# enable programmable completion features (you don't need to enable
# this, if it's already enabled in /etc/bash.bashrc and /etc/profile
# sources /etc/bash.bashrc).
if ! shopt -oq posix; then
  if [ -f /usr/share/bash-completion/bash_completion ]; then
    . /usr/share/bash-completion/bash_completion
  elif [ -f /etc/bash_completion ]; then
    . /etc/bash_completion
  fi
fi`;

        fileSystem[`${skelPath}/.bashrc`] = createFileEntry(bashrcContent);
        console.log('📝 Création de /etc/skel/.bashrc');
    }
    
    // Fichier .profile par défaut Debian
    if (!fileSystem[`${skelPath}/.profile`]) {
        const profileContent = `# ~/.profile: executed by the command interpreter for login shells.
# This file is not read by bash(1), if ~/.bash_profile or ~/.bash_login
# exists.
# see /usr/share/doc/bash/examples/startup-files for examples.
# the files are located in the bash-doc package.

# the default umask is set in /etc/profile; for setting the umask
# for ssh logins, install and configure the libpam-umask package.
#umask 022

# if running bash
if [ -n "\$BASH_VERSION" ]; then
    # include .bashrc if it exists
    if [ -f "\$HOME/.bashrc" ]; then
	. "\$HOME/.bashrc"
    fi
fi

# set PATH so it includes user's private bin if it exists
if [ -d "\$HOME/bin" ] ; then
    PATH="\$HOME/bin:\$PATH"
fi

# set PATH so it includes user's private bin if it exists
if [ -d "\$HOME/.local/bin" ] ; then
    PATH="\$HOME/.local/bin:\$PATH"
fi`;

        fileSystem[`${skelPath}/.profile`] = createFileEntry(profileContent);
        console.log('📝 Création de /etc/skel/.profile');
    }
    
    // Fichier .bash_logout par défaut Debian
    if (!fileSystem[`${skelPath}/.bash_logout`]) {
        const bashLogoutContent = `# ~/.bash_logout: executed by bash(1) when login shell exits.

# when leaving the console clear the screen to increase privacy

if [ "\$SHLVL" = 1 ]; then
    [ -x /usr/bin/clear_console ] && /usr/bin/clear_console -q
fi`;

        fileSystem[`${skelPath}/.bash_logout`] = createFileEntry(bashLogoutContent);
        console.log('📝 Création de /etc/skel/.bash_logout');
    }
    
    // Fichier .vimrc basique
    if (!fileSystem[`${skelPath}/.vimrc`]) {
        const vimrcContent = `" Configuration vim basique
syntax on
set number
set autoindent
set expandtab
set tabstop=4
set shiftwidth=4`;

        fileSystem[`${skelPath}/.vimrc`] = createFileEntry(vimrcContent);
        console.log('📝 Création de /etc/skel/.vimrc');
    }
    
    console.log('✅ /etc/skel initialisé avec les fichiers par défaut Debian');
}

/**
 * Copie récursivement le contenu de /etc/skel vers un répertoire de destination
 * @param {Object} fileSystem - Système de fichiers
 * @param {string} destPath - Répertoire de destination
 * @param {string} newOwner - Nouveau propriétaire des fichiers
 * @param {string} newGroup - Nouveau groupe des fichiers
 */
function copySkelFiles(fileSystem, destPath, newOwner, newGroup) {
    const skelPath = '/etc/skel';
    
    // Vérifier que /etc/skel existe
    if (!fileSystem[skelPath]) {
        console.warn('/etc/skel n\'existe pas, répertoire home créé vide');
        return;
    }
    
    let filesCount = 0;
    
    // Parcourir tous les fichiers et dossiers dans /etc/skel
    Object.keys(fileSystem).forEach(path => {
        if (path.startsWith(skelPath + '/')) {
            // Calculer le chemin relatif depuis /etc/skel
            const relativePath = path.substring(skelPath.length + 1);
            const destFilePath = `${destPath}/${relativePath}`;
            
            // Copier le fichier/dossier avec les nouvelles métadonnées
            const originalItem = fileSystem[path];
            fileSystem[destFilePath] = {
                ...originalItem,
                owner: newOwner,
                group: newGroup,
                created: new Date(),
                modified: new Date(),
                accessed: new Date()
            };
            
            filesCount++;
        }
    });
    
    console.log(`✅ ${filesCount} fichiers copiés depuis /etc/skel vers ${destPath}`);
}

/**
 * ✨ CORRECTION: Initialise les fichiers système pour la gestion des utilisateurs
 * APPELÉE AU DÉMARRAGE - Maintenant avec support /etc/skel
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
        console.log('📁 Création de /etc');
    }

    // ✨ NOUVEAU: Initialiser /etc/skel avec les fichiers par défaut Debian (PRIORITÉ)
    initSkelDirectory(fileSystem);

    // Créer /etc/passwd avec utilisateurs par défaut
    if (!fileSystem['/etc/passwd']) {
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
        console.log('📝 Création de /etc/passwd');
    }

    // Créer /etc/shadow avec mots de passe
    if (!fileSystem['/etc/shadow']) {
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
        console.log('📝 Création de /etc/shadow');
    }

    // Créer /etc/group
    if (!fileSystem['/etc/group']) {
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
        console.log('📝 Création de /etc/group');
    }

    // Créer /etc/sudoers
    if (!fileSystem['/etc/sudoers']) {
        const sudoersContent = `# sudoers file
#
# This file MUST be edited with the 'visudo' command as root.
#
# Please consider adding local content in /etc/sudoers.d/ instead of
# directly modifying this file.
#
# See the man page for details on how to write a sudoers file.
#
Defaults	env_reset
Defaults	mail_badpass
Defaults	secure_path="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

# Host alias specification

# User alias specification

# Cmnd alias specification

# User privilege specification
root	ALL=(ALL:ALL) ALL

# Members of the admin group may gain root privileges
%admin ALL=(ALL) ALL

# Allow members of group sudo to execute any command
%sudo	ALL=(ALL:ALL) ALL

# See sudoers(5) for more information on "#include" directives:
#includedir /etc/sudoers.d`;

        fileSystem['/etc/sudoers'] = createFileEntry(sudoersContent);
        fileSystem['/etc/sudoers'].permissions = '-r--r-----';
        fileSystem['/etc/sudoers'].owner = 'root';
        fileSystem['/etc/sudoers'].group = 'root';
        console.log('📝 Création de /etc/sudoers');
    }
    
    // Message de confirmation
    console.log('✅ Système d\'utilisateurs initialisé avec /etc/skel');
}

/**
 * Parse le fichier /etc/passwd
 * @param {Object} fileSystem - Système de fichiers
 * @returns {Array} - Liste des utilisateurs
 */
export function parsePasswdFile(fileSystem) {
    const passwdFile = fileSystem['/etc/passwd'];
    if (!passwdFile || !passwdFile.content) return [];
    
    return passwdFile.content.split('\n')
        .filter(line => line.trim())
        .map(line => {
            const [username, password, uid, gid, gecos, home, shell] = line.split(':');
            return {
                username,
                password,
                uid: parseInt(uid),
                gid: parseInt(gid),
                gecos: gecos || '',
                home,
                shell
            };
        });
}

/**
 * Parse le fichier /etc/group
 * @param {Object} fileSystem - Système de fichiers
 * @returns {Array} - Liste des groupes
 */
export function parseGroupFile(fileSystem) {
    const groupFile = fileSystem['/etc/group'];
    if (!groupFile || !groupFile.content) return [];
    
    return groupFile.content.split('\n')
        .filter(line => line.trim())
        .map(line => {
            const [name, password, gid, members] = line.split(':');
            return {
                name,
                password,
                gid: parseInt(gid),
                members: members ? members.split(',').filter(m => m) : []
            };
        });
}

/**
 * ✨ CORRIGÉ: Ajoute un utilisateur au système avec support /etc/skel
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

    // ✨ CORRECTION MAJEURE: Créer le répertoire home AVEC COPIE DE /etc/skel
    if (createHome && !fileSystem[newUser.home]) {
        // Créer le répertoire home avec les bonnes permissions
        fileSystem[newUser.home] = createDirEntry(newUser.username, newUser.username, 'drwxr-xr-x');
        
        // ✨ NOUVEAU: Copier les fichiers depuis /etc/skel (comportement Debian standard)
        copySkelFiles(fileSystem, newUser.home, newUser.username, newUser.username);
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
    if (!sudoersFile || !sudoersFile.content) return false;

    // Vérification basique - dans un vrai système ce serait plus complexe
    const content = sudoersFile.content;
    
    // Vérifier si l'utilisateur est explicitement dans sudoers
    if (content.includes(`${currentUser.username}\t`)) return true;
    
    // Vérifier si l'utilisateur fait partie d'un groupe autorisé
    return currentUser.groups.some(group => 
        content.includes(`%${group}`) && 
        (content.includes(`%${group}\tALL=`) || content.includes(`%${group} ALL=`))
    );
}

/**
 * Change le mot de passe d'un utilisateur
 * @param {string} username - Nom d'utilisateur
 * @param {string} newPassword - Nouveau mot de passe (hash)
 * @param {Object} fileSystem - Système de fichiers
 * @param {Function} saveFileSystem - Fonction de sauvegarde
 */
export function changePassword(username, newPassword, fileSystem, saveFileSystem) {
    const shadowFile = fileSystem['/etc/shadow'];
    if (!shadowFile || !shadowFile.content) {
        throw new Error('passwd: fichier /etc/shadow non trouvé');
    }

    const lines = shadowFile.content.split('\n');
    let userFound = false;

    // Créer le hash du nouveau mot de passe
    const passwordHash = newPassword ? `$6$rounds=656000$salt$${btoa(newPassword + 'salt')}` : '!';

    const newLines = lines.map(line => {
        if (line.startsWith(username + ':')) {
            userFound = true;
            const parts = line.split(':');
            parts[1] = passwordHash; // Remplacer le hash du mot de passe
            parts[2] = Math.floor(Date.now() / 86400000).toString(); // Dernière modification
            return parts.join(':');
        }
        return line;
    });

    if (!userFound) {
        throw new Error(`passwd: l'utilisateur '${username}' n'existe pas`);
    }

    fileSystem['/etc/shadow'].content = newLines.join('\n');
    fileSystem['/etc/shadow'].size = fileSystem['/etc/shadow'].content.length;
    fileSystem['/etc/shadow'].modified = new Date();
    
    saveFileSystem();
}

/**
 * Verrouille le compte d'un utilisateur en préfixant le hash avec !
 * @param {string} username - Nom d'utilisateur
 * @param {Object} fileSystem - Système de fichiers
 * @param {Function} saveFileSystem - Fonction de sauvegarde
 */
export function lockUserAccount(username, fileSystem, saveFileSystem) {
    const shadowFile = fileSystem['/etc/shadow'];
    if (!shadowFile || !shadowFile.content) {
        throw new Error('passwd: fichier /etc/shadow non trouvé');
    }

    const lines = shadowFile.content.split('\n');
    let userFound = false;

    const newLines = lines.map(line => {
        if (line.startsWith(username + ':')) {
            userFound = true;
            const parts = line.split(':');
            if (!parts[1].startsWith('!')) {
                parts[1] = '!' + parts[1]; // Préfixer avec ! pour verrouiller
            }
            return parts.join(':');
        }
        return line;
    });

    if (!userFound) {
        throw new Error(`passwd: l'utilisateur '${username}' n'existe pas`);
    }

    fileSystem['/etc/shadow'].content = newLines.join('\n');
    fileSystem['/etc/shadow'].size = fileSystem['/etc/shadow'].content.length;
    fileSystem['/etc/shadow'].modified = new Date();
    
    saveFileSystem();
}

/**
 * Déverrouille le compte d'un utilisateur en supprimant le ! préfixe
 * @param {string} username - Nom d'utilisateur
 * @param {Object} fileSystem - Système de fichiers
 * @param {Function} saveFileSystem - Fonction de sauvegarde
 */
export function unlockUserAccount(username, fileSystem, saveFileSystem) {
    const shadowFile = fileSystem['/etc/shadow'];
    if (!shadowFile || !shadowFile.content) {
        throw new Error('passwd: fichier /etc/shadow non trouvé');
    }

    const lines = shadowFile.content.split('\n');
    let userFound = false;

    const newLines = lines.map(line => {
        if (line.startsWith(username + ':')) {
            userFound = true;
            const parts = line.split(':');
            if (parts[1].startsWith('!')) {
                parts[1] = parts[1].substring(1); // Supprimer le ! préfixe
            }
            return parts.join(':');
        }
        return line;
    });

    if (!userFound) {
        throw new Error(`passwd: l'utilisateur '${username}' n'existe pas`);
    }

    fileSystem['/etc/shadow'].content = newLines.join('\n');
    fileSystem['/etc/shadow'].size = fileSystem['/etc/shadow'].content.length;
    fileSystem['/etc/shadow'].modified = new Date();
    
    saveFileSystem();
}

/**
 * Supprime le mot de passe d'un utilisateur (le rend vide)
 * @param {string} username - Nom d'utilisateur
 * @param {Object} fileSystem - Système de fichiers
 * @param {Function} saveFileSystem - Fonction de sauvegarde
 */
export function deleteUserPassword(username, fileSystem, saveFileSystem) {
    const shadowFile = fileSystem['/etc/shadow'];
    if (!shadowFile || !shadowFile.content) {
        throw new Error('passwd: fichier /etc/shadow non trouvé');
    }

    const lines = shadowFile.content.split('\n');
    let userFound = false;

    const newLines = lines.map(line => {
        if (line.startsWith(username + ':')) {
            userFound = true;
            const parts = line.split(':');
            parts[1] = ''; // Mot de passe vide
            parts[2] = Math.floor(Date.now() / 86400000).toString(); // Dernière modification
            return parts.join(':');
        }
        return line;
    });

    if (!userFound) {
        throw new Error(`passwd: l'utilisateur '${username}' n'existe pas`);
    }

    fileSystem['/etc/shadow'].content = newLines.join('\n');
    fileSystem['/etc/shadow'].size = fileSystem['/etc/shadow'].content.length;
    fileSystem['/etc/shadow'].modified = new Date();
    
    saveFileSystem();
}