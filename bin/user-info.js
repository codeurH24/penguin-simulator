// bin/user-info.js - Commandes d'information utilisateur
// Équivalents de whoami, id, groups sous Debian

import { getCurrentUser, parseGroupFile } from '../modules/users/user.service.js';
import { addLine, showError } from '../modules/terminal/terminal.js';

/**
 * Commande whoami - Affiche le nom de l'utilisateur courant
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte
 */
export function cmdWhoami(args, context) {
    const outputFn = context?.addLine || addLine;
    
    if (args.length > 0) {
        showError('whoami: trop d\'arguments');
        showError('Usage: whoami');
        return;
    }
    
    const currentUser = getCurrentUser();
    outputFn(currentUser.username);
}

/**
 * Commande id - Affiche les informations d'identité
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem)
 */
export function cmdId(args, context) {
    const { fileSystem } = context;
    const outputFn = context?.addLine || addLine;
    
    const currentUser = getCurrentUser();
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
 * Commande groups - Affiche les groupes d'un utilisateur
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem)
 */
export function cmdGroups(args, context) {
    const { fileSystem } = context;
    const outputFn = context?.addLine || addLine;
    
    const currentUser = getCurrentUser();
    const targetUsername = args.length > 0 ? args[0] : currentUser.username;
    
    if (args.length > 1) {
        showError('groups: trop d\'arguments');
        showError('Usage: groups [utilisateur]');
        return;
    }
    
    const groups = parseGroupFile(fileSystem);
    let userGroups;
    
    if (targetUsername === currentUser.username) {
        // Utilisateur courant
        userGroups = groups.filter(g => 
            g.gid === currentUser.gid || g.members.includes(currentUser.username)
        );
    } else {
        // Autre utilisateur - chercher dans /etc/passwd et /etc/group
        const passwdFile = fileSystem['/etc/passwd'];
        if (!passwdFile) {
            showError('groups: impossible de lire /etc/passwd');
            return;
        }
        
        const passwdLines = passwdFile.content.split('\n');
        const userLine = passwdLines.find(line => line.startsWith(targetUsername + ':'));
        
        if (!userLine) {
            showError(`groups: l'utilisateur '${targetUsername}' n'existe pas`);
            return;
        }
        
        const [, , , gid] = userLine.split(':');
        const userGid = parseInt(gid);
        
        userGroups = groups.filter(g => 
            g.gid === userGid || g.members.includes(targetUsername)
        );
    }
    
    if (userGroups.length === 0) {
        outputFn('aucun groupe');
    } else {
        const groupNames = userGroups.map(g => g.name).sort();
        outputFn(`${targetUsername} : ${groupNames.join(' ')}`);
    }
}

/**
 * Affiche tous les groupes (option -G de id)
 * @param {string} username - Nom d'utilisateur
 * @param {Object} fileSystem - Système de fichiers
 * @param {Function} outputFn - Fonction d'affichage
 * @param {boolean} namesOnly - Afficher seulement les noms
 */
function showAllGroups(username, fileSystem, outputFn, namesOnly) {
    const currentUser = getCurrentUser();
    const groups = parseGroupFile(fileSystem);
    
    const userGroups = groups.filter(g => 
        g.gid === currentUser.gid || g.members.includes(currentUser.username)
    );
    
    if (namesOnly) {
        const groupNames = userGroups.map(g => g.name).sort();
        outputFn(groupNames.join(' '));
    } else {
        const groupIds = userGroups.map(g => g.gid).sort((a, b) => a - b);
        outputFn(groupIds.join(' '));
    }
}