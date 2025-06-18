// bin/sudo/permissions.js - Vérification des droits pour sudo
import { getUserGroupsFromContext } from './utils.js';

/**
 * Vérifie si l'utilisateur peut utiliser sudo
 * @param {Object} context - Contexte complet
 * @returns {boolean} - true si peut utiliser sudo
 */
export function canUseSudoWithContext(context) {
    const { fileSystem, currentUser } = context;
    
    if (!currentUser) return false;
    if (currentUser.uid === 0) return true; // root peut toujours sudo

    const sudoersFile = fileSystem['/etc/sudoers'];
    if (!sudoersFile || !sudoersFile.content) return false;

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
 * Affiche les privilèges sudo
 * @param {Object} context - Contexte complet
 * @param {Function} outputFn - Fonction d'affichage
 */
export function showSudoPrivileges(context, outputFn) {
    const { fileSystem, currentUser } = context;

    if (!currentUser) {
        outputFn('Aucun utilisateur connecté.');
        return;
    }

    const sudoersFile = fileSystem['/etc/sudoers'];
    if (!sudoersFile || !sudoersFile.content) {
        outputFn('User ' + currentUser.username + ' may not run sudo on this host.');
        return;
    }

    const content = sudoersFile.content;
    const hostname = context.variables?.HOSTNAME || 'bash';

    outputFn(`Matching Defaults entries for ${currentUser.username} on ${hostname}:`);
    outputFn('    env_reset, mail_badpass, secure_path=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin');
    outputFn('');

    // Vérifier les privilèges directs
    if (content.includes(`${currentUser.username}\t`)) {
        outputFn(`User ${currentUser.username} may run the following commands on ${hostname}:`);
        outputFn('    (ALL : ALL) ALL');
        return;
    }

    // Vérifier les privilèges de groupe
    const userGroups = currentUser.groups || [];
    const hasGroupPrivileges = userGroups.some(group => {
        return content.includes(`%${group}`) && 
               (content.includes(`%${group}\tALL=`) || content.includes(`%${group} ALL=`));
    });

    if (hasGroupPrivileges) {
        outputFn(`User ${currentUser.username} may run the following commands on ${hostname}:`);
        userGroups.forEach(group => {
            if (content.includes(`%${group}`) && 
                (content.includes(`%${group}\tALL=`) || content.includes(`%${group} ALL=`))) {
                outputFn(`    (ALL : ALL) ALL`);
            }
        });
    } else {
        outputFn(`User ${currentUser.username} may not run sudo on ${hostname}.`);
    }
}

/**
 * Vérifie si une commande spécifique est autorisée pour un utilisateur
 * @param {string} command - Commande à vérifier
 * @param {Object} context - Contexte complet
 * @returns {boolean} - true si la commande est autorisée
 */
export function isCommandAllowed(command, context) {
    // Pour l'instant, si l'utilisateur a le droit d'utiliser sudo,
    // il peut exécuter n'importe quelle commande
    return canUseSudoWithContext(context);
    
    // Note: Cette fonction pourrait être étendue pour vérifier
    // les commandes spécifiques autorisées dans le fichier sudoers
}