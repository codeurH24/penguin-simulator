// bin/rm.js - Commande rm (remove) avec support des permissions et wildcards
// Équivalent de /bin/rm sous Debian avec système de permissions complet

import { resolvePath } from '../modules/filesystem.js';
import { FileSystemService, PermissionDeniedError, FileNotFoundError } from '../modules/filesystem/index.js';

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
 * Vérifie si l'utilisateur peut supprimer un fichier/dossier
 * @param {string} fullPath - Chemin complet du fichier
 * @param {Object} fileSystemService - Service de filesystem
 * @param {boolean} isRecursive - Si c'est une suppression récursive
 * @returns {Object} - {allowed: boolean, reason?: string}
 */
function canDelete(fullPath, fileSystemService, isRecursive = false) {
    const user = fileSystemService.user;
    
    // Root peut toujours supprimer
    if (user && user.uid === 0) {
        return { allowed: true, reason: 'Root user' };
    }

    try {
        // Vérifier que le fichier existe et qu'on peut y accéder
        const fileEntry = fileSystemService.getFile(fullPath, 'read');
        
        // Pour supprimer un fichier/dossier, il faut permission d'écriture dans le répertoire parent
        const parentPath = fullPath.substring(0, fullPath.lastIndexOf('/')) || '/';
        const parentPermCheck = fileSystemService.permissionsSystem.hasPermission(
            parentPath, 
            user, 
            'write'
        );
        
        if (!parentPermCheck.allowed) {
            return { 
                allowed: false, 
                reason: `Permission denied: cannot write to parent directory '${parentPath}'` 
            };
        }

        // Pour suppression récursive d'un dossier, il faut aussi pouvoir le lire
        if (isRecursive && fileEntry.type === 'dir') {
            const readPermCheck = fileSystemService.permissionsSystem.hasPermission(
                fullPath, 
                user, 
                'read'
            );
            
            if (!readPermCheck.allowed) {
                return { 
                    allowed: false, 
                    reason: `Permission denied: cannot read directory '${fullPath}'` 
                };
            }
        }

        return { allowed: true };
        
    } catch (error) {
        if (error instanceof FileNotFoundError) {
            return { allowed: false, reason: 'File not found' };
        }
        if (error instanceof PermissionDeniedError) {
            return { allowed: false, reason: error.message };
        }
        return { allowed: false, reason: error.message };
    }
}

/**
 * Commande rm - Supprime des fichiers et dossiers avec support des wildcards et permissions
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, getCurrentPath, saveFileSystem)
 */
export function cmdRm(args, context) {
    const { fileSystem, getCurrentPath, saveFileSystem } = context;
    
    const term = context.terminal;
    // Utiliser les fonctions du contexte si disponibles, sinon celles par défaut
    const errorFn = context?.showError || (str => { term.write(`${str}\r\n`) });
    const successFn = context?.showSuccess || (str => { term.write(`${str}\r\n`) });
    
    // Créer une instance du FileSystemService pour les vérifications de permissions
    let fileSystemService = null;
    try {
        fileSystemService = new FileSystemService(context);
    } catch (error) {
        // Fallback vers l'ancien système si FileSystemService n'est pas disponible
        console.warn('FileSystemService not available, falling back to legacy mode');
    }
    
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
            if (!recursive) {
                errorFn(`rm: impossible de supprimer '${fileName}': est un répertoire`);
                return;
            }
        }

        // Vérifier les permissions si FileSystemService est disponible
        if (fileSystemService) {
            const permissionCheck = canDelete(fullPath, fileSystemService, recursive && item.type === 'dir');
            
            if (!permissionCheck.allowed) {
                if (!force) {
                    // Messages d'erreur en français pour cohérence avec les tests
                    if (permissionCheck.reason.includes('Permission denied')) {
                        errorFn(`rm: impossible de supprimer '${fileName}': Permission refusée`);
                    } else {
                        errorFn(`rm: impossible de supprimer '${fileName}': ${permissionCheck.reason}`);
                    }
                }
                // Avec -f, on ne fait rien (silencieux) mais on ne supprime pas
                return;
            }
        }

        // Procéder à la suppression
        if (item.type === 'dir' && recursive) {
            // Supprimer récursivement
            const toDelete = Object.keys(fileSystem).filter(path => {
                return path === fullPath || path.startsWith(fullPath + '/');
            });

            // Vérifier les permissions pour tous les sous-éléments si nécessaire
            if (fileSystemService) {
                let canDeleteAll = true;
                for (const subPath of toDelete) {
                    const subItem = fileSystem[subPath];
                    const subPermCheck = canDelete(subPath, fileSystemService, subItem.type === 'dir');
                    if (!subPermCheck.allowed) {
                        if (!force) {
                            const relativePath = subPath.replace(fullPath, fileName);
                            errorFn(`rm: impossible de supprimer '${relativePath}': Permission refusée`);
                        }
                        canDeleteAll = false;
                        break;
                    }
                }
                
                if (!canDeleteAll) {
                    return;
                }
            }

            // Supprimer tous les éléments
            toDelete.forEach(path => {
                delete fileSystem[path];
            });

            deletedCount++;
        } else if (item.type === 'file') {
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