// lib/bash-parser.js - Parsing de lignes de commande et gestion des redirections
// Module pour analyser et traiter les commandes bash

import { resolvePath } from '../modules/filesystem.js';

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
 * Parse les redirections dans une commande
 * @param {Array} parts - Parties de la commande
 * @returns {Object} - {command: Array, redirections: Object}
 */
export function parseRedirections(parts) {
    const command = [];
    const redirections = {
        output: null,
        append: null,
        input: null
    };
    
    let i = 0;
    while (i < parts.length) {
        const part = parts[i];
        
        if (part === '>' || part === '1>') {
            // Redirection de sortie
            if (i + 1 >= parts.length) {
                throw new Error('bash: erreur de syntaxe près du symbole inattendu `newline\'');
            }
            redirections.output = parts[i + 1];
            i += 2; // Skip l'opérateur et le fichier
        } else if (part === '>>' || part === '1>>') {
            // Redirection d'ajout
            if (i + 1 >= parts.length) {
                throw new Error('bash: erreur de syntaxe près du symbole inattendu `newline\'');
            }
            redirections.append = parts[i + 1];
            i += 2;
        } else if (part === '<' || part === '0<') {
            // Redirection d'entrée
            if (i + 1 >= parts.length) {
                throw new Error('bash: erreur de syntaxe près du symbole inattendu `newline\'');
            }
            redirections.input = parts[i + 1];
            i += 2;
        } else if (part.includes('>') || part.includes('<')) {
            // Redirection attachée (ex: echo test>file.txt)
            const redirMatch = part.match(/^(.*)([><]+)(.*)$/);
            if (redirMatch) {
                const [, before, operator, after] = redirMatch;
                
                if (before) command.push(before);
                
                if (operator === '>' || operator === '1>') {
                    redirections.output = after || parts[i + 1];
                    if (!after) i++; // Fichier au prochain argument
                } else if (operator === '>>' || operator === '1>>') {
                    redirections.append = after || parts[i + 1];
                    if (!after) i++;
                } else if (operator === '<' || operator === '0<') {
                    redirections.input = after || parts[i + 1];
                    if (!after) i++;
                }
                i++;
            } else {
                command.push(part);
                i++;
            }
        } else {
            command.push(part);
            i++;
        }
    }
    
    return { command, redirections };
}

/**
 * Valide les redirections
 * @param {Object} redirections - Objet redirections
 * @returns {Array} - Liste des erreurs
 */
export function validateRedirections(redirections) {
    const errors = [];
    
    // Vérifier les conflits
    if (redirections.output && redirections.append) {
        errors.push('bash: erreur de syntaxe: redirections multiples de sortie');
    }
    
    // Vérifier les noms de fichier vides
    if (redirections.output === '') {
        errors.push('bash: erreur de syntaxe: nom de fichier vide pour redirection');
    }
    if (redirections.append === '') {
        errors.push('bash: erreur de syntaxe: nom de fichier vide pour redirection');
    }
    if (redirections.input === '') {
        errors.push('bash: erreur de syntaxe: nom de fichier vide pour redirection');
    }
    
    return errors;
}

/**
 * Sépare les redirections du reste de la commande
 * @param {Array} args - Arguments de la commande
 * @returns {Object} - {args: Array, redirections: Object}
 */
export function separateRedirections(args) {
    const cleanArgs = [];
    const redirections = {
        output: null,
        append: null,
        input: null
    };
    
    let i = 0;
    while (i < args.length) {
        const arg = args[i];
        
        if (arg === '>' || arg === '1>') {
            redirections.output = args[i + 1];
            i += 2;
        } else if (arg === '>>' || arg === '1>>') {
            redirections.append = args[i + 1];
            i += 2;
        } else if (arg === '<' || arg === '0<') {
            redirections.input = args[i + 1];
            i += 2;
        } else {
            cleanArgs.push(arg);
            i++;
        }
    }
    
    return { args: cleanArgs, redirections };
}

/**
 * Gère la redirection de sortie
 * @param {Object} context - Contexte d'exécution
 * @param {Object} redirections - Redirections
 * @returns {Object} - Contexte modifié
 */
export function handleOutputRedirection(context, redirections) {
    const { fileSystem, getCurrentPath } = context;
    const currentPath = getCurrentPath();

    const term = context.terminal;
    const showError = context?.showError || (str => { term.write(`${str}\r\n`) });
    
    const fileName = redirections.output || redirections.append;
    const isAppend = !!redirections.append;
    
    if (!fileName) {
        return context;
    }
    
    const filePath = resolvePath(currentPath, fileName);
    
    // Créer ou modifier le fichier de sortie
    const existingFile = fileSystem[filePath];
    let content = '';
    
    if (existingFile && existingFile.type === 'file' && isAppend) {
        content = existingFile.content || '';
    }
    
    // Créer un contexte modifié qui capture la sortie
    const modifiedContext = {
        ...context,
        outputBuffer: content,
        addLine: (text) => {
            modifiedContext.outputBuffer += text + '\n';
        },
        write: (text) => {
            modifiedContext.outputBuffer += text;
        }
    };
    
    return modifiedContext;
}

// ===== NOUVELLES FONCTIONS POUR BRACE EXPANSION =====

/**
 * Expand brace expressions comme {a,b,c} ou {src/{css,js},docs}
 * @param {string} pattern - Pattern avec des braces à développer
 * @returns {Array} - Tableau des chemins développés
 */
export function expandBraces(pattern) {
    // Si pas de braces, retourner le pattern tel quel
    if (!pattern.includes('{') || !pattern.includes('}')) {
        return [pattern];
    }
    
    // Trouver la première paire de braces EN TENANT COMPTE DE L'IMBRICATION
    const openIndex = pattern.indexOf('{');
    if (openIndex === -1) {
        return [pattern];
    }
    
    // Trouver la brace fermante correspondante
    let closeIndex = -1;
    let braceLevel = 0;
    for (let i = openIndex; i < pattern.length; i++) {
        if (pattern[i] === '{') {
            braceLevel++;
        } else if (pattern[i] === '}') {
            braceLevel--;
            if (braceLevel === 0) {
                closeIndex = i;
                break;
            }
        }
    }
    
    if (closeIndex === -1) {
        return [pattern];
    }
    
    // Extraire les parties
    const prefix = pattern.substring(0, openIndex);
    const suffix = pattern.substring(closeIndex + 1);
    const braceContent = pattern.substring(openIndex + 1, closeIndex);
    
    // Séparer les options dans les braces
    const options = splitBraceContent(braceContent);
    
    // Générer toutes les combinaisons
    const results = [];
    for (const option of options) {
        const newPattern = prefix + option + suffix;
        // Récursion pour traiter les braces imbriquées
        const expanded = expandBraces(newPattern);
        results.push(...expanded);
    }
    
    return results;
}

/**
 * Sépare le contenu des braces en tenant compte de l'imbrication
 * @param {string} content - Contenu entre les braces
 * @returns {Array} - Tableau des options séparées
 */
function splitBraceContent(content) {
    const options = [];
    let current = '';
    let braceLevel = 0;
    let i = 0;
    
    while (i < content.length) {
        const char = content[i];
        
        if (char === '{') {
            braceLevel++;
            current += char;
        } else if (char === '}') {
            braceLevel--;
            current += char;
        } else if (char === ',' && braceLevel === 0) {
            // Virgule au niveau 0 = séparateur d'options
            if (current.trim()) {
                options.push(current.trim());
            }
            current = '';
        } else {
            current += char;
        }
        i++;
    }
    
    // Ajouter la dernière option
    if (current.trim()) {
        options.push(current.trim());
    }
    
    return options;
}

/**
 * Expand tous les arguments avec brace expansion
 * @param {Array} args - Arguments à développer
 * @returns {Array} - Arguments développés
 */
export function expandAllBraces(args) {
    const expandedArgs = [];
    
    for (const arg of args) {
        const expanded = expandBraces(arg);
        expandedArgs.push(...expanded);
    }
    
    return expandedArgs;
}