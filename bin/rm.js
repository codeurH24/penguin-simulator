// bin/rm.js - Commande rm (remove) isolée avec support des wildcards - Version améliorée
// Équivalent de /bin/rm sous Debian avec globbing

import { resolvePath } from '../modules/filesystem.js';
import { showError, showSuccess } from '../modules/terminal/terminal.js';

/**
 * Expanse un pattern en liste de fichiers matchants (globbing)
 * @param {string} pattern - Pattern avec wildcards (*.txt, dir*, etc.)
 * @param {string} currentPath - Repertoire courant
 * @param {Object} fileSystem - Systeme de fichiers
 * @returns {Array} - Liste des fichiers matchants
 */
function expandGlob(pattern, currentPath, fileSystem) {
    if (!pattern.includes('*') && !pattern.includes('?')) {
        return [pattern];
    }
    
    // Séparer le chemin du pattern
    const lastSlash = pattern.lastIndexOf('/');
    let dirPath = '';
    let filePattern = pattern;
    
    if (lastSlash !== -1) {
        dirPath = pattern.substring(0, lastSlash);
        filePattern = pattern.substring(lastSlash + 1);
    }
    
    // Résoudre le chemin du dossier
    const searchPath = dirPath ? resolvePath(dirPath, currentPath) : currentPath;
    
    // Créer regex
    const regexPattern = filePattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
    const regex = new RegExp('^' + regexPattern + '$');
    
    // Chercher les fichiers
    const matches = [];
    Object.keys(fileSystem).forEach(path => {
        const parent = path.substring(0, path.lastIndexOf('/')) || '/';
        if (parent === searchPath) {
            const name = path.substring(path.lastIndexOf('/') + 1);
            if (regex.test(name)) {
                matches.push(dirPath ? `${dirPath}/${name}` : name);
            }
        }
    });
    
    return matches.length > 0 ? matches : [pattern];
}

/**
 * Commande rm - Supprime des fichiers et dossiers avec support des wildcards
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, getCurrentPath, saveFileSystem)
 */
export function cmdRm(args, context) {
    const { fileSystem, getCurrentPath, saveFileSystem } = context;
    
    // Utiliser les fonctions du contexte si disponibles, sinon celles par défaut
    const errorFn = context?.showError || showError;
    const successFn = context?.showSuccess || showSuccess;
    
    // Obtenir le chemin courant via la méthode
    const currentPath = getCurrentPath();
    
    if (args.length === 0) {
        errorFn('rm: opérande manquant');
        errorFn('Essayez « rm --help » pour plus d\'informations.');
        return;
    }

    // Gérer les options
    let recursive = false;
    let force = false;
    let fileArgs = [...args];

    // Extraire les options
    fileArgs = fileArgs.filter(arg => {
        if (arg === '-r' || arg === '-R' || arg === '--recursive') {
            recursive = true;
            return false;
        } else if (arg === '-f' || arg === '--force') {
            force = true;
            return false;
        } else if (arg.startsWith('-')) {
            // Options combinées comme -rf, -fr
            if (arg.includes('r') || arg.includes('R')) recursive = true;
            if (arg.includes('f')) force = true;
            return false;
        }
        return true;
    });

    if (fileArgs.length === 0) {
        if (!force) {
            errorFn('rm: aucun fichier spécifié');
            return;
        }
        // Avec -f, ignorer silencieusement l'absence de fichiers
        return;
    }

    // Expander tous les patterns avec wildcards
    let allFiles = [];
    let hasWildcards = false;
    
    fileArgs.forEach(arg => {
        if (arg.includes('*') || arg.includes('?')) {
            hasWildcards = true;
        }
        const expandedFiles = expandGlob(arg, currentPath, fileSystem);
        allFiles = allFiles.concat(expandedFiles);
    });

    // Supprimer les doublons
    allFiles = [...new Set(allFiles)];

    let deletedCount = 0;
    let notFoundCount = 0;
    let hasPatternWithoutMatches = false;

    allFiles.forEach(fileName => {
        const fullPath = resolvePath(fileName, currentPath);

        if (!fileSystem[fullPath]) {
            notFoundCount++;
            
            // Vérifier si c'est un pattern qui n'a pas matché
            if (hasWildcards && fileArgs.some(arg => arg === fileName && (arg.includes('*') || arg.includes('?')))) {
                hasPatternWithoutMatches = true;
            } else if (!force) {
                errorFn(`rm: impossible de supprimer '${fileName}': Aucun fichier ou dossier de ce type`);
            }
            return;
        }

        const item = fileSystem[fullPath];

        // Vérifier si c'est un dossier
        if (item.type === 'dir') {
            // rm ne supprime JAMAIS les dossiers sans -r, même s'ils sont vides
            // (pour supprimer un dossier vide, il faut utiliser rmdir)
            if (!recursive) {
                errorFn(`rm: impossible de supprimer '${fileName}': est un répertoire`);
                return;
            }

            // Supprimer récursivement avec -r
            const toDelete = Object.keys(fileSystem).filter(path => {
                return path === fullPath || path.startsWith(fullPath + '/');
            });

            toDelete.forEach(path => {
                delete fileSystem[path];
            });

            deletedCount++;
        } else {
            // C'est un fichier
            delete fileSystem[fullPath];
            deletedCount++;
        }
    });

    // Gestion des erreurs pour les wildcards sans matches
    if (hasPatternWithoutMatches && !force) {
        const originalPatterns = fileArgs.filter(arg => arg.includes('*') || arg.includes('?'));
        originalPatterns.forEach(pattern => {
            // Vérifier si le pattern n'a vraiment aucun match
            const expandedForPattern = expandGlob(pattern, currentPath, fileSystem);
            if (expandedForPattern.length === 1 && expandedForPattern[0] === pattern) {
                errorFn(`rm: impossible de supprimer '${pattern}': Aucun fichier ou dossier de ce type`);
            }
        });
    }

    // Sauvegarder seulement si quelque chose a été supprimé
    if (deletedCount > 0) {
        saveFileSystem();
        
        // rm est normalement silencieux en cas de succès
        // Afficher un message seulement en mode debug si disponible
        if (context?.debug && deletedCount > 0) {
            if (deletedCount === 1) {
                successFn('1 élément supprimé');
            } else {
                successFn(`${deletedCount} éléments supprimés`);
            }
        }
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