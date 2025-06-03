// bin/bash-parser.js - Parsing de lignes de commande et gestion des redirections
// Module pour analyser et traiter les commandes bash

import { resolvePath } from '../modules/filesystem.js';
import { showError } from '../modules/terminal.js';
import { createFileEntry } from '../bin/mkdir.js';

/**
 * Parse une ligne de commande en tenant compte des guillemets et des redirections
 * @param {string} command - Ligne de commande complète
 * @returns {Array} - Tableau des parties parsées
 */
export function parseCommandLine(command) {
    const parts = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    let i = 0;
    
    while (i < command.length) {
        const char = command[i];
        
        if (!inQuotes) {
            if (char === '"' || char === "'") {
                // Début de guillemets
                inQuotes = true;
                quoteChar = char;
            } else if (char === ' ' || char === '\t') {
                // Espace - séparer les arguments
                if (current) {
                    parts.push(current);
                    current = '';
                }
            } else {
                // Caractère normal
                current += char;
            }
        } else {
            if (char === quoteChar) {
                // Fin de guillemets
                inQuotes = false;
                quoteChar = '';
            } else if (char === '\\' && i + 1 < command.length) {
                // Caractère d'échappement
                i++; // Skip le backslash
                const nextChar = command[i];
                if (nextChar === quoteChar || nextChar === '\\') {
                    current += nextChar;
                } else {
                    current += '\\' + nextChar;
                }
            } else {
                // Caractère dans les guillemets
                current += char;
            }
        }
        i++;
    }
    
    // Ajouter le dernier argument
    if (current) {
        parts.push(current);
    }
    
    // Erreur si guillemets non fermés
    if (inQuotes) {
        throw new Error(`bash: guillemets ${quoteChar} non fermés`);
    }
    
    return parts;
}

/**
 * Parse une commande pour extraire les redirections
 * @param {Array} parts - Parties de la commande
 * @returns {Object} - {command: Array, redirections: Array}
 */
export function parseRedirections(parts) {
    const command = [];
    const redirections = [];
    
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        
        if (part === '>' || part === '>>' || part === '<') {
            // Redirection avec le fichier dans la partie suivante
            if (i + 1 < parts.length) {
                redirections.push({
                    type: part,
                    file: parts[i + 1]
                });
                i++; // Skip le nom du fichier
            } else {
                throw new Error(`bash: erreur de syntaxe près du symbole inattendu '${part}'`);
            }
        } else if (part.startsWith('>') || part.startsWith('<')) {
            // Redirection collée au nom du fichier (ex: >file.txt)
            const type = part.startsWith('>>') ? '>>' : part[0];
            const file = part.substring(type.length);
            if (file) {
                redirections.push({ type, file });
            } else {
                throw new Error(`bash: erreur de syntaxe près du symbole inattendu '${type}'`);
            }
        } else {
            command.push(part);
        }
    }
    
    return { command, redirections };
}

/**
 * Gère une redirection de sortie (> ou >>)
 * @param {Object} redirection - {type: '>' | '>>', file: string}
 * @param {string} output - Contenu à écrire
 * @param {Object} context - Contexte d'exécution
 */
export function handleOutputRedirection(redirection, output, context) {
    const { fileSystem, currentPath, saveFileSystem } = context;
    const filePath = resolvePath(redirection.file, currentPath);
    
    let content;
    
    if (redirection.type === '>>') {
        // Append mode - ajouter au contenu existant
        if (fileSystem[filePath] && fileSystem[filePath].type === 'file') {
            const existingContent = fileSystem[filePath].content || '';
            content = existingContent + (existingContent && !existingContent.endsWith('\n') ? '\n' : '') + output + '\n';
        } else {
            content = output + '\n';
        }
    } else {
        // Overwrite mode - remplacer le contenu
        content = output + (output.endsWith('\n') ? '' : '\n');
    }
    
    // Créer ou mettre à jour le fichier
    if (fileSystem[filePath]) {
        if (fileSystem[filePath].type !== 'file') {
            showError(`bash: ${redirection.file}: N'est pas un fichier`);
            return;
        }
        // Mettre à jour le fichier existant
        fileSystem[filePath].content = content;
        fileSystem[filePath].size = content.length;
        fileSystem[filePath].modified = new Date();
    } else {
        // Créer un nouveau fichier
        fileSystem[filePath] = createFileEntry(content);
    }
    
    saveFileSystem();
}

/**
 * Gère une redirection d'entrée (<)
 * @param {Object} redirection - {type: '<', file: string}
 * @param {Object} context - Contexte d'exécution
 * @returns {string} - Contenu du fichier
 */
export function handleInputRedirection(redirection, context) {
    const { fileSystem, currentPath } = context;
    const filePath = resolvePath(redirection.file, currentPath);
    
    if (!fileSystem[filePath]) {
        throw new Error(`bash: ${redirection.file}: Fichier introuvable`);
    }
    
    if (fileSystem[filePath].type !== 'file') {
        throw new Error(`bash: ${redirection.file}: N'est pas un fichier`);
    }
    
    // Mettre à jour la date d'accès
    fileSystem[filePath].accessed = new Date();
    
    return fileSystem[filePath].content || '';
}

/**
 * Vérifie si les redirections sont valides pour une commande
 * @param {string} command - Nom de la commande
 * @param {Array} redirections - Liste des redirections
 * @returns {Object} - {valid: boolean, error: string}
 */
export function validateRedirections(command, redirections) {
    const inputRedirections = redirections.filter(r => r.type === '<');
    const outputRedirections = redirections.filter(r => r.type === '>' || r.type === '>>');
    
    // Pour l'instant, on ne gère l'entrée que pour cat
    if (inputRedirections.length > 0 && command !== 'cat') {
        return {
            valid: false,
            error: `bash: redirection d'entrée non supportée pour ${command}`
        };
    }
    
    // Vérifier qu'il n'y a pas plusieurs redirections d'entrée
    if (inputRedirections.length > 1) {
        return {
            valid: false,
            error: 'bash: plusieurs redirections d\'entrée non supportées'
        };
    }
    
    return { valid: true, error: null };
}

/**
 * Sépare les redirections par type
 * @param {Array} redirections - Liste des redirections
 * @returns {Object} - {input: Array, output: Array}
 */
export function separateRedirections(redirections) {
    return {
        input: redirections.filter(r => r.type === '<'),
        output: redirections.filter(r => r.type === '>' || r.type === '>>')
    };
}