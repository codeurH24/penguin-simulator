// bin/mkdir/mkdir.js - Commande mkdir (make directory) avec vérifications de permissions
// Équivalent de /bin/mkdir sous Debian

import { validateArguments } from './validation.js';
import { createDirectories } from './creation.js';

/**
 * Commande mkdir - Crée des répertoires avec vérifications de permissions
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, currentPath, saveFileSystem, currentUser)
 */
export function cmdMkdir(args, context) {
    const { fileSystem, getCurrentPath, saveFileSystem } = context;
    const currentPath = getCurrentPath();
    
    const term = context.terminal;
    const errorFn = context?.showError || (str => { term.write(`${str}\r\n`) });
    
    // Validation des arguments
    const validation = validateArguments(args, errorFn);
    if (!validation.valid) {
        return;
    }
    
    const { createParents, dirArgs } = validation;
    
    // Vérifier l'utilisateur actuel
    const user = context.currentUser;
    if (!user) {
        errorFn('mkdir: impossible de déterminer l\'utilisateur actuel');
        return;
    }
    
    // Créer les répertoires
    createDirectories(dirArgs, {
        context,
        currentPath,
        user,
        createParents,
        errorFn,
        saveFileSystem
    });
}