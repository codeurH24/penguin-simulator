// lib/bash-parser.js - Parsing de lignes de commande et gestion des redirections
// Module pour analyser et traiter les commandes bash

import { resolvePath } from '../modules/filesystem.js';
import { showError } from '../modules/terminal/terminal.js';
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
    
    const fileName = redirections.output || redirections.append;
    const isAppend = !!redirections.append;
    
    if (!fileName) return context;
    
    const filePath = resolvePath(fileName, currentPath);
    
    // Fonction de capture qui écrit dans le fichier
    const captureAddLine = (text) => {
        // Créer le fichier s'il n'existe pas
        if (!fileSystem[filePath]) {
            fileSystem[filePath] = createFileEntry('');
        }
        
        const file = fileSystem[filePath];
        if (file.type !== 'file') {
            showError(`bash: ${fileName}: N'est pas un fichier`);
            return;
        }
        
        // Ajouter ou remplacer le contenu
        if (isAppend) {
            file.content = (file.content || '') + text + '\n';
        } else {
            file.content = text + '\n';
        }
        
        // Mettre à jour les métadonnées
        file.size = file.content.length;
        file.modified = new Date();
    };
    
    return {
        ...context,
        addLine: captureAddLine
    };
}

/**
 * Gère la redirection d'entrée
 * @param {Object} context - Contexte d'exécution
 * @param {Object} redirections - Redirections
 * @returns {Object} - Contexte modifié
 */
export function handleInputRedirection(context, redirections) {
    const { fileSystem, getCurrentPath } = context;
    const currentPath = getCurrentPath();
    
    const fileName = redirections.input;
    if (!fileName) return context;
    
    const filePath = resolvePath(fileName, currentPath);
    
    if (!fileSystem[filePath]) {
        showError(`bash: ${fileName}: Fichier introuvable`);
        return context;
    }
    
    const file = fileSystem[filePath];
    if (file.type !== 'file') {
        showError(`bash: ${fileName}: N'est pas un fichier`);
        return context;
    }
    
    // Mettre à jour la date d'accès
    file.accessed = new Date();
    
    return {
        ...context,
        inputData: file.content || ''
    };
}