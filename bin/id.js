// bin/id.js - Commande id sous Debian
// Affiche les informations d'identité de l'utilisateur

import { parseGroupFile } from '../modules/users/user.service.js';

/**
 * Commande id - Affiche les informations d'identité de l'utilisateur
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, currentUser)
 */
export function cmdId(args, context) {
    const { fileSystem } = context;
    const term = context?.terminal;
    const outputFn = context?.addLine || ((str) => { term.write(`${str}\r\n`) });
    const showError = context?.showError || ((str) => { term.write(`${str}\r\n`) });
    
    // Utiliser context.currentUser au lieu de getCurrentUser()
    const currentUser = context.currentUser;
    if (!currentUser) {
        showError('id: aucun utilisateur connecté');
        return;
    }
    
    let targetUsername = currentUser.username;
    let showGroups = false;
    let showUser = false;
    let namesOnly = false;
    
    // Parser les options
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg === '-g' || arg === '--group') {
            showGroups = true;
        } else if (arg === '-u' || arg === '--user') {
            showUser = true;
        } else if (arg === '-n' || arg === '--name') {
            namesOnly = true;
        } else if (arg === '-G' || arg === '--groups') {
            showAllGroups(targetUsername, fileSystem, outputFn, namesOnly);
            return;
        } else if (arg.startsWith('-')) {
            showError(`id: option inconnue '${arg}'`);
            showError('Usage: id [options] [utilisateur]');
            showError('Options:');
            showError('  -g, --group    Afficher seulement le GID principal');
            showError('  -u, --user     Afficher seulement l\'UID');
            showError('  -n, --name     Afficher les noms au lieu des nombres');
            showError('  -G, --groups   Afficher tous les groupes');
            return;
        } else {
            targetUsername = arg;
        }
    }
    
    const groups = parseGroupFile(fileSystem);
    const primaryGroup = groups.find(g => g.gid === currentUser.gid);
    const allUserGroups = groups.filter(g => 
        g.gid === currentUser.gid || g.members.includes(currentUser.username)
    );
    
    if (showUser) {
        if (namesOnly) {
            outputFn(currentUser.username);
        } else {
            outputFn(currentUser.uid.toString());
        }
    } else if (showGroups) {
        if (namesOnly) {
            outputFn(primaryGroup ? primaryGroup.name : currentUser.gid.toString());
        } else {
            outputFn(currentUser.gid.toString());
        }
    } else {
        // Format complet par défaut
        const primaryGroupName = primaryGroup ? primaryGroup.name : currentUser.gid.toString();
        const groupsStr = allUserGroups.map(g => `${g.gid}(${g.name})`).join(',');
        
        outputFn(`uid=${currentUser.uid}(${currentUser.username}) gid=${currentUser.gid}(${primaryGroupName}) groups=${groupsStr}`);
    }
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
        outputFn('id: impossible de lire /etc/passwd');
        return;
    }
    
    const lines = passwdFile.content.split('\n');
    const userLine = lines.find(line => line.startsWith(username + ':'));
    if (!userLine) {
        outputFn(`id: '${username}': pas d'utilisateur de ce nom`);
        return;
    }
    
    const [, , uid, gid] = userLine.split(':');
    const userGid = parseInt(gid);
    
    // Trouver tous les groupes de l'utilisateur
    const userGroups = groups.filter(g => 
        g.gid === userGid || g.members.includes(username)
    );
    
    if (userGroups.length === 0) {
        outputFn(`id: aucun groupe trouvé pour '${username}'`);
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