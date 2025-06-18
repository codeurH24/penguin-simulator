// bin/sudo/sudoersParser.js - Lecture et interprétation du fichier sudoers

/**
 * Parse le contenu du fichier sudoers
 * @param {string} content - Contenu du fichier sudoers
 * @returns {Object} - Structure de données représentant les règles
 */
export function parseSudoersFile(content) {
    if (!content) return { users: [], groups: [], defaults: {} };
    
    const lines = content.split('\n').filter(line => 
        line.trim() && !line.trim().startsWith('#')
    );
    
    const result = {
        users: [],    // Règles spécifiques aux utilisateurs
        groups: [],   // Règles de groupe
        defaults: {}  // Paramètres par défaut
    };
    
    lines.forEach(line => {
        line = line.trim();
        
        // Traiter les entrées Defaults
        if (line.startsWith('Defaults')) {
            parseDefaultsLine(line, result.defaults);
            return;
        }
        
        // Ignorer les commentaires et lignes vides
        if (!line || line.startsWith('#')) return;
        
        // Traiter les règles de groupe (commencent par %)
        if (line.startsWith('%')) {
            parseGroupRule(line, result.groups);
            return;
        }
        
        // Traiter les règles utilisateur
        parseUserRule(line, result.users);
    });
    
    return result;
}

/**
 * Charge les règles sudoers depuis le système de fichiers
 * @param {Object} context - Contexte complet
 * @returns {Object} - Structure de données représentant les règles
 */
export function getSudoersRules(context) {
    const { fileSystem } = context;
    
    const sudoersFile = fileSystem['/etc/sudoers'];
    if (!sudoersFile || !sudoersFile.content) {
        return { users: [], groups: [], defaults: {} };
    }
    
    return parseSudoersFile(sudoersFile.content);
}

/**
 * Obtient les privilèges d'un utilisateur spécifique
 * @param {string} username - Nom d'utilisateur
 * @param {Object} context - Contexte complet
 * @returns {Object} - Privilèges de l'utilisateur
 */
export function getUserPrivileges(username, context) {
    const { currentUser } = context;
    
    if (!currentUser || (username !== currentUser.username && currentUser.uid !== 0)) {
        return { canUseSudo: false, commands: [] };
    }
    
    const rules = getSudoersRules(context);
    
    // Vérifier les privilèges directs de l'utilisateur
    const userRules = rules.users.filter(rule => rule.user === username);
    
    // Vérifier les privilèges de groupe
    const userGroups = currentUser.groups || [];
    const groupRules = rules.groups.filter(rule => 
        userGroups.includes(rule.group)
    );
    
    const canUseSudo = userRules.length > 0 || groupRules.length > 0;
    
    // Rassembler toutes les commandes autorisées
    const commands = [];
    [...userRules, ...groupRules].forEach(rule => {
        if (rule.commands.includes('ALL')) {
            commands.push('ALL');
        } else {
            commands.push(...rule.commands);
        }
    });
    
    return {
        canUseSudo,
        commands: [...new Set(commands)] // Dédupliquer
    };
}

/**
 * Parse une ligne de paramètres par défaut
 * @param {string} line - Ligne à analyser
 * @param {Object} defaults - Objet à remplir
 */
function parseDefaultsLine(line, defaults) {
    // Format: Defaults paramName=value
    const match = line.match(/^Defaults\s+(.+)$/);
    if (!match) return;
    
    const params = match[1].split(',').map(p => p.trim());
    params.forEach(param => {
        if (param.includes('=')) {
            const [name, value] = param.split('=').map(p => p.trim());
            defaults[name] = value;
        } else {
            defaults[param] = true;
        }
    });
}

/**
 * Parse une règle de groupe
 * @param {string} line - Ligne à analyser
 * @param {Array} groups - Tableau de règles de groupe à compléter
 */
function parseGroupRule(line, groups) {
    // Format: %group ALL=(ALL:ALL) ALL
    const parts = line.split(/\s+/);
    if (parts.length < 2) return;
    
    const groupName = parts[0].substring(1); // Enlever le %
    
    let hosts = 'ALL';
    let runAs = 'ALL';
    let commands = ['ALL'];
    
    // Analyse simplifiée pour l'instant
    groups.push({
        group: groupName,
        hosts,
        runAs,
        commands
    });
}

/**
 * Parse une règle utilisateur
 * @param {string} line - Ligne à analyser
 * @param {Array} users - Tableau de règles utilisateur à compléter
 */
function parseUserRule(line, users) {
    // Format: user ALL=(ALL:ALL) ALL
    const parts = line.split(/\s+/);
    if (parts.length < 2) return;
    
    const username = parts[0];
    
    let hosts = 'ALL';
    let runAs = 'ALL';
    let commands = ['ALL'];
    
    // Analyse simplifiée pour l'instant
    users.push({
        user: username,
        hosts,
        runAs,
        commands
    });
}