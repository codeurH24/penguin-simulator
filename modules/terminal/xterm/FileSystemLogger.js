// modules/terminal/xterm/FileSystemLogger.js
// Logger pour intercepter les modifications du filesystem

export class FileSystemLogger {
    constructor() {
        this.fileOperations = [];
        this.originalFileSystem = {};
        this.isActive = false;
    }

    logFileOperation(operation, path, details = {}) {
        this.fileOperations.push({
            timestamp: Date.now(),
            operation: operation, // 'create', 'modify', 'delete', 'move'
            path: path,
            details: {
                user: details.user || 'unknown',
                workingDirectory: details.workingDirectory || '/',
                command: details.command || null,
                fileType: details.fileType || 'unknown',
                oldContent: details.oldContent || null,
                newContent: details.newContent || null,
                permissions: details.permissions || null,
                size: details.size || null,
                ...details
            }
        });
        
        if (this.fileOperations.length > 5000) {
            this.fileOperations = this.fileOperations.slice(-2500);
        }
    }

    /**
     * Crée un proxy sur le filesystem pour intercepter les modifications
     * @param {Object} fileSystem - L'objet filesystem à surveiller
     * @param {Object} metadata - Métadonnées (user, workingDirectory, etc.)
     * @returns {Proxy} - Proxy du filesystem
     */
    createFileSystemProxy(fileSystem, metadata = {}) {
        // Sauvegarder l'état initial
        this.originalFileSystem = this.deepClone(fileSystem);
        this.isActive = true;

        return new Proxy(fileSystem, {
            set: (target, path, value) => {
                const oldValue = target[path];
                const wasExisting = oldValue !== undefined;
                
                // Effectuer la modification
                target[path] = value;

                // Logger l'opération
                if (!wasExisting) {
                    // Nouveau fichier/dossier
                    this.logFileOperation('create', path, {
                        ...metadata,
                        fileType: value?.type || 'unknown',
                        permissions: value?.permissions || null,
                        size: value?.size || (value?.content ? value.content.length : null),
                        newContent: value?.type === 'file' ? value?.content : null
                    });
                } else {
                    // Modification existante
                    this.logFileOperation('modify', path, {
                        ...metadata,
                        fileType: value?.type || 'unknown',
                        permissions: value?.permissions || null,
                        oldContent: oldValue?.content || null,
                        newContent: value?.content || null,
                        size: value?.size || (value?.content ? value.content.length : null)
                    });
                }

                return true;
            },

            deleteProperty: (target, path) => {
                const oldValue = target[path];
                
                if (oldValue !== undefined) {
                    // Logger la suppression
                    this.logFileOperation('delete', path, {
                        ...metadata,
                        fileType: oldValue?.type || 'unknown',
                        oldContent: oldValue?.content || null,
                        permissions: oldValue?.permissions || null,
                        size: oldValue?.size || null
                    });
                }

                delete target[path];
                return true;
            }
        });
    }

    /**
     * Met à jour les métadonnées pour le logging
     * @param {Object} metadata - Nouvelles métadonnées
     */
    updateMetadata(metadata) {
        this.currentMetadata = metadata;
    }

    /**
     * Compare deux états du filesystem et log les différences
     * @param {Object} oldFileSystem - Ancien état
     * @param {Object} newFileSystem - Nouvel état
     * @param {Object} metadata - Métadonnées
     */
    compareAndLog(oldFileSystem, newFileSystem, metadata = {}) {
        const oldPaths = new Set(Object.keys(oldFileSystem));
        const newPaths = new Set(Object.keys(newFileSystem));

        // Fichiers supprimés
        for (const path of oldPaths) {
            if (!newPaths.has(path)) {
                const oldFile = oldFileSystem[path];
                this.logFileOperation('delete', path, {
                    ...metadata,
                    fileType: oldFile?.type || 'unknown',
                    oldContent: oldFile?.content || null,
                    permissions: oldFile?.permissions || null
                });
            }
        }

        // Fichiers ajoutés ou modifiés
        for (const path of newPaths) {
            const oldFile = oldFileSystem[path];
            const newFile = newFileSystem[path];

            if (!oldPaths.has(path)) {
                // Nouveau fichier
                this.logFileOperation('create', path, {
                    ...metadata,
                    fileType: newFile?.type || 'unknown',
                    permissions: newFile?.permissions || null,
                    newContent: newFile?.content || null,
                    size: newFile?.size || (newFile?.content ? newFile.content.length : null)
                });
            } else if (this.hasChanged(oldFile, newFile)) {
                // Fichier modifié
                this.logFileOperation('modify', path, {
                    ...metadata,
                    fileType: newFile?.type || 'unknown',
                    permissions: newFile?.permissions || null,
                    oldContent: oldFile?.content || null,
                    newContent: newFile?.content || null,
                    size: newFile?.size || (newFile?.content ? newFile.content.length : null)
                });
            }
        }
    }

    /**
     * Vérifie si un fichier a changé
     * @param {Object} oldFile - Ancien fichier
     * @param {Object} newFile - Nouveau fichier
     * @returns {boolean} - true si changé
     */
    hasChanged(oldFile, newFile) {
        if (!oldFile || !newFile) return true;
        
        return (
            oldFile.content !== newFile.content ||
            oldFile.permissions !== newFile.permissions ||
            oldFile.owner !== newFile.owner ||
            oldFile.group !== newFile.group ||
            oldFile.size !== newFile.size
        );
    }

    /**
     * Clone profond d'un objet
     * @param {Object} obj - Objet à cloner
     * @returns {Object} - Clone
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (Array.isArray(obj)) return obj.map(item => this.deepClone(item));
        
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        return cloned;
    }

    // Méthodes d'accès aux données
    getFileOperations() { return this.fileOperations; }
    getTotalOperations() { return this.fileOperations.length; }
    getRecentOperations(timeWindow) {
        const cutoff = Date.now() - timeWindow;
        return this.fileOperations.filter(entry => entry.timestamp >= cutoff);
    }
    clear() { this.fileOperations = []; }

    /**
     * Obtient les statistiques des opérations
     * @param {number} timeWindow - Fenêtre de temps (optionnel)
     * @returns {Object} - Statistiques
     */
    getStats(timeWindow = null) {
        let operations = this.fileOperations;
        
        if (timeWindow) {
            const cutoff = Date.now() - timeWindow;
            operations = operations.filter(entry => entry.timestamp >= cutoff);
        }

        const stats = {
            total: operations.length,
            byOperation: {},
            byFileType: {},
            byUser: {},
            recentActivity: operations.slice(-10)
        };

        operations.forEach(entry => {
            // Par opération
            stats.byOperation[entry.operation] = (stats.byOperation[entry.operation] || 0) + 1;
            
            // Par type de fichier
            const fileType = entry.details.fileType || 'unknown';
            stats.byFileType[fileType] = (stats.byFileType[fileType] || 0) + 1;
            
            // Par utilisateur
            const user = entry.details.user || 'unknown';
            stats.byUser[user] = (stats.byUser[user] || 0) + 1;
        });

        return stats;
    }
}