// modules/filesystem/index.js
// Point d'entrée principal pour le système de fichiers avec permissions

export { FileSystemService } from './FileSystemService.js';
export { PermissionsSystem } from './PermissionsSystem.js';
export { FileSystem } from './FileSystem.js';

// Export des exceptions
export { 
    FileSystemError,
    PermissionDeniedError, 
    FileNotFoundError, 
    FileExistsError, 
    TypeMismatchError,
    IsDirectoryError,
    NotDirectoryError
} from './FileSystemExceptions.js';

// Re-export des fonctions utilitaires existantes pour compatibilité
export { createFileEntry, createDirEntry } from '../users/file-utils.js';

/**
 * Fonction utilitaire pour créer une instance du service
 */
export function createFileSystemService(context) {
    return new FileSystemService(context);
}

/**
 * Fonction helper pour créer un fichier par défaut
 * @param {string} type - Type ('file' ou 'dir')
 * @param {Object} user - Utilisateur courant
 * @param {string} owner - Propriétaire (optionnel)
 * @param {string} group - Groupe (optionnel)
 * @returns {Object} - Entrée de fichier par défaut
 */
export function createDefaultFileEntry(type = 'file', user = null, owner = null, group = null) {
    const now = new Date();
    
    const defaultOwner = owner || (user ? user.username : 'root');
    const defaultGroup = group || (user && user.groups && user.groups[0]) || (user ? user.username : 'root');
    
    const baseEntry = {
        type: type,
        size: type === 'dir' ? 4096 : 0,
        content: type === 'file' ? '' : undefined,
        created: now,
        modified: now,
        accessed: now,
        owner: defaultOwner,
        group: defaultGroup,
        links: type === 'dir' ? 2 : 1
    };

    // Permissions par défaut selon le type
    if (type === 'dir') {
        baseEntry.permissions = 'drwxr-xr-x'; // 755 pour répertoires
    } else {
        baseEntry.permissions = '-rw-r--r--'; // 644 pour fichiers
    }

    return baseEntry;
}// modules/filesystem/index.js

