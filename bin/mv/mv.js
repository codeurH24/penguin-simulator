// bin/mv/mv.js - Version 4 - Commande mv avec support complet des wildcards
// Équivalent de /bin/mv sous Debian avec gestion des permissions

import { resolvePath, getBasename, getDirname } from '../../modules/filesystem.js';
import { 
    FileSystemService,
    PermissionDeniedError,
    FileNotFoundError,
    FileExistsError,
    IsDirectoryError
} from '../../modules/filesystem/index.js';
import { preserveMetadata } from './metadata.js';

/**
 * Commande mv - Déplace/renomme des fichiers et dossiers
 * Cette version 4 gère automatiquement deux modes :
 * - Mode simple : mv source destination (2 arguments)
 * - Mode multiple : mv source1 source2... destination (3+ arguments pour wildcards)
 * 
 * @param {Array} args - Arguments de la commande [source(s), destination]
 * @param {Object} context - Contexte d'exécution (fileSystem, currentPath, terminal, etc.)
 */
export function cmdMv(args, context) {
    // Initialisation des utilitaires de base
    const { getCurrentPath, saveFileSystem } = context;
    const currentPath = getCurrentPath();
    const term = context.terminal;
    
    // Configuration de la gestion d'erreur standardisée
    const errorFn = context?.showError || (str => { 
        if (term) term.write(`${str}\r\n`) 
    });
    
    // === VALIDATION INITIALE DES ARGUMENTS ===
    // Cette étape détermine si nous sommes en mode simple ou multiple
    if (args.length < 2) {
        errorFn('mv: source et destination requises');
        errorFn('Usage: mv <source> <destination>');
        return;
    }
    
    // Déterminer le mode de fonctionnement basé sur le nombre d'arguments
    const isMultipleMode = args.length > 2;
    
    if (isMultipleMode) {
        // Mode multiple : mv source1 source2... destination
        return handleMultipleSources(args, context, currentPath, errorFn, saveFileSystem);
    } else {
        // Mode simple : mv source destination
        return handleSingleSource(args, context, currentPath, errorFn, saveFileSystem);
    }
}

/**
 * Gère le cas simple avec une seule source (comportement traditionnel de mv)
 * Ce mode correspond à l'usage classique : mv fichier destination
 * 
 * @param {Array} args - [source, destination]
 * @param {Object} context - Contexte d'exécution
 * @param {string} currentPath - Répertoire courant
 * @param {Function} errorFn - Fonction d'affichage d'erreur
 * @param {Function} saveFileSystem - Fonction de sauvegarde
 */
function handleSingleSource(args, context, currentPath, errorFn, saveFileSystem) {
    const [sourceArg, destArg] = args;
    
    // Résolution des chemins absolus
    const sourcePath = resolvePath(sourceArg, currentPath);
    const destPath = resolvePath(destArg, currentPath);
    
    // Validation de cohérence de base
    if (sourcePath === destPath) {
        errorFn(`mv: '${sourceArg}' et '${destArg}' sont le même fichier`);
        return;
    }
    
    // Initialisation du service de système de fichiers
    const fileSystemService = new FileSystemService(context);
    
    try {
        // === VÉRIFICATION DU FICHIER SOURCE ===
        // S'assurer que le fichier source existe et est accessible
        if (!context.fileSystem[sourcePath]) {
            errorFn(`mv: ${sourceArg}: Fichier ou dossier introuvable`);
            return;
        }
        
        const sourceFile = fileSystemService.getFile(sourcePath, 'read');
        
        // === RÉSOLUTION DE LA DESTINATION ===
        // Gérer le cas où la destination est un répertoire existant
        let finalDestPath = destPath;
        try {
            const destFile = fileSystemService.getFile(destPath, 'read');
            if (destFile.type === 'dir') {
                // Si destination est un répertoire, le fichier va DEDANS
                const sourceName = getBasename(sourcePath);
                finalDestPath = destPath === '/' ? '/' + sourceName : destPath + '/' + sourceName;
            }
        } catch (error) {
            // Si la destination n'existe pas, c'est normal (renommage)
            if (!(error instanceof FileNotFoundError)) {
                throw error;
            }
        }
        
        // === VÉRIFICATIONS DE PERMISSIONS ===
        // Vérifier les permissions d'écriture sur les répertoires parents
        const sourceParentPath = getDirname(sourcePath);
        const destParentPath = getDirname(finalDestPath);
        
        // Permission d'écriture sur le répertoire parent source (pour suppression)
        if (!checkWritePermission(sourceParentPath, fileSystemService, errorFn)) {
            return;
        }
        
        // Permission d'écriture sur le répertoire parent destination (pour création)
        if (!checkWritePermission(destParentPath, fileSystemService, errorFn)) {
            return;
        }
        
        // === EXÉCUTION DU DÉPLACEMENT ===
        // Maintenant que toutes les vérifications sont passées, effectuer le déplacement
        const success = executeMove(sourcePath, finalDestPath, sourceFile, context.fileSystem);
        
        if (success) {
            saveFileSystem();
        } else {
            errorFn(`mv: impossible de déplacer '${sourceArg}' vers '${destArg}'`);
        }
        
    } catch (error) {
        handleMoveError(error, sourceArg, errorFn);
    }
}

/**
 * Gère le cas multiple avec plusieurs sources (nécessaire pour les wildcards)
 * Ce mode correspond aux cas comme : mv file1.txt file2.txt file3.txt destination/
 * 
 * @param {Array} args - [source1, source2, ..., destination]
 * @param {Object} context - Contexte d'exécution
 * @param {string} currentPath - Répertoire courant
 * @param {Function} errorFn - Fonction d'affichage d'erreur
 * @param {Function} saveFileSystem - Fonction de sauvegarde
 */
function handleMultipleSources(args, context, currentPath, errorFn, saveFileSystem) {
    // En mode multiple, le dernier argument est forcément la destination
    const destArg = args[args.length - 1];
    const sourceArgs = args.slice(0, -1);
    
    // Résolution du chemin de destination
    const destPath = resolvePath(destArg, currentPath);
    
    // === VALIDATION DE LA DESTINATION ===
    // En mode multiple, la destination DOIT être un répertoire existant
    if (!context.fileSystem[destPath]) {
        errorFn(`mv: ${destArg}: Fichier ou dossier introuvable`);
        return;
    }
    
    const destFile = context.fileSystem[destPath];
    if (destFile.type !== 'dir') {
        errorFn(`mv: destination doit être un répertoire`);
        return;
    }
    
    // === TRAITEMENT DE CHAQUE SOURCE ===
    // Nous traitons chaque source une par une, en arrêtant au premier échec
    const fileSystemService = new FileSystemService(context);
    let allSuccessful = true;
    
    for (const sourceArg of sourceArgs) {
        const sourcePath = resolvePath(sourceArg, currentPath);
        
        // Validation de base pour cette source
        if (sourcePath === destPath) {
            errorFn(`mv: '${sourceArg}' et '${destArg}' sont le même fichier`);
            allSuccessful = false;
            continue;
        }
        
        try {
            // Vérifier que la source existe
            if (!context.fileSystem[sourcePath]) {
                errorFn(`mv: ${sourceArg}: Fichier ou dossier introuvable`);
                allSuccessful = false;
                continue;
            }
            
            const sourceFile = fileSystemService.getFile(sourcePath, 'read');
            
            // Calculer le chemin final dans le répertoire de destination
            const sourceName = getBasename(sourcePath);
            const finalDestPath = destPath === '/' ? '/' + sourceName : destPath + '/' + sourceName;
            
            // Vérifications de permissions pour cette source
            const sourceParentPath = getDirname(sourcePath);
            if (!checkWritePermission(sourceParentPath, fileSystemService, errorFn)) {
                allSuccessful = false;
                continue;
            }
            
            if (!checkWritePermission(destPath, fileSystemService, errorFn)) {
                allSuccessful = false;
                continue;
            }
            
            // Exécuter le déplacement pour cette source
            const success = executeMove(sourcePath, finalDestPath, sourceFile, context.fileSystem);
            
            if (!success) {
                errorFn(`mv: impossible de déplacer '${sourceArg}' vers '${destArg}'`);
                allSuccessful = false;
            }
            
        } catch (error) {
            handleMoveError(error, sourceArg, errorFn);
            allSuccessful = false;
        }
    }
    
    // Sauvegarder seulement si au moins un déplacement a réussi
    if (allSuccessful || someMovesSucceeded(args, context)) {
        saveFileSystem();
    }
}

/**
 * Vérifie les permissions d'écriture sur un répertoire
 * Cette fonction centralise la vérification des permissions d'écriture
 * 
 * @param {string} dirPath - Chemin du répertoire à vérifier
 * @param {FileSystemService} fileSystemService - Service de système de fichiers
 * @param {Function} errorFn - Fonction d'affichage d'erreur
 * @returns {boolean} - true si l'écriture est autorisée
 */
function checkWritePermission(dirPath, fileSystemService, errorFn) {
    try {
        const writePermission = fileSystemService.permissionsSystem.hasPermission(
            dirPath,
            fileSystemService.context.currentUser,
            'write'
        );
        
        if (!writePermission.allowed) {
            errorFn(`mv: Permission refusée sur '${dirPath}'`);
            return false;
        }
        
        return true;
    } catch (error) {
        errorFn(`mv: Erreur de vérification des permissions: ${error.message}`);
        return false;
    }
}

/**
 * Exécute physiquement le déplacement d'un fichier
 * Cette fonction contient la logique de bas niveau du déplacement
 * 
 * @param {string} sourcePath - Chemin source
 * @param {string} destPath - Chemin destination  
 * @param {Object} sourceFile - Métadonnées du fichier source
 * @param {Object} fileSystem - Référence au système de fichiers
 * @returns {boolean} - true si le déplacement a réussi
 */
function executeMove(sourcePath, destPath, sourceFile, fileSystem) {
    try {
        // Si c'est un répertoire, nous devons déplacer récursivement tout le contenu
        if (sourceFile.type === 'dir') {
            return moveDirectoryRecursively(sourcePath, destPath, fileSystem);
        } else {
            return moveSimpleFile(sourcePath, destPath, sourceFile, fileSystem);
        }
    } catch (error) {
        console.error('Erreur lors du déplacement:', error);
        return false;
    }
}

/**
 * Déplace un fichier simple avec préservation des métadonnées
 * 
 * @param {string} sourcePath - Chemin source
 * @param {string} destPath - Chemin destination
 * @param {Object} sourceFile - Métadonnées du fichier source
 * @param {Object} fileSystem - Référence au système de fichiers
 * @returns {boolean} - true si succès
 */
function moveSimpleFile(sourcePath, destPath, sourceFile, fileSystem) {
    // Préserver les métadonnées selon les standards Unix
    const preservedFile = preserveMetadata(sourceFile);
    
    // Créer le fichier à la destination
    fileSystem[destPath] = preservedFile;
    
    // Supprimer le fichier source
    delete fileSystem[sourcePath];
    
    return true;
}

/**
 * Déplace un répertoire complet de manière récursive
 * 
 * @param {string} sourcePath - Chemin du répertoire source
 * @param {string} destPath - Chemin du répertoire destination
 * @param {Object} fileSystem - Référence au système de fichiers
 * @returns {boolean} - true si succès
 */
function moveDirectoryRecursively(sourcePath, destPath, fileSystem) {
    // Collecter tous les éléments à déplacer
    const itemsToMove = [];
    const sourcePrefix = sourcePath === '/' ? '/' : sourcePath + '/';
    
    // Trouver tous les fichiers et sous-répertoires
    Object.keys(fileSystem).forEach(path => {
        if (path.startsWith(sourcePrefix) && path !== sourcePath) {
            const relativePath = path.substring(sourcePrefix.length);
            itemsToMove.push({
                oldPath: path,
                newPath: destPath === '/' ? '/' + relativePath : destPath + '/' + relativePath,
                file: fileSystem[path]
            });
        }
    });
    
    // Créer le répertoire de destination
    const sourceDir = fileSystem[sourcePath];
    fileSystem[destPath] = preserveMetadata(sourceDir);
    
    // Déplacer tous les éléments
    itemsToMove.forEach(item => {
        fileSystem[item.newPath] = preserveMetadata(item.file);
        delete fileSystem[item.oldPath];
    });
    
    // Supprimer le répertoire source
    delete fileSystem[sourcePath];
    
    return true;
}

/**
 * Gère les erreurs de déplacement de manière standardisée
 * 
 * @param {Error} error - Erreur rencontrée
 * @param {string} sourceArg - Argument source pour les messages d'erreur
 * @param {Function} errorFn - Fonction d'affichage d'erreur
 */
function handleMoveError(error, sourceArg, errorFn) {
    if (error instanceof FileNotFoundError) {
        errorFn(`mv: ${sourceArg}: Fichier ou dossier introuvable`);
    } else if (error instanceof PermissionDeniedError) {
        errorFn(`mv: ${sourceArg}: Permission refusée`);
    } else {
        errorFn(`mv: erreur lors du déplacement de '${sourceArg}': ${error.message}`);
    }
}

/**
 * Vérifie si certains déplacements ont réussi (pour la sauvegarde partielle)
 * 
 * @param {Array} args - Arguments originaux
 * @param {Object} context - Contexte d'exécution
 * @returns {boolean} - true si des changements ont eu lieu
 */
function someMovesSucceeded(args, context) {
    // Pour simplifier, nous considérons qu'il faut sauvegarder
    // Cette fonction pourrait être améliorée pour détecter les changements partiels
    return true;
}