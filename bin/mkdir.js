// bin/mkdir.js - Commande mkdir (make directory) isolée
// Équivalent de /bin/mkdir sous Debian

import { resolvePath, getDirname } from '../modules/filesystem.js';
import { addLine, showError } from '../modules/terminal/terminal.js';

/**
 * Commande mkdir - Crée des répertoires
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, currentPath, saveFileSystem)
 */
export function cmdMkdir(args, context) {

    const { fileSystem, getCurrentPath, saveFileSystem } = context;
    const currentPath = getCurrentPath();
    
    const term = context.terminal;
    // Utiliser les fonctions du contexte si disponibles, sinon celles par défaut
    const errorFn = context?.showError || (str => { term.write(`${str}\r\n`) });
    const successFn = context?.showSuccess || (str => { term.write(`${str}\r\n`) });
    
    if (args.length === 0) {
        errorFn('mkdir: nom de dossier manquant');
        return;
    }

    // Gérer l'option -p
    let createParents = false;
    let dirArgs = [...args];

    if (args[0] === '-p') {
        createParents = true;
        dirArgs = args.slice(1);
    }

    if (dirArgs.length === 0) {
        errorFn('mkdir: nom de dossier manquant');
        return;
    }

    dirArgs.forEach(dirName => {
        const fullPath = resolvePath(dirName, currentPath);

        if (fileSystem[fullPath]) {
            if (!createParents) {
                errorFn(`mkdir: ${dirName}: Le dossier existe déjà`);
            }
        } else {
            // Créer les répertoires parents si nécessaire
            if (createParents) {
                const parts = fullPath.split('/').filter(p => p);
                let currentDir = '';

                for (const part of parts) {
                    currentDir = currentDir === '' ? '/' + part : currentDir + '/' + part;
                    if (!fileSystem[currentDir]) {
                        fileSystem[currentDir] = createDirectoryEntry();
                    }
                }
                successFn(`Dossier '${dirName}' créé (avec parents)`);
            } else {
                // Vérifier que le parent existe
                const parentPath = getDirname(fullPath);
                if (!fileSystem[parentPath]) {
                    errorFn(`mkdir: ${dirName}: Le répertoire parent n'existe pas`);
                    return;
                }
                fileSystem[fullPath] = createDirectoryEntry();
                successFn(`Dossier '${dirName}' créé`);
            }
            saveFileSystem();
        }
    });
}

/**
 * Crée une entrée de répertoire avec de vraies métadonnées
 * @returns {Object} - Objet répertoire avec métadonnées
 */
function createDirectoryEntry() {
    const now = new Date();
    return {
        type: 'dir',
        size: 4096, // Taille standard d'un dossier Unix
        created: now,
        modified: now,
        accessed: now,
        permissions: 'drwxr-xr-x',
        owner: 'root',
        group: 'root',
        links: 2 // . et ..
    };
}

/**
 * Crée une entrée de fichier avec de vraies métadonnées
 * @param {string} content - Contenu du fichier
 * @returns {Object} - Objet fichier avec métadonnées
 */
export function createFileEntry(content = '') {
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