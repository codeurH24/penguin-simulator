// bin/mv/permissions.js - Vérifications de permissions pour la commande mv

import { 
    FileSystemService,
    PermissionDeniedError,
    FileNotFoundError 
} from '../../modules/filesystem/index.js';
import { getDirname } from '../../modules/filesystem.js';

/**
 * Vérifie toutes les permissions nécessaires pour effectuer un déplacement mv
 * Cette fonction centralise toutes les vérifications de sécurité Unix requises
 * 
 * @param {string} sourcePath - Chemin absolu du fichier source
 * @param {string} destPath - Chemin absolu de la destination
 * @param {Object} context - Contexte d'exécution (fileSystem, currentUser, etc.)
 * @param {Function} errorFn - Fonction pour afficher les erreurs
 * @returns {Object} - {valid: boolean, sourceFile?: Object, destFile?: Object}
 */
export function checkMovePermissions(sourcePath, destPath, context, errorFn) {
    const fileSystemService = new FileSystemService(context);
    
    // ÉTAPE 1: Vérification de l'existence et permissions du fichier source
    const sourceCheck = checkSourcePermissions(sourcePath, fileSystemService, errorFn);
    if (!sourceCheck.valid) {
        return { valid: false };
    }

    // ÉTAPE 2: Vérification des permissions sur le répertoire parent du source
    // Pour supprimer un fichier, nous devons avoir les droits d'écriture sur son répertoire parent
    const sourceParentCheck = checkSourceParentPermissions(sourcePath, fileSystemService, errorFn);
    if (!sourceParentCheck.valid) {
        return { valid: false };
    }

    // ÉTAPE 3: Vérification des permissions de destination
    const destCheck = checkDestinationPermissions(destPath, fileSystemService, context, errorFn);
    if (!destCheck.valid) {
        return { valid: false };
    }

    return {
        valid: true,
        sourceFile: sourceCheck.file,
        destFile: destCheck.file
    };
}

/**
 * Vérifie les permissions sur le fichier source
 * En Unix, pour déplacer un fichier, nous devons pouvoir le lire
 * 
 * @param {string} sourcePath - Chemin du fichier source
 * @param {FileSystemService} fileSystemService - Service de système de fichiers
 * @param {Function} errorFn - Fonction d'erreur
 * @returns {Object} - {valid: boolean, file?: Object}
 */
function checkSourcePermissions(sourcePath, fileSystemService, errorFn) {
    try {
        // Tentative de lecture du fichier source
        // Cette opération vérifie automatiquement les permissions de lecture
        const sourceFile = fileSystemService.getFile(sourcePath, 'read');
        
        return {
            valid: true,
            file: sourceFile
        };
    } catch (error) {
        if (error instanceof FileNotFoundError) {
            // MESSAGE EXACT attendu par les tests
            errorFn(`mv: ${sourcePath.split('/').pop()}: Fichier ou dossier introuvable`);
        } else if (error instanceof PermissionDeniedError) {
            errorFn(`mv: ${sourcePath.split('/').pop()}: Permission refusée`);
        } else {
            errorFn(`mv: erreur lors de l'accès à '${sourcePath.split('/').pop()}': ${error.message}`);
        }
        return { valid: false };
    }
}

/**
 * Vérifie les permissions sur le répertoire parent du fichier source
 * Pour supprimer un fichier lors du déplacement, nous devons avoir les droits d'écriture
 * sur le répertoire qui le contient
 * 
 * @param {string} sourcePath - Chemin du fichier source
 * @param {FileSystemService} fileSystemService - Service de système de fichiers
 * @param {Function} errorFn - Fonction d'erreur
 * @returns {Object} - {valid: boolean}
 */
function checkSourceParentPermissions(sourcePath, fileSystemService, errorFn) {
    const sourceParentPath = getDirname(sourcePath);
    
    try {
        // Vérification des permissions d'écriture sur le répertoire parent
        // Cette permission est nécessaire pour supprimer le fichier de ce répertoire
        const writePermission = fileSystemService.permissionsSystem.hasPermission(
            sourceParentPath,
            fileSystemService.context.currentUser,
            'write'
        );
        
        if (!writePermission.allowed) {
            errorFn(`mv: impossible de supprimer '${sourcePath.split('/').pop()}': Permission refusée`);
            return { valid: false };
        }

        // Vérification des permissions de traversée (execute) sur le répertoire parent
        // Cette permission est nécessaire pour accéder aux fichiers dans le répertoire
        const executePermission = fileSystemService.permissionsSystem.hasPermission(
            sourceParentPath,
            fileSystemService.context.currentUser,
            'traverse'
        );
        
        if (!executePermission.allowed) {
            errorFn(`mv: impossible d'accéder au répertoire '${sourceParentPath}': Permission refusée`);
            return { valid: false };
        }

        return { valid: true };
    } catch (error) {
        errorFn(`mv: erreur lors de la vérification des permissions: ${error.message}`);
        return { valid: false };
    }
}

/**
 * Vérifie les permissions sur la destination
 * Cette fonction gère les cas complexes de destination (fichier existant, répertoire, etc.)
 * 
 * @param {string} destPath - Chemin de destination
 * @param {FileSystemService} fileSystemService - Service de système de fichiers
 * @param {Object} context - Contexte d'exécution
 * @param {Function} errorFn - Fonction d'erreur
 * @returns {Object} - {valid: boolean, file?: Object}
 */
function checkDestinationPermissions(destPath, fileSystemService, context, errorFn) {
    try {
        // Tentative de lecture de la destination pour voir si elle existe
        const destFile = fileSystemService.getFile(destPath, 'read');
        
        // CAS 1: La destination existe déjà
        if (destFile.type === 'dir') {
            // Si c'est un répertoire, nous devons vérifier si nous pouvons y écrire
            return checkDirectoryDestinationPermissions(destPath, fileSystemService, errorFn);
        } else {
            // Si c'est un fichier existant, nous allons l'écraser (comportement mv standard)
            // Nous devons vérifier les permissions d'écriture sur le répertoire parent
            return checkFileOverwritePermissions(destPath, fileSystemService, errorFn);
        }
    } catch (error) {
        if (error instanceof FileNotFoundError) {
            // CAS 2: La destination n'existe pas - nous devons créer un nouveau fichier
            return checkNewFileCreationPermissions(destPath, fileSystemService, errorFn);
        } else if (error instanceof PermissionDeniedError) {
            errorFn(`mv: impossible d'accéder à '${destPath.split('/').pop()}': Permission refusée`);
            return { valid: false };
        } else {
            errorFn(`mv: erreur lors de l'accès à la destination: ${error.message}`);
            return { valid: false };
        }
    }
}

/**
 * Vérifie les permissions pour une destination qui est un répertoire
 * 
 * @param {string} destPath - Chemin du répertoire de destination
 * @param {FileSystemService} fileSystemService - Service de système de fichiers
 * @param {Function} errorFn - Fonction d'erreur
 * @returns {Object} - {valid: boolean}
 */
function checkDirectoryDestinationPermissions(destPath, fileSystemService, errorFn) {
    try {
        // Pour écrire dans un répertoire, nous devons avoir les permissions d'écriture ET d'exécution
        const writePermission = fileSystemService.permissionsSystem.hasPermission(
            destPath,
            fileSystemService.context.currentUser,
            'write'
        );
        
        const executePermission = fileSystemService.permissionsSystem.hasPermission(
            destPath,
            fileSystemService.context.currentUser,
            'traverse'
        );
        
        if (!writePermission.allowed || !executePermission.allowed) {
            errorFn(`mv: impossible d'écrire dans le répertoire '${destPath.split('/').pop()}': Permission refusée`);
            return { valid: false };
        }

        return { valid: true };
    } catch (error) {
        errorFn(`mv: erreur lors de la vérification des permissions du répertoire: ${error.message}`);
        return { valid: false };
    }
}

/**
 * Vérifie les permissions pour écraser un fichier existant
 * 
 * @param {string} destPath - Chemin du fichier à écraser
 * @param {FileSystemService} fileSystemService - Service de système de fichiers
 * @param {Function} errorFn - Fonction d'erreur
 * @returns {Object} - {valid: boolean}
 */
function checkFileOverwritePermissions(destPath, fileSystemService, errorFn) {
    const destParentPath = getDirname(destPath);
    
    try {
        // Pour écraser un fichier, nous devons pouvoir écrire dans son répertoire parent
        const writePermission = fileSystemService.permissionsSystem.hasPermission(
            destParentPath,
            fileSystemService.context.currentUser,
            'write'
        );
        
        if (!writePermission.allowed) {
            errorFn(`mv: impossible d'écraser '${destPath.split('/').pop()}': Permission refusée`);
            return { valid: false };
        }

        return { valid: true };
    } catch (error) {
        errorFn(`mv: erreur lors de la vérification des permissions d'écrasement: ${error.message}`);
        return { valid: false };
    }
}

/**
 * Vérifie les permissions pour créer un nouveau fichier
 * 
 * @param {string} destPath - Chemin du nouveau fichier à créer
 * @param {FileSystemService} fileSystemService - Service de système de fichiers
 * @param {Function} errorFn - Fonction d'erreur
 * @returns {Object} - {valid: boolean}
 */
function checkNewFileCreationPermissions(destPath, fileSystemService, errorFn) {
    const destParentPath = getDirname(destPath);
    
    try {
        // Vérifier que le répertoire parent existe
        const parentDir = fileSystemService.getFile(destParentPath, 'read');
        if (parentDir.type !== 'dir') {
            errorFn(`mv: impossible de créer '${destPath.split('/').pop()}': le répertoire parent n'est pas un répertoire`);
            return { valid: false };
        }

        // Vérifier les permissions d'écriture sur le répertoire parent
        const writePermission = fileSystemService.permissionsSystem.hasPermission(
            destParentPath,
            fileSystemService.context.currentUser,
            'write'
        );
        
        if (!writePermission.allowed) {
            errorFn(`mv: impossible de créer '${destPath.split('/').pop()}': Permission refusée`);
            return { valid: false };
        }

        return { valid: true };
    } catch (error) {
        if (error instanceof FileNotFoundError) {
            errorFn(`mv: impossible de créer '${destPath.split('/').pop()}': le répertoire parent n'existe pas`);
        } else {
            errorFn(`mv: erreur lors de la création du fichier: ${error.message}`);
        }
        return { valid: false };
    }
}