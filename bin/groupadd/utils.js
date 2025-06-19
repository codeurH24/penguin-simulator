// bin/groupadd/utils.js - Utilitaires pour la commande groupadd

/**
 * Vérifie si l'utilisateur actuel a les droits root
 * @param {Object} currentUser - Utilisateur actuel
 * @returns {boolean} - true si l'utilisateur est root
 */
export function requiresRootAccess(currentUser) {
    return currentUser && currentUser.uid === 0;
}

/**
 * Vérifie si un utilisateur peut administrer les groupes
 * @param {Object} currentUser - Utilisateur actuel
 * @returns {boolean} - true si l'utilisateur peut administrer
 */
export function canAdministerGroups(currentUser) {
    if (!currentUser) return false;
    
    // root peut toujours administrer
    if (currentUser.uid === 0) return true;
    
    // Vérifier si l'utilisateur est dans le groupe admin/sudo
    if (currentUser.groups) {
        return currentUser.groups.includes('admin') || 
               currentUser.groups.includes('sudo');
    }
    
    return false;
}

/**
 * Formate un GID pour l'affichage
 * @param {number} gid - GID à formater
 * @returns {string} - GID formaté
 */
export function formatGid(gid) {
    return gid.toString().padStart(4, ' ');
}

/**
 * Formate le nom d'un groupe pour l'affichage
 * @param {string} groupName - Nom du groupe
 * @param {number} maxLength - Longueur maximale
 * @returns {string} - Nom formaté
 */
export function formatGroupName(groupName, maxLength = 20) {
    if (groupName.length <= maxLength) {
        return groupName.padEnd(maxLength, ' ');
    }
    return groupName.substring(0, maxLength - 3) + '...';
}

/**
 * Valide qu'un GID est dans une plage acceptable
 * @param {number} gid - GID à valider
 * @param {boolean} isSystem - true si c'est un groupe système
 * @returns {Object} - Résultat de validation
 */
export function validateGidRange(gid, isSystem = false) {
    const result = { isValid: false, error: '' };
    
    if (typeof gid !== 'number' || isNaN(gid)) {
        result.error = 'GID doit être un nombre';
        return result;
    }
    
    if (gid < 0) {
        result.error = 'GID ne peut pas être négatif';
        return result;
    }
    
    if (gid > 65535) {
        result.error = 'GID ne peut pas dépasser 65535';
        return result;
    }
    
    // Avertissements pour les plages non conventionnelles
    if (isSystem) {
        if (gid < 100 || gid > 999) {
            result.warning = `GID ${gid} est en dehors de la plage système recommandée (100-999)`;
        }
    } else {
        if (gid < 1000) {
            result.warning = `GID ${gid} est en dessous de la plage utilisateur recommandée (>=1000)`;
        }
    }
    
    result.isValid = true;
    return result;
}

/**
 * Génère un message d'aide contextuel
 * @param {string} error - Message d'erreur
 * @returns {string} - Message d'aide
 */
export function getContextualHelp(error) {
    const helpMap = {
        'nom de groupe manquant': 'Spécifiez un nom de groupe. Exemple: groupadd developers',
        'existe déjà': 'Le groupe existe déjà. Utilisez --force pour ignorer cette erreur.',
        'GID invalide': 'Le GID doit être un nombre entre 0 et 65535.',
        'nom de groupe invalide': 'Le nom doit commencer par une lettre ou _, contenir seulement a-z, 0-9, _, -',
        'GID déjà utilisé': 'Ce GID est déjà attribué à un autre groupe. Choisissez un autre GID.',
        'opération non permise': 'Seul root peut créer des groupes. Utilisez sudo groupadd.'
    };
    
    for (const [key, help] of Object.entries(helpMap)) {
        if (error.includes(key)) {
            return help;
        }
    }
    
    return 'Utilisez "groupadd --help" pour plus d\'informations.';
}

/**
 * Convertit les options en format lisible
 * @param {Object} options - Options de la commande
 * @returns {string} - Options formatées
 */
export function formatOptions(options) {
    const parts = [];
    
    if (options.gid !== undefined) {
        parts.push(`GID: ${options.gid}`);
    }
    
    if (options.system) {
        parts.push('groupe système');
    }
    
    if (options.force) {
        parts.push('mode forcé');
    }
    
    return parts.length > 0 ? `(${parts.join(', ')})` : '';
}

/**
 * Log les actions pour le debugging
 * @param {string} action - Action effectuée
 * @param {string} groupName - Nom du groupe
 * @param {Object} options - Options utilisées
 */
export function logGroupAction(action, groupName, options = {}) {
    if (typeof console !== 'undefined' && console.debug) {
        const optionsStr = formatOptions(options);
        console.debug(`[groupadd] ${action}: ${groupName} ${optionsStr}`.trim());
    }
}