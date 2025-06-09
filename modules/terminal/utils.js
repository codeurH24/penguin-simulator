// modules/terminal/utils.js
// Fonctions utilitaires pour le terminal

/**
 * Trouve le préfixe commun d'un tableau de chaînes
 * @param {Array} strings - Tableau de chaînes
 * @returns {string} - Préfixe commun
 */
export function findCommonPrefix(strings) {
    if (strings.length === 0) return '';
    if (strings.length === 1) return strings[0];
    
    let prefix = strings[0];
    for (let i = 1; i < strings.length; i++) {
        while (prefix && !strings[i].startsWith(prefix)) {
            prefix = prefix.slice(0, -1);
        }
    }
    return prefix;
}

/**
 * Échappe le HTML pour l'affichage sécurisé
 * @param {string} text - Texte à échapper
 * @returns {string} - Texte échappé
 */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Formate un chemin pour l'affichage (gère le chemin racine)
 * @param {string} path - Chemin à formater
 * @returns {string} - Chemin formaté
 */
export function formatPath(path) {
    if (!path || path === '/') return '/';
    return path.endsWith('/') ? path.slice(0, -1) : path;
}

/**
 * Parse une ligne de commande en arguments
 * @param {string} commandLine - Ligne de commande
 * @returns {Array} - Tableau d'arguments
 */
export function parseCommandLine(commandLine) {
    const args = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < commandLine.length; i++) {
        const char = commandLine[i];
        
        if (!inQuotes && (char === '"' || char === "'")) {
            inQuotes = true;
            quoteChar = char;
        } else if (inQuotes && char === quoteChar) {
            inQuotes = false;
            quoteChar = '';
        } else if (!inQuotes && char === ' ') {
            if (current) {
                args.push(current);
                current = '';
            }
        } else {
            current += char;
        }
    }
    
    if (current) {
        args.push(current);
    }
    
    return args;
}

/**
 * Normalise un chemin (résout . et ..)
 * @param {string} path - Chemin à normaliser
 * @returns {string} - Chemin normalisé
 */
export function normalizePath(path) {
    if (!path) return '/';
    
    const parts = path.split('/').filter(part => part !== '');
    const normalized = [];
    
    for (const part of parts) {
        if (part === '.') {
            continue;
        } else if (part === '..') {
            if (normalized.length > 0) {
                normalized.pop();
            }
        } else {
            normalized.push(part);
        }
    }
    
    return '/' + normalized.join('/');
}

/**
 * Vérifie si une chaîne est vide ou ne contient que des espaces
 * @param {string} str - Chaîne à vérifier
 * @returns {boolean} - true si vide
 */
export function isEmpty(str) {
    return !str || str.trim().length === 0;
}

/**
 * Tronque un texte si trop long
 * @param {string} text - Texte à tronquer
 * @param {number} maxLength - Longueur maximale
 * @returns {string} - Texte tronqué
 */
export function truncateText(text, maxLength = 80) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}