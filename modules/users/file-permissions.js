// modules/users/file-permissions.js
// Système de permissions générique pour les opérations fichiers/dossiers

/**
 * Vérifie si un utilisateur a une permission spécifique sur un fichier/dossier
 * @param {Object} fileItem - Élément du système de fichiers
 * @param {Object} user - Utilisateur courant 
 * @param {string} permission - Type de permission ('r', 'w', 'x')
 * @returns {boolean} - true si l'utilisateur a la permission
 */
export function hasPermission(fileItem, user, permission) {
    // root a toujours toutes les permissions
    if (user.username === 'root') {
        return true;
    }

    const perms = fileItem.permissions;
    if (!perms || perms.length !== 10) {
        return false;
    }

    let pos;
    if (fileItem.owner === user.username) {
        // Permissions propriétaire (positions 1-3)
        pos = permission === 'r' ? 1 : permission === 'w' ? 2 : 3;
    } else if (user.groups && user.groups.includes(fileItem.group)) {
        // Permissions groupe (positions 4-6)
        pos = permission === 'r' ? 4 : permission === 'w' ? 5 : 6;
    } else {
        // Permissions autres (positions 7-9)
        pos = permission === 'r' ? 7 : permission === 'w' ? 8 : 9;
    }

    return perms[pos] === permission;
}

/**
 * Vérifie si un utilisateur peut créer un fichier/dossier dans un répertoire
 * @param {string} parentPath - Chemin du répertoire parent
 * @param {Object} fileSystem - Système de fichiers
 * @param {Object} user - Utilisateur courant
 * @returns {Object} - {allowed: boolean, error: string}
 */
export function canCreateInDirectory(parentPath, fileSystem, user) {
    // Vérifier que le répertoire parent existe
    const parentDir = fileSystem[parentPath];
    if (!parentDir) {
        return {
            allowed: false,
            error: `Répertoire parent n'existe pas: ${parentPath}`
        };
    }

    // Vérifier que c'est bien un répertoire
    if (parentDir.type !== 'dir') {
        return {
            allowed: false,
            error: `${parentPath} n'est pas un répertoire`
        };
    }

    // Vérifier les permissions d'écriture sur le répertoire parent
    if (!hasPermission(parentDir, user, 'w')) {
        return {
            allowed: false,
            error: `Permission refusée: impossible d'écrire dans ${parentPath}`
        };
    }

    return { allowed: true, error: null };
}

/**
 * Vérifie si un utilisateur peut supprimer un fichier/dossier
 * @param {string} filePath - Chemin du fichier à supprimer
 * @param {Object} fileSystem - Système de fichiers
 * @param {Object} user - Utilisateur courant
 * @returns {Object} - {allowed: boolean, error: string}
 */
export function canDelete(filePath, fileSystem, user) {
    // root peut tout supprimer
    if (user.username === 'root') {
        return { allowed: true, error: null };
    }

    const fileItem = fileSystem[filePath];
    if (!fileItem) {
        return {
            allowed: false,
            error: `Fichier inexistant: ${filePath}`
        };
    }

    // Pour supprimer un fichier, il faut avoir la permission d'écriture 
    // dans le répertoire parent
    const parentPath = filePath.substring(0, filePath.lastIndexOf('/')) || '/';
    const parentCheck = canCreateInDirectory(parentPath, fileSystem, user);
    if (!parentCheck.allowed) {
        return {
            allowed: false,
            error: `Permission refusée: impossible de supprimer dans ${parentPath}`
        };
    }

    return { allowed: true, error: null };
}

/**
 * Vérifie si un utilisateur peut lire un fichier
 * @param {string} filePath - Chemin du fichier
 * @param {Object} fileSystem - Système de fichiers
 * @param {Object} user - Utilisateur courant
 * @returns {Object} - {allowed: boolean, error: string}
 */
export function canRead(filePath, fileSystem, user) {
    const fileItem = fileSystem[filePath];
    if (!fileItem) {
        return {
            allowed: false,
            error: `Fichier inexistant: ${filePath}`
        };
    }

    if (!hasPermission(fileItem, user, 'r')) {
        return {
            allowed: false,
            error: `Permission refusée: lecture de ${filePath}`
        };
    }

    return { allowed: true, error: null };
}

/**
 * Vérifie si un utilisateur peut écrire dans un fichier
 * @param {string} filePath - Chemin du fichier
 * @param {Object} fileSystem - Système de fichiers
 * @param {Object} user - Utilisateur courant
 * @returns {Object} - {allowed: boolean, error: string}
 */
export function canWrite(filePath, fileSystem, user) {
    const fileItem = fileSystem[filePath];
    if (!fileItem) {
        return {
            allowed: false,
            error: `Fichier inexistant: ${filePath}`
        };
    }

    if (!hasPermission(fileItem, user, 'w')) {
        return {
            allowed: false,
            error: `Permission refusée: écriture sur ${filePath}`
        };
    }

    return { allowed: true, error: null };
}

/**
 * Vérifie si un utilisateur peut exécuter un fichier
 * @param {string} filePath - Chemin du fichier
 * @param {Object} fileSystem - Système de fichiers
 * @param {Object} user - Utilisateur courant
 * @returns {Object} - {allowed: boolean, error: string}
 */
export function canExecute(filePath, fileSystem, user) {
    const fileItem = fileSystem[filePath];
    if (!fileItem) {
        return {
            allowed: false,
            error: `Fichier inexistant: ${filePath}`
        };
    }

    if (!hasPermission(fileItem, user, 'x')) {
        return {
            allowed: false,
            error: `Permission refusée: exécution de ${filePath}`
        };
    }

    return { allowed: true, error: null };
}

/**
 * Vérifie si un utilisateur peut changer de répertoire (accéder)
 * @param {string} dirPath - Chemin du répertoire
 * @param {Object} fileSystem - Système de fichiers
 * @param {Object} user - Utilisateur courant
 * @returns {Object} - {allowed: boolean, error: string}
 */
export function canChangeDirectory(dirPath, fileSystem, user) {
    const dirItem = fileSystem[dirPath];
    if (!dirItem) {
        return {
            allowed: false,
            error: `Répertoire inexistant: ${dirPath}`
        };
    }

    if (dirItem.type !== 'dir') {
        return {
            allowed: false,
            error: `${dirPath} n'est pas un répertoire`
        };
    }

    // Pour accéder à un répertoire, il faut la permission 'x'
    if (!hasPermission(dirItem, user, 'x')) {
        return {
            allowed: false,
            error: `Permission refusée: accès à ${dirPath}`
        };
    }

    return { allowed: true, error: null };
}

/**
 * Fonction générique pour vérifier les permissions et afficher l'erreur
 * @param {Function} permissionCheckFn - Fonction de vérification de permission
 * @param {...any} args - Arguments pour la fonction de vérification
 * @param {Function} errorFn - Fonction pour afficher les erreurs
 * @returns {boolean} - true si autorisé, false sinon
 */
export function checkPermissionWithError(permissionCheckFn, ...args) {
    const errorFn = args.pop(); // Le dernier argument est toujours errorFn
    const result = permissionCheckFn(...args);
    
    if (!result.allowed) {
        errorFn(result.error);
        return false;
    }
    
    return true;
}

/**
 * Crée les métadonnées par défaut pour un nouveau fichier
 * @param {Object} user - Utilisateur courant
 * @param {string} permissions - Permissions par défaut (optionnel)
 * @returns {Object} - Métadonnées du fichier
 */
export function createFileMetadata(user, permissions = '-rw-r--r--') {
    const now = new Date();
    return {
        type: 'file',
        size: 0,
        content: '',
        created: now,
        modified: now,
        accessed: now,
        permissions: permissions,
        owner: user.username,
        group: user.groups ? user.groups[0] : user.username,
        links: 1
    };
}

/**
 * Crée les métadonnées par défaut pour un nouveau répertoire
 * @param {Object} user - Utilisateur courant
 * @param {string} permissions - Permissions par défaut (optionnel)
 * @returns {Object} - Métadonnées du répertoire
 */
export function createDirectoryMetadata(user, permissions = 'drwxr-xr-x') {
    const now = new Date();
    return {
        type: 'dir',
        size: 4096,
        created: now,
        modified: now,
        accessed: now,
        permissions: permissions,
        owner: user.username,
        group: user.groups ? user.groups[0] : user.username,
        links: 2
    };
}