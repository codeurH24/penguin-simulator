// bin/mv/metadata.js - Gestion des métadonnées pour la commande mv

/**
 * Préserve les métadonnées lors d'un déplacement de fichier
 * Cette fonction implémente la sémantique Unix de préservation des métadonnées :
 * - Les dates de création et d'accès sont préservées
 * - Le propriétaire et le groupe sont préservés
 * - Les permissions sont préservées
 * - Seule la date de modification est mise à jour pour refléter l'opération mv
 * 
 * @param {Object} sourceFile - Fichier source avec ses métadonnées
 * @param {Object} destFile - Fichier de destination à créer/modifier
 * @returns {Object} - Fichier de destination avec métadonnées préservées
 */
export function preserveMetadata(sourceFile, destFile = null) {
    // Création d'un nouvel objet fichier avec les métadonnées préservées
    const preservedFile = {
        // Contenu et type du fichier source
        type: sourceFile.type,
        content: sourceFile.content || '',
        size: sourceFile.size || 0,
        
        // PRÉSERVATION DES MÉTADONNÉES TEMPORELLES
        // En Unix, mv préserve ces dates car le fichier n'est pas "modifié" conceptuellement
        created: sourceFile.created,      // Date de création préservée
        accessed: sourceFile.accessed,    // Dernière date d'accès préservée
        
        // MISE À JOUR DE LA DATE DE MODIFICATION
        // Cette date reflète l'opération mv elle-même
        modified: new Date(),
        
        // PRÉSERVATION DES MÉTADONNÉES DE SÉCURITÉ
        // Ces informations définissent l'identité et les droits du fichier
        permissions: sourceFile.permissions,  // Droits Unix (rwxrwxrwx)
        owner: sourceFile.owner,              // Propriétaire du fichier
        group: sourceFile.group,              // Groupe propriétaire
        
        // MÉTADONNÉES SYSTÈME AVANCÉES
        // Ces champs gèrent les aspects techniques du système de fichiers
        links: sourceFile.links || 1,         // Nombre de liens hard
        inode: sourceFile.inode,              // Numéro d'inode (si disponible)
        
        // MÉTADONNÉES SPÉCIFIQUES AUX RÉPERTOIRES
        // Ces champs sont pertinents pour les déplacements de répertoires
        ...(sourceFile.type === 'dir' && {
            entries: sourceFile.entries || {}  // Entrées du répertoire
        })
    };

    return preservedFile;
}

/**
 * Met à jour les métadonnées d'accès lors de la lecture d'un fichier
 * Cette fonction suit la sémantique Unix d'atime (access time)
 * 
 * @param {Object} file - Fichier dont l'atime doit être mise à jour
 * @returns {Object} - Fichier avec atime mis à jour
 */
export function updateAccessTime(file) {
    // En Unix, chaque lecture met à jour l'atime (sauf si noatime est activé)
    const updatedFile = { ...file };
    updatedFile.accessed = new Date();
    return updatedFile;
}

/**
 * Calcule la taille réelle d'un fichier ou répertoire
 * Cette fonction implémente la logique Unix de calcul de taille
 * 
 * @param {Object} file - Fichier ou répertoire
 * @param {Object} fileSystem - Système de fichiers complet (pour les répertoires)
 * @param {string} filePath - Chemin du fichier (pour les répertoires)
 * @returns {number} - Taille en octets
 */
export function calculateFileSize(file, fileSystem = null, filePath = null) {
    if (file.type === 'file') {
        // Pour un fichier, la taille est celle de son contenu
        return file.content ? file.content.length : 0;
    } else if (file.type === 'dir') {
        // Pour un répertoire, la taille standard Unix est 4096 octets
        // Cela représente l'espace nécessaire pour stocker les métadonnées du répertoire
        return 4096;
    }
    
    return 0;
}

/**
 * Valide et normalise les permissions Unix
 * Cette fonction s'assure que les permissions respectent le format Unix standard
 * 
 * @param {string} permissions - Chaîne de permissions (ex: "drwxr-xr-x")
 * @param {string} fileType - Type de fichier ('file' ou 'dir')
 * @returns {string} - Permissions normalisées
 */
export function normalizePermissions(permissions, fileType) {
    // Vérification de la validité de base
    if (!permissions || permissions.length !== 10) {
        // Permissions par défaut selon le type de fichier
        return fileType === 'dir' ? 'drwxr-xr-x' : '-rw-r--r--';
    }
    
    // Correction du caractère de type si nécessaire
    const typeChar = fileType === 'dir' ? 'd' : '-';
    const permissionsPart = permissions.slice(1);
    
    return typeChar + permissionsPart;
}

/**
 * Clone profondément les métadonnées d'un fichier
 * Cette fonction évite les références partagées qui pourraient causer des bugs
 * 
 * @param {Object} sourceFile - Fichier source
 * @returns {Object} - Clone indépendant du fichier
 */
export function cloneFileMetadata(sourceFile) {
    // Clone profond pour éviter les références partagées
    const cloned = {
        type: sourceFile.type,
        content: sourceFile.content,
        size: sourceFile.size,
        
        // Clonage des dates (objets Date)
        created: sourceFile.created ? new Date(sourceFile.created.getTime()) : new Date(),
        modified: sourceFile.modified ? new Date(sourceFile.modified.getTime()) : new Date(),
        accessed: sourceFile.accessed ? new Date(sourceFile.accessed.getTime()) : new Date(),
        
        // Clonage des chaînes de caractères
        permissions: sourceFile.permissions ? String(sourceFile.permissions) : '-rw-r--r--',
        owner: sourceFile.owner ? String(sourceFile.owner) : 'root',
        group: sourceFile.group ? String(sourceFile.group) : 'root',
        
        // Métadonnées système
        links: sourceFile.links || 1,
        inode: sourceFile.inode
    };
    
    // Clonage spécial pour les répertoires
    if (sourceFile.type === 'dir' && sourceFile.entries) {
        cloned.entries = { ...sourceFile.entries };
    }
    
    return cloned;
}

/**
 * Applique les métadonnées d'un utilisateur à un fichier nouvellement créé
 * Cette fonction gère les cas où le propriétaire change lors du déplacement
 * 
 * @param {Object} file - Fichier à modifier
 * @param {Object} user - Utilisateur effectuant l'opération
 * @param {boolean} preserveOriginalOwner - Si true, garde le propriétaire original
 * @returns {Object} - Fichier avec propriétaire mis à jour
 */
export function applyUserMetadata(file, user, preserveOriginalOwner = true) {
    const updatedFile = { ...file };
    
    if (!preserveOriginalOwner || !file.owner) {
        // Nouveau propriétaire devient l'utilisateur effectuant l'opération
        updatedFile.owner = user.username || user.uid || 'root';
        updatedFile.group = user.group || user.gid || 'users';
    }
    
    // Mise à jour de la date de modification pour refléter l'opération
    updatedFile.modified = new Date();
    
    return updatedFile;
}