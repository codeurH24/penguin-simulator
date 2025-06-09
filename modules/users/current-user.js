// modules/users/current-user.js
// Gestion de l'état utilisateur courant

import { parsePasswdFile, parseGroupFile } from './parsers.js';

// État global utilisateur courant
let currentUser = {
    username: 'root',
    uid: 0,
    gid: 0,
    home: '/root',
    shell: '/bin/bash',
    groups: ['root']
};

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