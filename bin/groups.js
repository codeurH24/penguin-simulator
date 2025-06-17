// bin/user-info.js - Commandes d'information utilisateur (VERSION CORRIGÉE avec context)
// Équivalent de groups sous Debian

import { parseGroupFile } from '../modules/users/user.service.js';

/**
 * Commande groups - Affiche les groupes de l'utilisateur
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, currentUser)
 */
export function cmdGroups(args, context) {
    const { fileSystem } = context;
    const term = context?.terminal;
    const outputFn = context?.addLine || ((str) => { term.write(`${str}\r\n`) });
    const showError = context?.showError || ((str) => { term.write(`${str}\r\n`) });
    
    // Utiliser context.currentUser au lieu de getCurrentUser()
    const currentUser = context.currentUser;
    if (!currentUser) {
        showError('groups: aucun utilisateur connecté');
        return;
    }
    
    const targetUsername = args.length > 0 ? args[0] : currentUser.username;
    
    if (args.length > 1) {
        showError('groups: trop d\'arguments');
        showError('Usage: groups [utilisateur]');
        return;
    }
    
    showAllGroups(targetUsername, fileSystem, outputFn, true);
}

/**
 * Affiche tous les groupes d'un utilisateur
 * @param {string} username - Nom d'utilisateur
 * @param {Object} fileSystem - Système de fichiers
 * @param {Function} outputFn - Fonction d'affichage
 * @param {boolean} namesOnly - Afficher seulement les noms
 */
function showAllGroups(username, fileSystem, outputFn, namesOnly = false) {
    const groups = parseGroupFile(fileSystem);
    
    // Trouver l'utilisateur dans /etc/passwd pour obtenir son GID principal
    const passwdFile = fileSystem['/etc/passwd'];
    if (!passwdFile || passwdFile.type !== 'file') {
        outputFn('groups: impossible de lire /etc/passwd');
        return;
    }
    
    const lines = passwdFile.content.split('\n');
    const userLine = lines.find(line => line.startsWith(username + ':'));
    if (!userLine) {
        outputFn(`groups: '${username}': pas d'utilisateur de ce nom`);
        return;
    }
    
    const [, , uid, gid] = userLine.split(':');
    const userGid = parseInt(gid);
    
    // Trouver tous les groupes de l'utilisateur
    const userGroups = groups.filter(g => 
        g.gid === userGid || g.members.includes(username)
    );
    
    if (userGroups.length === 0) {
        outputFn(`groups: aucun groupe trouvé pour '${username}'`);
        return;
    }
    
    if (namesOnly) {
        const groupNames = userGroups.map(g => g.name).join(' ');
        outputFn(groupNames);
    } else {
        const groupsStr = userGroups.map(g => `${g.gid}(${g.name})`).join(' ');
        outputFn(groupsStr);
    }
}