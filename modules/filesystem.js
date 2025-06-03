// filesystem.js - Module de gestion des chemins et du système de fichiers
// Module 100% indépendant pour la manipulation des chemins

/**
 * Résout un chemin relatif ou absolu en fonction du répertoire courant
 * @param {string} path - Chemin à résoudre
 * @param {string} currentPath - Répertoire courant
 * @returns {string} - Chemin absolu résolu
 */
export function resolvePath(path, currentPath = '/') {
    if (path.startsWith('/')) {
        // Chemin absolu - normaliser directement
        return normalizePath(path);
    }

    if (path === '.') {
        return currentPath;
    }

    if (path === '..') {
        if (currentPath === '/') return '/';
        const parts = currentPath.split('/').filter(p => p);
        parts.pop();
        return '/' + parts.join('/');
    }

    // Chemin relatif
    let fullPath = currentPath;
    if (fullPath !== '/') fullPath += '/';
    fullPath += path;

    return normalizePath(fullPath);
}

/**
 * Normalise un chemin en gérant les '.' et '..' 
 * @param {string} path - Chemin à normaliser
 * @returns {string} - Chemin normalisé
 */
export function normalizePath(path) {
    // Normaliser le chemin (gérer .. et .)
    const parts = path.split('/').filter(p => p);
    const normalized = [];

    for (const part of parts) {
        if (part === '..') {
            normalized.pop();
        } else if (part !== '.') {
            normalized.push(part);
        }
    }

    const result = '/' + normalized.join('/');
    return result === '' ? '/' : result;
}

/**
 * Extrait le nom du fichier/dossier depuis un chemin
 * @param {string} path - Chemin complet
 * @returns {string} - Nom du fichier/dossier
 */
export function getBasename(path) {
    if (path === '/') return '/';
    return path.split('/').pop() || '/';
}

/**
 * Extrait le répertoire parent depuis un chemin
 * @param {string} path - Chemin complet
 * @returns {string} - Chemin du répertoire parent
 */
export function getDirname(path) {
    if (path === '/') return '/';
    const parts = path.split('/');
    parts.pop();
    const result = parts.join('/');
    return result === '' ? '/' : result;
}

/**
 * Joint plusieurs segments de chemin
 * @param {...string} segments - Segments à joindre
 * @returns {string} - Chemin joint et normalisé
 */
export function joinPath(...segments) {
    const joined = segments
        .filter(segment => segment)
        .join('/')
        .replace(/\/+/g, '/'); // Supprimer les // multiples
    
    return normalizePath(joined.startsWith('/') ? joined : '/' + joined);
}

/**
 * Vérifie si un chemin est un sous-chemin d'un autre
 * @param {string} childPath - Chemin enfant potentiel
 * @param {string} parentPath - Chemin parent potentiel
 * @returns {boolean} - true si childPath est un sous-chemin de parentPath
 */
export function isSubPath(childPath, parentPath) {
    const normalizedChild = normalizePath(childPath);
    const normalizedParent = normalizePath(parentPath);
    
    if (normalizedParent === '/') {
        return normalizedChild !== '/';
    }
    
    return normalizedChild.startsWith(normalizedParent + '/');
}

/**
 * Calcule le chemin relatif d'un fichier par rapport à un répertoire
 * @param {string} fromPath - Répertoire de référence
 * @param {string} toPath - Chemin cible
 * @returns {string} - Chemin relatif
 */
export function getRelativePath(fromPath, toPath) {
    const from = normalizePath(fromPath).split('/').filter(p => p);
    const to = normalizePath(toPath).split('/').filter(p => p);
    
    // Trouver la base commune
    let commonLength = 0;
    while (commonLength < from.length && 
           commonLength < to.length && 
           from[commonLength] === to[commonLength]) {
        commonLength++;
    }
    
    // Calculer le nombre de '../' nécessaires
    const upSteps = from.length - commonLength;
    const downSteps = to.slice(commonLength);
    
    const relativeParts = Array(upSteps).fill('..').concat(downSteps);
    
    return relativeParts.length === 0 ? '.' : relativeParts.join('/');
}