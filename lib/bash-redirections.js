// lib/bash-redirections.js - Gestion des redirections bash
// Module pour capturer et rediriger la sortie des commandes

import { resolvePath } from '../modules/filesystem.js';

/**
 * Exécute une commande avec redirection de sortie
 * @param {Function} commandExecutor - Fonction qui exécute la commande
 * @param {Object} redirections - Objet redirections {output, append, input}
 * @param {Object} context - Contexte d'exécution
 */
export function executeWithRedirection(commandExecutor, redirections, context) {
    if (!redirections.output && !redirections.append) {
        // Pas de redirection, exécution normale
        commandExecutor();
        return;
    }

    // Capturer la sortie
    let output = '';
    const originalAddLine = context.addLine;
    
    // Remplacer temporairement addLine pour capturer
    context.addLine = (text) => {
        console.log('text', JSON.stringify(text));
        output += text;
    };

    try {
        // Exécuter la commande
        commandExecutor();
        
        // Traiter la redirection
        handleOutputRedirection(output, redirections, context);
        
    } finally {
        // Restaurer l'addLine original
        context.addLine = originalAddLine;
    }
}

/**
 * Gère la redirection de sortie vers un fichier
 * @param {string} output - Contenu à écrire
 * @param {Object} redirections - Objet redirections
 * @param {Object} context - Contexte d'exécution
 */
function handleOutputRedirection(output, redirections, context) {
    const fileName = redirections.output || redirections.append;
    const filePath = resolvePath(fileName, context.getCurrentPath());
    
    if (redirections.output) {
        // Redirection > (écraser)
        createOrOverwriteFile(filePath, output, context);
    } else if (redirections.append) {
        // Redirection >> (ajouter)
        appendToFile(filePath, output, context);
    }
    
    // Sauvegarder le filesystem
    context.saveFileSystem();
}

/**
 * Crée ou écrase un fichier avec le contenu
 * @param {string} filePath - Chemin du fichier
 * @param {string} content - Contenu à écrire
 * @param {Object} context - Contexte d'exécution
 */
function createOrOverwriteFile(filePath, content, context) {
    context.fileSystem[filePath] = {
        type: 'file',
        size: content.length + 1, // +1 pour le \n
        content: content,
        created: new Date(),
        modified: new Date(),
        accessed: new Date(),
        permissions: '-rw-r--r--',
        owner: 'root',
        group: 'root',
        links: 1
    };
}

/**
 * Ajoute du contenu à un fichier existant ou le crée
 * @param {string} filePath - Chemin du fichier
 * @param {string} content - Contenu à ajouter
 * @param {Object} context - Contexte d'exécution
 */
function appendToFile(filePath, content, context) {
    
    if (!context.fileSystem[filePath]) {
        // Créer le fichier s'il n'existe pas
        createOrOverwriteFile(filePath, content, context);
        return;
    }
    
    const file = context.fileSystem[filePath];
    if (file.type !== 'file') {
        throw new Error(`bash: ${filePath}: N'est pas un fichier`);
    }
    
    file.content = (file.content || '') + content;
    file.size = file.content.length;
    file.modified = new Date();
}

/**
 * Vérifie si une redirection est présente
 * @param {Object} redirections - Objet redirections
 * @returns {boolean}
 */
export function hasRedirection(redirections) {
    return !!(redirections.output || redirections.append || redirections.input);
}