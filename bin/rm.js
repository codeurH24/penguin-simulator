// bin/rm.js - Commande rm (remove) isolée
// Équivalent de /bin/rm sous Debian

import { resolvePath } from '../modules/filesystem.js';
import { showError, showSuccess } from '../modules/terminal.js';

/**
 * Commande rm - Supprime des fichiers et dossiers
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, currentPath, saveFileSystem)
 */
export function cmdRm(args, context) {
    const { fileSystem, currentPath, saveFileSystem } = context;
    
    if (args.length === 0) {
        showError('rm: opérande manquant');
        showError('Usage: rm [-r] [-f] <fichiers...>');
        return;
    }

    // Gérer les options
    let recursive = false;
    let force = false;
    let fileArgs = [...args];

    // Extraire les options
    fileArgs = fileArgs.filter(arg => {
        if (arg === '-r' || arg === '-R') {
            recursive = true;
            return false;
        } else if (arg === '-f') {
            force = true;
            return false;
        } else if (arg.startsWith('-')) {
            // Options combinées comme -rf
            if (arg.includes('r') || arg.includes('R')) recursive = true;
            if (arg.includes('f')) force = true;
            return false;
        }
        return true;
    });

    if (fileArgs.length === 0) {
        showError('rm: aucun fichier spécifié');
        return;
    }

    fileArgs.forEach(fileName => {
        const fullPath = resolvePath(fileName, currentPath);

        if (!fileSystem[fullPath]) {
            if (!force) {
                showError(`rm: ${fileName}: Fichier ou dossier introuvable`);
            }
            return;
        }

        const item = fileSystem[fullPath];

        // Vérifier si c'est un dossier
        if (item.type === 'dir') {
            // Vérifier si le dossier a du contenu
            const hasContent = Object.keys(fileSystem).some(path => {
                const prefix = fullPath === '/' ? '/' : fullPath + '/';
                return path.startsWith(prefix) && path !== fullPath;
            });

            if (hasContent && !recursive) {
                showError(`rm: ${fileName}: est un répertoire`);
                return;
            }

            // Supprimer récursivement si -r
            if (recursive) {
                const toDelete = Object.keys(fileSystem).filter(path => {
                    return path === fullPath || path.startsWith(fullPath + '/');
                });

                toDelete.forEach(path => {
                    delete fileSystem[path];
                });

                showSuccess(`Dossier '${fileName}' supprimé (récursif)`);
            } else if (!hasContent) {
                // Dossier vide, on peut le supprimer
                delete fileSystem[fullPath];
                showSuccess(`Dossier vide '${fileName}' supprimé`);
            }
        } else {
            // C'est un fichier
            delete fileSystem[fullPath];
            showSuccess(`Fichier '${fileName}' supprimé`);
        }

        saveFileSystem();
    });
}