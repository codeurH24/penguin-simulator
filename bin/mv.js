// bin/mv.js - Commande mv modernisée avec FileSystemService
// Équivalent de /bin/mv sous Debian avec gestion des permissions

import { resolvePath, getBasename } from '../modules/filesystem.js';
import { 
    FileSystemService,
    PermissionDeniedError,
    FileNotFoundError,
    FileExistsError,
    IsDirectoryError
} from '../modules/filesystem/index.js';

/**
 * Commande mv - Déplace/renomme des fichiers et dossiers
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, currentPath, terminal, etc.)
 */
export function cmdMv(args, context) {
    const getCurrentPath = context.getCurrentPath;
    const currentPath = getCurrentPath();
    
    const term = context.terminal;
    const errorFn = context?.showError || (str => { 
        if (term) term.write(`${str}\r\n`) 
    });
    
    // Validation des arguments
    if (args.length < 2) {
        errorFn('mv: source et destination requises');
        errorFn('Usage: mv <source> <destination>');
        return;
    }
    
    // Initialiser le FileSystemService
    const fileSystemService = new FileSystemService(context);
    
    try {
        // Résoudre les chemins
        const sourcePath = resolvePath(args[0], currentPath);
        let destPath = resolvePath(args[1], currentPath);
        
        // Vérifier que le fichier source existe et que nous avons les permissions
        let sourceFile;
        try {
            // D'abord vérifier que le fichier existe
            if (!fileSystemService.context.fileSystem[sourcePath]) {
                errorFn(`mv: ${args[0]}: Fichier ou dossier introuvable`);
                return;
            }
            
            // Vérifier explicitement les permissions de lecture sur le source
            const readPermission = fileSystemService.permissionsSystem.hasPermission(
                sourcePath, 
                fileSystemService.user, 
                'read'
            );
            
            if (!readPermission.allowed) {
                errorFn(`mv: ${args[0]}: Permission refusée`);
                return;
            }
            
            sourceFile = fileSystemService.getFile(sourcePath, 'read');
        } catch (error) {
            if (error instanceof FileNotFoundError) {
                errorFn(`mv: ${args[0]}: Fichier ou dossier introuvable`);
                return;
            }
            if (error instanceof PermissionDeniedError) {
                errorFn(`mv: ${args[0]}: Permission refusée`);
                return;
            }
            throw error;
        }
        
        // Gérer le cas où la destination est un répertoire existant
        let destFile = null;
        try {
            destFile = fileSystemService.getFile(destPath, 'read');
            
            // Si la destination est un répertoire, déplacer DANS ce répertoire
            if (destFile.type === 'dir') {
                const sourceName = getBasename(sourcePath);
                destPath = destPath === '/' ? '/' + sourceName : destPath + '/' + sourceName;
                
                // Vérifier si le fichier final existe déjà dans le répertoire destination
                try {
                    const finalDestFile = fileSystemService.getFile(destPath, 'read');
                    // COMPORTEMENT DEBIAN: Écrasement silencieux, pas d'erreur
                    // Le fichier sera simplement écrasé
                } catch (error) {
                    // C'est normal si le fichier final n'existe pas
                    if (!(error instanceof FileNotFoundError)) {
                        throw error;
                    }
                }
            } else {
                // COMPORTEMENT DEBIAN: Si destination est un fichier existant, l'écraser silencieusement
                // Pas d'erreur, juste écrasement
            }
        } catch (error) {
            // C'est normal si la destination n'existe pas
            if (!(error instanceof FileNotFoundError)) {
                if (error instanceof PermissionDeniedError) {
                    errorFn(`mv: ${args[1]}: Permission refusée`);
                    return;
                }
                throw error;
            }
        }
        
        // Vérifier que source et destination ne sont pas identiques
        if (destPath === sourcePath) {
            errorFn(`mv: '${args[0]}' et '${args[1]}' sont le même fichier`);
            return;
        }
        
        // Effectuer le déplacement avec FileSystemService
        // Mais d'abord vérifier les permissions d'écriture sur les répertoires parent
        const sourceParentPath = fileSystemService._getParentPath(sourcePath);
        const destParentPath = fileSystemService._getParentPath(destPath);
        
        // Vérifier permission d'écriture sur le répertoire parent du source (pour suppression)
        const sourceParentWritePermission = fileSystemService.permissionsSystem.hasPermission(
            sourceParentPath, 
            fileSystemService.user, 
            'write'
        );
        
        if (!sourceParentWritePermission.allowed) {
            errorFn(`mv: impossible de déplacer '${args[0]}' vers '${args[1]}': Permission refusée`);
            return;
        }
        
        // Vérifier permission d'écriture sur le répertoire parent de destination (pour création)
        const destParentWritePermission = fileSystemService.permissionsSystem.hasPermission(
            destParentPath, 
            fileSystemService.user, 
            'write'
        );
        
        if (!destParentWritePermission.allowed) {
            errorFn(`mv: impossible de déplacer '${args[0]}' vers '${args[1]}': Permission refusée`);
            return;
        }
        
        moveFileOrDirectory(fileSystemService, sourcePath, destPath, sourceFile);
        
        // Sauvegarder les changements
        context.saveFileSystem();
        
    } catch (error) {
        if (error instanceof PermissionDeniedError) {
            errorFn(`mv: impossible de déplacer '${args[0]}' vers '${args[1]}': Permission refusée`);
        } else if (error instanceof FileNotFoundError) {
            errorFn(`mv: ${args[0]}: Fichier ou dossier introuvable`);
        } else {
            errorFn(`mv: ${error.message}`);
        }
    }
}

/**
 * Déplace un fichier ou répertoire en utilisant FileSystemService
 * @param {FileSystemService} fileSystemService - Service de fichiers
 * @param {string} sourcePath - Chemin source
 * @param {string} destPath - Chemin destination  
 * @param {Object} sourceFile - Fichier source
 */
function moveFileOrDirectory(fileSystemService, sourcePath, destPath, sourceFile) {
    // Préserver les métadonnées importantes du fichier source
    const fileEntry = {
        ...sourceFile,
        modified: new Date() // Seule la date de modification est mise à jour
    };
    
    // Si c'est un répertoire, collecter tous les enfants avant de les déplacer
    const childrenToMove = [];
    if (sourceFile.type === 'dir') {
        const sourcePrefix = sourcePath === '/' ? '/' : sourcePath + '/';
        const destPrefix = destPath === '/' ? '/' : destPath + '/';
        
        // Trouver tous les enfants du répertoire source
        Object.keys(fileSystemService.context.fileSystem).forEach(path => {
            if (path.startsWith(sourcePrefix) && path !== sourcePath) {
                const relativePath = path.substring(sourcePrefix.length);
                const newChildPath = destPrefix + relativePath;
                const childFile = fileSystemService.context.fileSystem[path];
                
                childrenToMove.push({
                    oldPath: path,
                    newPath: newChildPath,
                    fileEntry: childFile
                });
            }
        });
    }
    
    // Créer le nouveau fichier/répertoire à la destination
    fileSystemService.setFile(destPath, fileEntry);
    
    // Déplacer tous les enfants si c'est un répertoire
    childrenToMove.forEach(child => {
        fileSystemService.setFile(child.newPath, child.fileEntry);
    });
    
    // Supprimer l'ancien fichier/répertoire et ses enfants
    if (sourceFile.type === 'dir') {
        // Supprimer les enfants en premier (ordre inverse)
        childrenToMove.reverse().forEach(child => {
            fileSystemService.setFile(child.oldPath, null);
        });
    }
    
    // Supprimer le fichier/répertoire source
    fileSystemService.setFile(sourcePath, null);
}