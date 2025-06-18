// bin/sudo/utils.js - Fonctions utilitaires pour sudo

/**
 * Récupère un utilisateur depuis le context/filesystem
 * @param {string} username - Nom d'utilisateur
 * @param {Object} context - Contexte complet
 * @returns {Object|null} - Informations utilisateur ou null
 */
export function getUserFromContext(username, context) {
    const { fileSystem } = context;
    
    const passwdFile = fileSystem['/etc/passwd'];
    if (!passwdFile || passwdFile.type !== 'file') {
        return null;
    }

    const lines = passwdFile.content.split('\n');
    const userLine = lines.find(line => line.startsWith(username + ':'));
    if (!userLine) {
        return null;
    }

    const [user, , uid, gid, , home, shell] = userLine.split(':');
    
    // Récupérer les groupes depuis /etc/group
    const groups = getUserGroupsFromContext(username, context);
    
    return {
        username: user,
        uid: parseInt(uid),
        gid: parseInt(gid),
        home,
        shell,
        groups
    };
}

/**
 * Récupère les groupes d'un utilisateur depuis le context
 * @param {string} username - Nom d'utilisateur
 * @param {Object} context - Contexte complet
 * @returns {Array} - Liste des groupes
 */
export function getUserGroupsFromContext(username, context) {
    const { fileSystem } = context;
    const groups = [username]; // Groupe principal = nom utilisateur
    
    const groupFile = fileSystem['/etc/group'];
    if (!groupFile || groupFile.type !== 'file') {
        return groups;
    }

    const lines = groupFile.content.split('\n');
    lines.forEach(line => {
        const [groupName, , , members] = line.split(':');
        if (members && members.split(',').includes(username)) {
            groups.push(groupName);
        }
    });

    return groups;
}

/**
 * Échappe les caractères spéciaux dans les arguments shell
 * @param {string} arg - Argument à échapper
 * @returns {string} - Argument échappé
 */
export function escapeShellArg(arg) {
    if (!arg) return '';
    
    // Échapper les caractères spéciaux
    return arg.replace(/(["\s'$`\\])/g, '\\$1');
}

/**
 * Découpe une chaîne de commande en préservant les guillemets
 * @param {string} commandString - Chaîne de commande complète
 * @returns {Array} - Tableau des arguments
 */
export function splitCommand(commandString) {
    if (!commandString) return [];
    
    const result = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    let escaped = false;
    
    for (let i = 0; i < commandString.length; i++) {
        const char = commandString[i];
        
        if (escaped) {
            current += char;
            escaped = false;
            continue;
        }
        
        if (char === '\\') {
            escaped = true;
            continue;
        }
        
        if (inQuotes) {
            if (char === quoteChar) {
                inQuotes = false;
            } else {
                current += char;
            }
            continue;
        }
        
        if (char === '"' || char === "'") {
            inQuotes = true;
            quoteChar = char;
            continue;
        }
        
        if (char === ' ') {
            if (current) {
                result.push(current);
                current = '';
            }
            continue;
        }
        
        current += char;
    }
    
    if (current) {
        result.push(current);
    }
    
    return result;
}