// bin/usermod/utils.js - Fonctions utilitaires pour usermod

/**
 * Vérifie que l'utilisateur courant a les privilèges root
 * @param {Object} context - Contexte d'exécution
 * @param {Function} errorFn - Fonction d'affichage des erreurs
 * @returns {boolean} - true si l'utilisateur a les privilèges root
 */
export function requiresRootPrivileges(context, errorFn) {
    const currentUser = context.currentUser;
    
    if (!currentUser) {
        errorFn('usermod: aucun utilisateur courant');
        return false;
    }
    
    if (currentUser.uid !== 0) {
        errorFn('usermod: Permission refusée (vous devez être root)');
        return false;
    }
    
    return true;
}

/**
 * Récupère les informations d'un utilisateur depuis /etc/passwd
 * @param {string} username - Nom d'utilisateur
 * @param {Object} context - Contexte d'exécution
 * @returns {Object|null} - Informations utilisateur ou null si non trouvé
 */
export function getUserInfo(username, context) {
    const { fileSystem } = context;
    
    if (!fileSystem['/etc/passwd']) {
        return null;
    }
    
    const passwdContent = fileSystem['/etc/passwd'].content;
    const lines = passwdContent.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
        const [name, password, uid, gid, gecos, home, shell] = line.split(':');
        if (name === username) {
            return {
                username: name,
                password: password,
                uid: parseInt(uid),
                gid: parseInt(gid),
                gecos: gecos,
                home: home,
                shell: shell
            };
        }
    }
    
    return null;
}

/**
 * Récupère les informations d'un groupe depuis /etc/group
 * @param {string|number} groupIdentifier - Nom ou GID du groupe
 * @param {Object} context - Contexte d'exécution
 * @returns {Object|null} - Informations du groupe ou null si non trouvé
 */
export function getGroupInfo(groupIdentifier, context) {
    const { fileSystem } = context;
    
    if (!fileSystem['/etc/group']) {
        return null;
    }
    
    const groupContent = fileSystem['/etc/group'].content;
    const lines = groupContent.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
        const [groupName, password, gid, members] = line.split(':');
        const groupGid = parseInt(gid);
        
        if ((typeof groupIdentifier === 'string' && groupName === groupIdentifier) ||
            (typeof groupIdentifier === 'number' && groupGid === groupIdentifier)) {
            return {
                name: groupName,
                password: password,
                gid: groupGid,
                members: members ? members.split(',').filter(m => m.trim()) : []
            };
        }
    }
    
    return null;
}

/**
 * Récupère tous les groupes auxquels un utilisateur appartient
 * @param {string} username - Nom d'utilisateur
 * @param {Object} context - Contexte d'exécution
 * @returns {Array} - Liste des groupes (primaire + supplémentaires)
 */
export function getUserGroups(username, context) {
    const { fileSystem } = context;
    const groups = [];
    
    // Récupérer le groupe principal depuis /etc/passwd
    const userInfo = getUserInfo(username, context);
    if (userInfo) {
        const primaryGroup = getGroupInfo(userInfo.gid, context);
        if (primaryGroup) {
            groups.push({
                ...primaryGroup,
                isPrimary: true
            });
        }
    }
    
    // Récupérer les groupes supplémentaires depuis /etc/group
    if (!fileSystem['/etc/group']) {
        return groups;
    }
    
    const groupContent = fileSystem['/etc/group'].content;
    const lines = groupContent.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
        const [groupName, password, gid, members] = line.split(':');
        const membersList = members ? members.split(',').filter(m => m.trim()) : [];
        
        if (membersList.includes(username)) {
            const groupGid = parseInt(gid);
            // Éviter les doublons avec le groupe principal
            if (!groups.some(g => g.gid === groupGid)) {
                groups.push({
                    name: groupName,
                    password: password,
                    gid: groupGid,
                    members: membersList,
                    isPrimary: false
                });
            }
        }
    }
    
    return groups;
}

/**
 * Vérifie si un utilisateur existe
 * @param {string} username - Nom d'utilisateur
 * @param {Object} context - Contexte d'exécution
 * @returns {boolean} - true si l'utilisateur existe
 */
export function userExists(username, context) {
    return getUserInfo(username, context) !== null;
}

/**
 * Vérifie si un groupe existe
 * @param {string|number} groupIdentifier - Nom ou GID du groupe
 * @param {Object} context - Contexte d'exécution
 * @returns {boolean} - true si le groupe existe
 */
export function groupExists(groupIdentifier, context) {
    return getGroupInfo(groupIdentifier, context) !== null;
}

/**
 * Génère un nouvel UID libre
 * @param {Object} context - Contexte d'exécution
 * @param {number} minUid - UID minimum (défaut: 1000)
 * @returns {number} - Nouvel UID libre
 */
export function getNextAvailableUid(context, minUid = 1000) {
    const { fileSystem } = context;
    
    if (!fileSystem['/etc/passwd']) {
        return minUid;
    }
    
    const usedUids = new Set();
    const passwdContent = fileSystem['/etc/passwd'].content;
    const lines = passwdContent.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
        const fields = line.split(':');
        const uid = parseInt(fields[2]);
        if (!isNaN(uid)) {
            usedUids.add(uid);
        }
    }
    
    let uid = minUid;
    while (usedUids.has(uid)) {
        uid++;
    }
    
    return uid;
}

/**
 * Valide un nom d'utilisateur selon les conventions Unix
 * @param {string} username - Nom d'utilisateur à valider
 * @returns {boolean} - true si valide
 */
export function isValidUsername(username) {
    // Règles Unix standard:
    // - Commencer par une lettre ou underscore
    // - Contenir seulement lettres, chiffres, underscore, tiret
    // - Maximum 32 caractères
    // - Pas de caractères spéciaux
    const regex = /^[a-zA-Z_][a-zA-Z0-9_-]{0,31}$/;
    return regex.test(username);
}

/**
 * Valide un nom de groupe selon les conventions Unix
 * @param {string} groupname - Nom de groupe à valider
 * @returns {boolean} - true si valide
 */
export function isValidGroupname(groupname) {
    // Mêmes règles que pour les noms d'utilisateur
    const regex = /^[a-zA-Z_][a-zA-Z0-9_-]{0,31}$/;
    return regex.test(groupname);
}

/**
 * Nettoie et normalise un chemin
 * @param {string} path - Chemin à normaliser
 * @returns {string} - Chemin normalisé
 */
export function normalizePath(path) {
    // Supprimer les doubles slashes
    path = path.replace(/\/+/g, '/');
    
    // Supprimer le slash final sauf pour la racine
    if (path.length > 1 && path.endsWith('/')) {
        path = path.slice(0, -1);
    }
    
    return path;
}

/**
 * Formate une date au format YYYY-MM-DD depuis un timestamp
 * @param {number} timestamp - Timestamp en millisecondes
 * @returns {string} - Date formatée
 */
export function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toISOString().split('T')[0];
}

/**
 * Parse une date au format YYYY-MM-DD vers un timestamp
 * @param {string} dateString - Date au format YYYY-MM-DD
 * @returns {number|null} - Timestamp en millisecondes ou null si invalide
 */
export function parseDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return null;
    }
    return date.getTime();
}

/**
 * Vérifie si un chemin est absolu
 * @param {string} path - Chemin à vérifier
 * @returns {boolean} - true si le chemin est absolu
 */
export function isAbsolutePath(path) {
    return path.startsWith('/');
}

/**
 * Log une opération usermod pour audit (si activé)
 * @param {string} operation - Type d'opération
 * @param {string} username - Utilisateur modifié
 * @param {Object} changes - Détails des changements
 * @param {Object} context - Contexte d'exécution
 */
export function logUsermodOperation(operation, username, changes, context) {
    // Pour l'instant, logging simple dans la console
    // Dans une vraie implémentation, cela pourrait aller dans /var/log/auth.log
    const currentUser = context.currentUser;
    const timestamp = new Date().toISOString();
    
    console.log(`[${timestamp}] usermod: ${currentUser?.username || 'unknown'} performed ${operation} on user ${username}:`, changes);
}