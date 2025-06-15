// modules/filesystem/FileSystemService.js
// Système de fichiers avec gestion des permissions Linux

import { PermissionsSystem } from './PermissionsSystem.js';
import { FileSystem } from './FileSystem.js';
import { 
    PermissionDeniedError, 
    FileNotFoundError, 
    FileExistsError, 
    TypeMismatchError,
    NotDirectoryError
} from './FileSystemExceptions.js';

/**
 * Service principal pour la gestion du système de fichiers avec permissions
 */
export class FileSystemService {
    constructor(context) {
        this.context = context;
        this.user = context.currentUser;
        this.permissionsSystem = new PermissionsSystem(this);
        this.fileSystem = new FileSystem(this);
    }

    /**
     * Récupère un fichier/dossier avec vérification des permissions
     * @param {string} fileSystemPath - Chemin du fichier
     * @param {string} operation - Type d'opération ('read', 'write', 'execute', 'list', 'traverse')
     * @returns {Object} - Objet fichier
     * @throws {FileNotFoundError} - Si le fichier n'existe pas
     * @throws {PermissionDeniedError} - Si permissions insuffisantes
     */
    getFile(fileSystemPath, operation = 'read') {
        // Normaliser le chemin
        const normalizedPath = this._normalizePath(fileSystemPath);
        
        // Vérifier si le fichier existe
        if (!this.context.fileSystem[normalizedPath]) {
            throw new FileNotFoundError(fileSystemPath);
        }

        // Vérifier les permissions
        const permissionCheck = this.permissionsSystem.hasPermission(
            normalizedPath, 
            this.user, 
            operation
        );

        if (!permissionCheck.allowed) {
            throw new PermissionDeniedError(fileSystemPath, operation);
        }

        return this.context.fileSystem[normalizedPath];
    }

    /**
     * Crée, modifie ou supprime un fichier/dossier avec vérification des permissions
     * L'opération est déterminée automatiquement :
     * - fileEntry fournie + chemin inexistant → création
     * - fileEntry fournie + chemin existant → modification  
     * - fileEntry null + chemin existant → suppression
     * 
     * @param {string} fileSystemPath - Chemin du fichier
     * @param {Object|null} fileEntry - Entrée de fichier (null pour suppression)
     * @throws {FileNotFoundError} - Si tentative de suppression d'un fichier inexistant
     * @throws {FileExistsError} - Si tentative de création d'un fichier existant
     * @throws {PermissionDeniedError} - Si permissions insuffisantes
     * @throws {TypeMismatchError} - Si changement de type lors de modification
     */
    setFile(fileSystemPath, fileEntry = null) {
        const normalizedPath = this._normalizePath(fileSystemPath);
        const parentPath = this._getParentPath(normalizedPath);
        const fileExists = !!this.context.fileSystem[normalizedPath];

        // Déterminer l'opération automatiquement
        let operation;
        if (fileEntry === null) {
            if (fileExists) {
                operation = 'delete';
            } else {
                throw new FileNotFoundError(fileSystemPath);
            }
        } else {
            if (fileExists) {
                operation = 'modify';
            } else {
                operation = 'create';
            }
        }

        // Vérifier les permissions sur le répertoire parent pour les opérations de namespace
        if (['create', 'delete', 'rename'].includes(operation)) {
            const parentCheck = this.permissionsSystem.hasPermission(
                parentPath, 
                this.user, 
                'write'
            );

            if (!parentCheck.allowed) {
                throw new PermissionDeniedError(fileSystemPath, operation);
            }
        }

        if (operation === 'create') {
            // Création d'un nouveau fichier/dossier
            this.context.fileSystem[normalizedPath] = fileEntry;
            return;
        }

        if (operation === 'modify') {
            const existingEntry = this.context.fileSystem[normalizedPath];
            
            // Vérifier que le type ne change pas
            if (existingEntry.type !== fileEntry.type) {
                throw new TypeMismatchError(fileSystemPath, existingEntry.type, fileEntry.type);
            }

            // Vérifier les permissions d'écriture sur le fichier lui-même
            const writeCheck = this.permissionsSystem.hasPermission(
                normalizedPath, 
                this.user, 
                'write'
            );

            if (!writeCheck.allowed) {
                throw new PermissionDeniedError(fileSystemPath, 'write');
            }

            // Mettre à jour le fichier
            this.context.fileSystem[normalizedPath] = {
                ...existingEntry,
                ...fileEntry,
                modified: new Date(),
                accessed: new Date()
            };

            return;
        }

        if (operation === 'delete') {
            delete this.context.fileSystem[normalizedPath];
            
            // Si c'est un répertoire, supprimer aussi tout son contenu
            const prefix = normalizedPath === '/' ? '/' : normalizedPath + '/';
            Object.keys(this.context.fileSystem).forEach(key => {
                if (key.startsWith(prefix)) {
                    delete this.context.fileSystem[key];
                }
            });

            return;
        }
    }

    /**
     * Liste le contenu d'un répertoire avec vérification des permissions
     * @param {string} dirPath - Chemin du répertoire
     * @returns {Array} - Liste des entrées
     * @throws {FileNotFoundError} - Si le répertoire n'existe pas
     * @throws {NotDirectoryError} - Si le chemin n'est pas un répertoire
     * @throws {PermissionDeniedError} - Si permissions insuffisantes
     */
    listDirectory(dirPath) {
        const normalizedPath = this._normalizePath(dirPath);
        
        // Vérifier que le répertoire existe et obtenir l'entrée
        const dirEntry = this.getFile(normalizedPath, 'list');

        if (dirEntry.type !== 'dir') {
            throw new NotDirectoryError(dirPath);
        }

        const prefix = normalizedPath === '/' ? '/' : normalizedPath + '/';
        const entries = [];

        Object.keys(this.context.fileSystem).forEach(path => {
            if (path === normalizedPath) return;
            if (!path.startsWith(prefix)) return;

            const relativePath = path.substring(prefix.length);
            if (!relativePath.includes('/')) {
                entries.push({
                    name: relativePath,
                    type: this.context.fileSystem[path].type,
                    path: path,
                    entry: this.context.fileSystem[path]
                });
            }
        });

        return entries;
    }

    /**
     * Normalise un chemin de fichier
     * @param {string} path - Chemin à normaliser
     * @returns {string} - Chemin normalisé
     */
    _normalizePath(path) {
        if (!path.startsWith('/')) {
            // Chemin relatif, utiliser le répertoire courant
            const currentPath = this.context.getCurrentPath();
            path = currentPath === '/' ? '/' + path : currentPath + '/' + path;
        }

        // Résoudre les . et ..
        const parts = path.split('/').filter(part => part !== '' && part !== '.');
        const resolved = [];

        for (const part of parts) {
            if (part === '..') {
                if (resolved.length > 0) {
                    resolved.pop();
                }
            } else {
                resolved.push(part);
            }
        }

        return resolved.length === 0 ? '/' : '/' + resolved.join('/');
    }

    /**
     * Obtient le chemin du répertoire parent
     * @param {string} path - Chemin du fichier
     * @returns {string} - Chemin du parent
     */
    _getParentPath(path) {
        if (path === '/') return '/';
        const lastSlash = path.lastIndexOf('/');
        return lastSlash === 0 ? '/' : path.substring(0, lastSlash);
    }

    /**
     * Vérifie si un chemin est un répertoire
     * @param {string} path - Chemin à vérifier
     * @returns {boolean} - true si c'est un répertoire
     */
    isDirectory(path) {
        try {
            const normalizedPath = this._normalizePath(path);
            const entry = this.context.fileSystem[normalizedPath];
            return entry && entry.type === 'dir';
        } catch {
            return false;
        }
    }

    /**
     * Vérifie si un chemin existe
     * @param {string} path - Chemin à vérifier
     * @returns {boolean} - true si le chemin existe
     */
    exists(path) {
        try {
            const normalizedPath = this._normalizePath(path);
            return !!this.context.fileSystem[normalizedPath];
        } catch {
            return false;
        }
    }
}