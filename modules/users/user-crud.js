// modules/users/user-crud.js
// CRUD (Create, Read, Update, Delete) pour les utilisateurs

import { parsePasswdFile, parseGroupFile } from './parsers.js';
import { copySkelFiles } from './home-dirs.js';
import { createDirEntry } from './file-utils.js';

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