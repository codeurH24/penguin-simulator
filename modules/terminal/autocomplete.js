// modules/terminal/autocomplete.js
// Gestion de l'autocomplétion avec Tab

import { findCommonPrefix } from './utils.js';

/**
 * Gère l'autocomplétion avec Tab
 * @param {string} input - Texte d'entrée actuel
 * @param {Object} context - Contexte avec filesystem et commandes
 * @returns {Object} - {completed: string, suggestions: Array}
 */
export function handleTabCompletion(input, context) {
    if (!input.trim()) {
        return { completed: input, suggestions: [] };
    }

    const parts = input.split(' ');
    const lastPart = parts[parts.length - 1];

    // Premier argument = nom de commande
    if (parts.length === 1) {
        return completeCommand(lastPart, context);
    }

    // Arguments suivants = chemins/fichiers
    return completePath(input, parts, lastPart, context);
}

/**
 * Autocomplétion des noms de commandes
 * @param {string} partial - Début du nom de commande
 * @param {Object} context - Contexte avec commandes disponibles
 * @returns {Object} - Résultat de completion
 */
function completeCommand(partial, context) {
    const commands = getAvailableCommands(context);
    const matches = commands.filter(cmd => cmd.startsWith(partial));

    if (matches.length === 0) {
        return { completed: partial, suggestions: [] };
    }

    if (matches.length === 1) {
        return { completed: matches[0] + ' ', suggestions: [] };
    }

    const commonPrefix = findCommonPrefix(matches);
    return { 
        completed: commonPrefix, 
        suggestions: matches.length > 10 ? [] : matches 
    };
}

/**
 * Autocomplétion des chemins de fichiers
 * @param {string} input - Ligne de commande complète
 * @param {Array} parts - Parties de la commande
 * @param {string} pathPart - Partie du chemin à compléter
 * @param {Object} context - Contexte avec filesystem
 * @returns {Object} - Résultat de completion
 */
function completePath(input, parts, pathPart, context) {
    if (!context.filesystem) {
        return { completed: input, suggestions: [] };
    }

    // Déterminer le répertoire de base et le préfixe
    const lastSlash = pathPart.lastIndexOf('/');
    const dirPath = lastSlash >= 0 ? pathPart.substring(0, lastSlash + 1) : '';
    const prefix = lastSlash >= 0 ? pathPart.substring(lastSlash + 1) : pathPart;

    // Construire le chemin absolu du répertoire
    let searchDir;
    if (dirPath.startsWith('/')) {
        searchDir = dirPath || '/';
    } else {
        const currentPath = context.getCurrentPath ? context.getCurrentPath() : '/';
        searchDir = currentPath === '/' ? 
            (dirPath ? '/' + dirPath : '/') : 
            currentPath + '/' + dirPath;
    }

    // Obtenir les fichiers du répertoire
    const files = getDirectoryFiles(searchDir, context.filesystem);
    if (!files) {
        return { completed: input, suggestions: [] };
    }

    // Filtrer par préfixe
    const matches = files.filter(file => 
        file.toLowerCase().startsWith(prefix.toLowerCase())
    );

    if (matches.length === 0) {
        return { completed: input, suggestions: [] };
    }

    if (matches.length === 1) {
        const basePath = lastSlash >= 0 ? 
            pathPart.substring(0, lastSlash + 1) : '';
        const newInput = parts.slice(0, -1).concat([basePath + matches[0]]).join(' ');
        return { completed: newInput, suggestions: [] };
    }

    const commonPrefix = findCommonPrefix(matches);
    const basePath = lastSlash >= 0 ? pathPart.substring(0, lastSlash + 1) : '';
    const newLastPart = basePath + commonPrefix;
    const newInput = parts.slice(0, -1).concat([newLastPart]).join(' ');
    
    return { 
        completed: newInput, 
        suggestions: matches.length > 10 ? [] : matches 
    };
}

/**
 * Récupère les commandes disponibles
 * @param {Object} context - Contexte d'exécution
 * @returns {Array} - Liste des commandes
 */
function getAvailableCommands(context) {
    const builtins = ['cd', 'pwd', 'help', 'clear', 'reset', 'exit'];
    const binCommands = ['ls', 'rm', 'mkdir', 'mv', 'echo', 'cat', 'touch'];
    
    // Ajouter les commandes personnalisées si disponibles
    const customCommands = context.getCustomCommands ? 
        context.getCustomCommands() : [];
    
    return [...builtins, ...binCommands, ...customCommands].sort();
}

/**
 * Récupère les fichiers d'un répertoire pour l'autocomplétion
 * @param {string} dirPath - Chemin du répertoire
 * @param {Object} filesystem - Instance du système de fichiers
 * @returns {Array|null} - Liste des fichiers ou null si erreur
 */
function getDirectoryFiles(dirPath, filesystem) {
    try {
        const items = filesystem.listDirectory(dirPath);
        return items.map(item => {
            const name = item.split('/').pop();
            // Ajouter / pour les répertoires lors de l'affichage
            return filesystem.isDirectory(item) ? name + '/' : name;
        });
    } catch (error) {
        return null;
    }
}