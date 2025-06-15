// modules/filesystem/FileSystem.js
// Gestion des opérations sur les fichiers et répertoires

import { 
    PermissionDeniedError, 
    FileNotFoundError, 
    IsDirectoryError,
    NotDirectoryError
} from './FileSystemExceptions.js';

/**
 * Classe pour la gestion des fichiers et répertoires
 */
export class FileSystem {
    constructor(fileSystemService) {
        this.fileSystemService = fileSystemService;
    }

    /**
     * Définit le contenu d'un fichier
     * @param {string} fileSystemPath - Chemin du fichier
     * @param {string} content - Nouveau contenu
     * @throws {FileNotFoundError} - Si le fichier n'existe pas
     * @throws {IsDirectoryError} - Si le chemin est un répertoire
     * @throws {PermissionDeniedError} - Si permissions insuffisantes
     */
    setContent(fileSystemPath, content) {
        const normalizedPath = this.fileSystemService._normalizePath(fileSystemPath);
        const fileEntry = this.fileSystemService.context.fileSystem[normalizedPath];
        
        if (!fileEntry) {
            throw new FileNotFoundError(fileSystemPath);
        }

        if (fileEntry.type !== 'file') {
            throw new IsDirectoryError(fileSystemPath);
        }

        // Vérifier les permissions d'écriture
        const writeCheck = this.fileSystemService.permissionsSystem.hasPermission(
            normalizedPath, 
            this.fileSystemService.user, 
            'write'
        );

        if (!writeCheck.allowed) {
            throw new PermissionDeniedError(fileSystemPath, 'write');
        }

        // Mettre à jour le contenu
        fileEntry.content = content;
        fileEntry.size = content.length;
        fileEntry.modified = new Date();
        fileEntry.accessed = new Date();
    }

    /**
     * Obtient le contenu d'un fichier
     * @param {string} fileSystemPath - Chemin du fichier
     * @returns {string} - Contenu du fichier
     * @throws {FileNotFoundError} - Si le fichier n'existe pas
     * @throws {IsDirectoryError} - Si le chemin est un répertoire
     * @throws {PermissionDeniedError} - Si permissions insuffisantes
     */
    getContent(fileSystemPath) {
        const result = this.fileSystemService.getFile(fileSystemPath, 'read');

        if (result.type !== 'file') {
            throw new IsDirectoryError(fileSystemPath);
        }

        // Mettre à jour la date d'accès
        result.accessed = new Date();
        
        return result.content || '';
    }

    /**
     * Définit les permissions d'un fichier/répertoire
     * @param {string} fileSystemPath - Chemin du fichier
     * @param {string|number} permissions - Permissions (755, "drwxr-xr-x", etc.)
     * @throws {FileNotFoundError} - Si le fichier n'existe pas
     * @throws {PermissionDeniedError} - Si permissions insuffisantes
     * @throws {Error} - Si format de permissions invalide
     */
    setPermissions(fileSystemPath, permissions = 755) {
        let permString;

        if (typeof permissions === 'number') {
            // Convertir les permissions octales en chaîne
            permString = this._octalToPermissionString(permissions, fileSystemPath);
        } else if (typeof permissions === 'string') {
            permString = permissions;
        } else {
            throw new Error(`Invalid permission format: '${permissions}'`);
        }

        const result = this.fileSystemService.permissionsSystem.setPermissions(
            fileSystemPath, 
            permString, 
            this.fileSystemService.user
        );

        if (result !== true) {
            // setPermissions retourne encore un string d'erreur, on le convertit en exception
            if (result.includes('No such file')) {
                throw new FileNotFoundError(fileSystemPath);
            } else if (result.includes('Operation not permitted')) {
                throw new PermissionDeniedError(fileSystemPath, 'chmod');
            } else {
                throw new Error(result);
            }
        }
    }

    /**
     * Obtient les permissions d'un fichier/répertoire
     * @param {string} fileSystemPath - Chemin du fichier
     * @returns {string} - Chaîne de permissions
     * @throws {FileNotFoundError} - Si le fichier n'existe pas
     */
    getPermissions(fileSystemPath) {
        const result = this.fileSystemService.permissionsSystem.getPermissions(fileSystemPath);
        if (!result) {
            throw new FileNotFoundError(fileSystemPath);
        }
        return result;
    }

    /**
     * Définit la date de création
     * @param {string} fileSystemPath - Chemin du fichier
     * @param {Date} date - Nouvelle date
     * @throws {FileNotFoundError} - Si le fichier n'existe pas
     */
    setDateCreate(fileSystemPath, date) {
        const normalizedPath = this.fileSystemService._normalizePath(fileSystemPath);
        const fileEntry = this.fileSystemService.context.fileSystem[normalizedPath];
        
        if (!fileEntry) {
            throw new FileNotFoundError(fileSystemPath);
        }

        fileEntry.created = date;
    }

    /**
     * Obtient la date de création
     * @param {string} fileSystemPath - Chemin du fichier
     * @returns {Date} - Date de création
     * @throws {FileNotFoundError} - Si le fichier n'existe pas
     */
    getDateCreate(fileSystemPath) {
        const result = this.fileSystemService.getFile(fileSystemPath, 'read');
        return result.created;
    }

    /**
     * Met à jour la date de création à maintenant
     * @param {string} fileSystemPath - Chemin du fichier
     * @throws {FileNotFoundError} - Si le fichier n'existe pas
     */
    refreshDateCreate(fileSystemPath) {
        this.setDateCreate(fileSystemPath, new Date());
    }

    /**
     * Définit la date d'accès
     * @param {string} fileSystemPath - Chemin du fichier
     * @param {Date} date - Nouvelle date
     * @throws {FileNotFoundError} - Si le fichier n'existe pas
     */
    setDateAccess(fileSystemPath, date) {
        const normalizedPath = this.fileSystemService._normalizePath(fileSystemPath);
        const fileEntry = this.fileSystemService.context.fileSystem[normalizedPath];
        
        if (!fileEntry) {
            throw new FileNotFoundError(fileSystemPath);
        }

        fileEntry.accessed = date;
    }

    /**
     * Obtient la date d'accès
     * @param {string} fileSystemPath - Chemin du fichier
     * @returns {Date} - Date d'accès
     * @throws {FileNotFoundError} - Si le fichier n'existe pas
     */
    getDateAccess(fileSystemPath) {
        const result = this.fileSystemService.getFile(fileSystemPath, 'read');
        return result.accessed;
    }

    /**
     * Met à jour la date d'accès à maintenant
     * @param {string} fileSystemPath - Chemin du fichier
     * @throws {FileNotFoundError} - Si le fichier n'existe pas
     */
    refreshDateAccess(fileSystemPath) {
        this.setDateAccess(fileSystemPath, new Date());
    }

    /**
     * Définit le type comme répertoire
     * @param {string} fileSystemPath - Chemin du fichier
     * @throws {FileNotFoundError} - Si le fichier n'existe pas
     */
    setTypeDir(fileSystemPath) {
        const normalizedPath = this.fileSystemService._normalizePath(fileSystemPath);
        const fileEntry = this.fileSystemService.context.fileSystem[normalizedPath];
        
        if (!fileEntry) {
            throw new FileNotFoundError(fileSystemPath);
        }

        fileEntry.type = 'dir';
        fileEntry.size = 4096;
        
        // Ajuster les permissions si nécessaire
        if (!fileEntry.permissions.startsWith('d')) {
            fileEntry.permissions = 'd' + fileEntry.permissions.slice(1);
        }
    }

    /**
     * Définit le type comme fichier
     * @param {string} fileSystemPath - Chemin du fichier
     * @throws {FileNotFoundError} - Si le fichier n'existe pas
     */
    setTypeFile(fileSystemPath) {
        const normalizedPath = this.fileSystemService._normalizePath(fileSystemPath);
        const fileEntry = this.fileSystemService.context.fileSystem[normalizedPath];
        
        if (!fileEntry) {
            throw new FileNotFoundError(fileSystemPath);
        }

        fileEntry.type = 'file';
        
        // Ajuster les permissions si nécessaire
        if (fileEntry.permissions.startsWith('d')) {
            fileEntry.permissions = '-' + fileEntry.permissions.slice(1);
        }

        // Recalculer la taille si c'est un fichier avec contenu
        if (fileEntry.content) {
            fileEntry.size = fileEntry.content.length;
        }
    }

    /**
     * Obtient le type d'un fichier/répertoire
     * @param {string} fileSystemPath - Chemin du fichier
     * @returns {string} - Type ('file', 'dir')
     * @throws {FileNotFoundError} - Si le fichier n'existe pas
     */
    getType(fileSystemPath) {
        const result = this.fileSystemService.getFile(fileSystemPath, 'read');
        return result.type;
    }

    /**
     * Vérifie si c'est un répertoire
     * @param {string} fileSystemPath - Chemin du fichier
     * @returns {boolean} - true si c'est un répertoire
     */
    isDir(fileSystemPath) {
        try {
            const type = this.getType(fileSystemPath);
            return type === 'dir';
        } catch {
            return false;
        }
    }

    /**
     * Vérifie si c'est un fichier
     * @param {string} fileSystemPath - Chemin du fichier
     * @returns {boolean} - true si c'est un fichier
     */
    isFile(fileSystemPath) {
        try {
            const type = this.getType(fileSystemPath);
            return type === 'file';
        } catch {
            return false;
        }
    }

    /**
     * Obtient la taille d'un fichier/répertoire
     * @param {string} fileSystemPath - Chemin du fichier
     * @returns {number} - Taille en octets
     * @throws {FileNotFoundError} - Si le fichier n'existe pas
     */
    getSize(fileSystemPath) {
        const result = this.fileSystemService.getFile(fileSystemPath, 'read');
        return result.size || 0;
    }

    /**
     * Convertit les permissions octales en chaîne
     * @param {number} octal - Permissions octales (ex: 755)
     * @param {string} fileSystemPath - Chemin pour déterminer le type
     * @returns {string} - Chaîne de permissions
     */
    _octalToPermissionString(octal, fileSystemPath) {
        const normalizedPath = this.fileSystemService._normalizePath(fileSystemPath);
        const fileEntry = this.fileSystemService.context.fileSystem[normalizedPath];
        
        // Déterminer le premier caractère selon le type
        let firstChar = '-';
        if (fileEntry && fileEntry.type === 'dir') {
            firstChar = 'd';
        }

        // Convertir chaque digit octal en rwx
        const octalStr = octal.toString();
        const digits = octalStr.padStart(3, '0').split('').map(d => parseInt(d));
        
        let permStr = firstChar;
        
        for (const digit of digits) {
            permStr += (digit & 4) ? 'r' : '-'; // Read
            permStr += (digit & 2) ? 'w' : '-'; // Write  
            permStr += (digit & 1) ? 'x' : '-'; // Execute
        }

        return permStr;
    }
}