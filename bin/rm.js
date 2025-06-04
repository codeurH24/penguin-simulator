// bin/rm.js - Commande rm (remove) isolée avec support des wildcards
// Équivalent de /bin/rm sous Debian avec globbing

import { resolvePath } from '../modules/filesystem.js';
import { showError, showSuccess } from '../modules/terminal.js';

/**
 * Expanse un pattern en liste de fichiers matchants (globbing)
 * @param {string} pattern - Pattern avec wildcards (*.txt, dir*, etc.)
 * @param {string} currentPath - Répertoire courant
 * @param {Object} fileSystem - Système de fichiers
 * @returns {Array} - Liste des fichiers matchants
 */
function expandGlob(pattern, currentPath, fileSystem) {
    // Si pas de wildcards, retourner le pattern tel quel
    if (!pattern.includes('*') && !pattern.includes('?')) {
        return [pattern];
    }
    
    // Résoudre le répertoire de base du pattern
    const patternPath = pattern.includes('/') ? pattern : currentPath + '/' + pattern;
    const basePath = patternPath.substring(0, patternPath.lastIndexOf('/')) || currentPath;
    const filePattern = patternPath.substring(patternPath.lastIndexOf('/') + 1);
    
    // Créer une regex à partir du pattern
    const regexPattern = filePattern
        .replace(/\./g, '\\.')    // Échapper les points
        .replace(/\*/g, '.*')     // * devient .*
        .replace(/\?/g, '.');     // ? devient .
    
    const regex = new RegExp('^' + regexPattern + '$');
    
    // Trouver tous les fichiers dans le répertoire de base
    const matchingFiles = [];
    
    Object.keys(fileSystem).forEach(path => {
        // Vérifier si le fichier est dans le bon répertoire
        const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
        if (parentPath === basePath || (basePath === currentPath && parentPath === '/')) {
            const fileName = path.substring(path.lastIndexOf('/') + 1);
            
            // Tester si le nom du fichier matche le pattern
            if (regex.test(fileName)) {
                // Retourner le chemin relatif ou absolu selon l'input
                if (pattern.startsWith('/')) {
                    matchingFiles.push(path);
                } else {
                    matchingFiles.push(fileName);
                }
            }
        }
    });
    
    return matchingFiles.length > 0 ? matchingFiles : [pattern]; // Si aucun match, retourner le pattern original
}

/**
 * Commande rm - Supprime des fichiers et dossiers avec support des wildcards
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

    // Expander tous les patterns avec wildcards
    let allFiles = [];
    fileArgs.forEach(arg => {
        const expandedFiles = expandGlob(arg, currentPath, fileSystem);
        allFiles = allFiles.concat(expandedFiles);
    });

    // Supprimer les doublons
    allFiles = [...new Set(allFiles)];

    let deletedCount = 0;
    let notFoundCount = 0;

    allFiles.forEach(fileName => {
        const fullPath = resolvePath(fileName, currentPath);

        if (!fileSystem[fullPath]) {
            notFoundCount++;
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

                deletedCount++;
            } else if (!hasContent) {
                // Dossier vide, on peut le supprimer
                delete fileSystem[fullPath];
                deletedCount++;
            }
        } else {
            // C'est un fichier
            delete fileSystem[fullPath];
            deletedCount++;
        }
    });

    // Afficher un résumé si des wildcards ont été utilisés
    if (fileArgs.some(arg => arg.includes('*') || arg.includes('?'))) {
        const totalRequested = allFiles.length;
        if (deletedCount > 0 && notFoundCount === 0) {
            // Succès complet
        } else if (deletedCount === 0 && notFoundCount > 0) {
            // Aucun fichier trouvé pour les patterns
            if (!force) {
                const originalPattern = fileArgs.find(arg => arg.includes('*') || arg.includes('?'));
                showError(`rm: ${originalPattern}: Aucun fichier ne correspond au motif`);
            }
        }
    }

    // Sauvegarder seulement si quelque chose a été supprimé
    if (deletedCount > 0) {
        saveFileSystem();
    }
}

/**
 * Teste si un nom de fichier correspond à un pattern
 * @param {string} filename - Nom du fichier
 * @param {string} pattern - Pattern avec wildcards
 * @returns {boolean} - true si le fichier correspond au pattern
 */
function matchesPattern(filename, pattern) {
    const regexPattern = pattern
        .replace(/\./g, '\\.')    // Échapper les points
        .replace(/\*/g, '.*')     // * devient .*
        .replace(/\?/g, '.');     // ? devient .
    
    const regex = new RegExp('^' + regexPattern + '$');
    return regex.test(filename);
}