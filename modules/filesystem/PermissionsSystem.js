// modules/filesystem/PermissionsSystem.js
// Système de permissions conforme à Debian/Linux

/**
 * Système de gestion des permissions selon les standards Linux/Debian
 */
export class PermissionsSystem {
    constructor(fileSystemService) {
        this.fileSystemService = fileSystemService;
    }

    /**
     * Vérifie si un utilisateur a une permission spécifique sur un fichier/répertoire
     * @param {string} fileSystemPath - Chemin du fichier
     * @param {Object} user - Objet utilisateur (uid, gid, groups)
     * @param {string} askPermission - Type de permission ('read', 'write', 'execute', 'list', 'traverse')
     * @returns {Object} - {allowed: boolean, reason?: string}
     */
    hasPermission(fileSystemPath, user, askPermission) {
        const normalizedPath = this.fileSystemService._normalizePath(fileSystemPath);
        const fileEntry = this.fileSystemService.context.fileSystem[normalizedPath];
        
        if (!fileEntry) {
            return { allowed: false, reason: 'File not found' };
        }

        // Root contourne la plupart des vérifications
        if (user.uid === 0) {
            // Sauf pour l'exécution - root doit avoir x quelque part
            if (askPermission === 'execute' && fileEntry.type === 'file') {
                return this._checkExecutePermission(fileEntry);
            }
            return { allowed: true, reason: 'Root user' };
        }

        // Vérifier les permissions sur tout le chemin d'accès
        const pathCheck = this._checkPathPermissions(normalizedPath, user, askPermission);
        if (!pathCheck.allowed) {
            return pathCheck;
        }

        // Vérifier les permissions sur l'objet final
        return this._checkObjectPermissions(fileEntry, user, askPermission);
    }

    /**
     * Vérifie les permissions d'accès au chemin (traverse)
     * @param {string} path - Chemin complet
     * @param {Object} user - Utilisateur
     * @param {string} operation - Opération demandée
     * @returns {Object} - Résultat de vérification
     */
    _checkPathPermissions(path, user, operation) {
        const parts = path.split('/').filter(p => p !== '');
        let currentPath = '';

        // Pour les opérations de namespace (create, delete, rename)
        // on ne vérifie que le chemin jusqu'au parent
        const pathsToCheck = ['create', 'delete', 'rename'].includes(operation)
            ? parts.slice(0, -1)
            : parts;

        for (const part of pathsToCheck) {
            currentPath = currentPath === '' ? '/' + part : currentPath + '/' + part;
            if (currentPath === path && ['create', 'delete', 'rename'].includes(operation)) {
                break; // Ne pas vérifier l'objet lui-même pour les opérations de namespace
            }

            const dirEntry = this.fileSystemService.context.fileSystem[currentPath];
            if (!dirEntry || dirEntry.type !== 'dir') {
                continue;
            }

            // Vérifier la permission traverse (x) sur chaque répertoire du chemin
            const traverseCheck = this._checkObjectPermissions(dirEntry, user, 'traverse');
            if (!traverseCheck.allowed) {
                return { allowed: false, reason: `No traverse permission on ${currentPath}` };
            }
        }

        return { allowed: true };
    }

    /**
     * Vérifie les permissions sur l'objet final
     * @param {Object} fileEntry - Entrée de fichier
     * @param {Object} user - Utilisateur
     * @param {string} operation - Opération demandée
     * @returns {Object} - Résultat de vérification
     */
    _checkObjectPermissions(fileEntry, user, operation) {
        const permissions = this._parsePermissions(fileEntry.permissions);
        const userType = this._getUserType(fileEntry, user);

        switch (operation) {
            case 'read':
                return { 
                    allowed: permissions[userType].read,
                    reason: permissions[userType].read ? null : `No read permission (${userType})`
                };

            case 'write':
                return { 
                    allowed: permissions[userType].write,
                    reason: permissions[userType].write ? null : `No write permission (${userType})`
                };

            case 'execute':
                if (fileEntry.type === 'file') {
                    return this._checkExecutePermission(fileEntry, user);
                }
                // Pour les répertoires, execute = traverse
                return this._checkObjectPermissions(fileEntry, user, 'traverse');

            case 'traverse':
                // Permission x sur un répertoire
                if (fileEntry.type !== 'dir') {
                    return { allowed: false, reason: 'Not a directory' };
                }
                return { 
                    allowed: permissions[userType].execute,
                    reason: permissions[userType].execute ? null : `No traverse permission (${userType})`
                };

            case 'list':
                // Permission r sur un répertoire
                if (fileEntry.type !== 'dir') {
                    return { allowed: false, reason: 'Not a directory' };
                }
                return { 
                    allowed: permissions[userType].read,
                    reason: permissions[userType].read ? null : `No list permission (${userType})`
                };

            default:
                return { allowed: false, reason: `Unknown operation: ${operation}` };
        }
    }

    /**
     * Vérifie la permission d'exécution sur un fichier
     * @param {Object} fileEntry - Entrée de fichier
     * @param {Object} user - Utilisateur (optionnel, pour root)
     * @returns {Object} - Résultat de vérification
     */
    _checkExecutePermission(fileEntry, user = null) {
        if (fileEntry.type !== 'file') {
            return { allowed: false, reason: 'Not a file' };
        }

        const permissions = this._parsePermissions(fileEntry.permissions);
        
        // Pour root, vérifier si au moins un x existe
        if (user && user.uid === 0) {
            const hasAnyExecute = permissions.owner.execute || 
                                permissions.group.execute || 
                                permissions.others.execute;
            return { 
                allowed: hasAnyExecute,
                reason: hasAnyExecute ? null : 'No execute permission anywhere'
            };
        }

        // Pour les autres utilisateurs
        if (!user) return { allowed: false, reason: 'User required for execute check' };
        
        const userType = this._getUserType(fileEntry, user);
        return { 
            allowed: permissions[userType].execute,
            reason: permissions[userType].execute ? null : `No execute permission (${userType})`
        };
    }

    /**
     * Parse les permissions sous forme de chaîne (-rwxrwxrwx)
     * @param {string} permString - Chaîne de permissions
     * @returns {Object} - Permissions parsées
     */
    _parsePermissions(permString) {
        // Format: drwxrwxrwx ou -rwxrwxrwx
        const perms = permString.slice(1); // Enlever le premier caractère (d ou -)
        
        return {
            owner: {
                read: perms[0] === 'r',
                write: perms[1] === 'w',
                execute: perms[2] === 'x' || perms[2] === 's' || perms[2] === 'S'
            },
            group: {
                read: perms[3] === 'r',
                write: perms[4] === 'w',
                execute: perms[5] === 'x' || perms[5] === 's' || perms[5] === 'S'
            },
            others: {
                read: perms[6] === 'r',
                write: perms[7] === 'w',
                execute: perms[8] === 'x' || perms[8] === 't' || perms[8] === 'T'
            }
        };
    }

    /**
     * Détermine le type d'utilisateur (owner, group, others)
     * @param {Object} fileEntry - Entrée de fichier
     * @param {Object} user - Utilisateur
     * @returns {string} - Type d'utilisateur
     */
    _getUserType(fileEntry, user) {
        // Vérifier si l'utilisateur est le propriétaire
        if (fileEntry.owner === user.username || 
            (typeof fileEntry.owner === 'number' && fileEntry.owner === user.uid)) {
            return 'owner';
        }

        // Vérifier si l'utilisateur appartient au groupe
        if (this._userInGroup(user, fileEntry.group)) {
            return 'group';
        }

        return 'others';
    }

    /**
     * Vérifie si un utilisateur appartient à un groupe
     * @param {Object} user - Utilisateur
     * @param {string|number} group - Nom ou GID du groupe
     * @returns {boolean} - true si l'utilisateur appartient au groupe
     */
    _userInGroup(user, group) {
        // Groupe principal
        if (user.gid === group || user.group === group) {
            return true;
        }

        // Groupes secondaires
        if (user.groups && user.groups.includes(group)) {
            return true;
        }

        return false;
    }

    /**
     * Obtient les permissions d'un fichier
     * @param {string} fileSystemPath - Chemin du fichier
     * @returns {string|null} - Chaîne de permissions ou null
     */
    getPermissions(fileSystemPath) {
        const normalizedPath = this.fileSystemService._normalizePath(fileSystemPath);
        const fileEntry = this.fileSystemService.context.fileSystem[normalizedPath];
        return fileEntry ? fileEntry.permissions : null;
    }

    /**
     * Définit les permissions d'un fichier
     * @param {string} fileSystemPath - Chemin du fichier
     * @param {string} permissions - Nouvelles permissions
     * @param {Object} user - Utilisateur effectuant le changement
     * @returns {boolean|string} - true si succès, message d'erreur sinon
     */
    setPermissions(fileSystemPath, permissions, user) {
        const normalizedPath = this.fileSystemService._normalizePath(fileSystemPath);
        const fileEntry = this.fileSystemService.context.fileSystem[normalizedPath];
        
        if (!fileEntry) {
            return `chmod: cannot access '${fileSystemPath}': No such file or directory`;
        }

        // Seul le propriétaire ou root peut changer les permissions
        if (user.uid !== 0 && fileEntry.owner !== user.username && fileEntry.owner !== user.uid) {
            return `chmod: changing permissions of '${fileSystemPath}': Operation not permitted`;
        }

        // Valider le format des permissions
        if (!this._isValidPermissionString(permissions)) {
            return `chmod: invalid mode: '${permissions}'`;
        }

        fileEntry.permissions = permissions;
        fileEntry.modified = new Date();
        
        return true;
    }

    /**
     * Valide une chaîne de permissions
     * @param {string} permissions - Chaîne à valider
     * @returns {boolean} - true si valide
     */
    _isValidPermissionString(permissions) {
        // Format: drwxrwxrwx ou -rwxrwxrwx (10 caractères)
        if (permissions.length !== 10) return false;
        
        const first = permissions[0];
        if (first !== 'd' && first !== '-' && first !== 'l' && first !== 'c' && first !== 'b') {
            return false;
        }

        const permPart = permissions.slice(1);
        const validChars = /^[rwxsStT-]{9}$/;
        return validChars.test(permPart);
    }

    // Méthodes utilitaires pour vérifications spécifiques
    canRead(fileSystemPath) {
        return this.hasPermission(fileSystemPath, this.fileSystemService.user, 'read').allowed;
    }

    canWrite(fileSystemPath) {
        return this.hasPermission(fileSystemPath, this.fileSystemService.user, 'write').allowed;
    }

    canExecute(fileSystemPath) {
        return this.hasPermission(fileSystemPath, this.fileSystemService.user, 'execute').allowed;
    }
}