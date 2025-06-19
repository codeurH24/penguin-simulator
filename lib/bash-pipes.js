// lib/bash-pipes.js - Gestion des pipes et pipelines bash
// Module pour analyser et exécuter des commandes avec pipes

import { parseCommandLine, parseRedirections } from './bash-parser.js';
import { substituteVariablesInArgs } from './bash-variables.js';

/**
 * Parse une ligne de commande avec des pipes
 * @param {string} command - Ligne de commande complète avec pipes
 * @returns {Array} - Tableau des commandes séparées par les pipes
 */
export function parsePipeline(command) {
    // Séparer par les pipes en tenant compte des guillemets
    const pipeline = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < command.length; i++) {
        const char = command[i];
        
        if (!inQuotes) {
            if (char === '"' || char === "'") {
                inQuotes = true;
                quoteChar = char;
                current += char;
            } else if (char === '|') {
                // Pipe trouvé - finaliser la commande courante
                if (current.trim()) {
                    pipeline.push(current.trim());
                }
                current = '';
            } else {
                current += char;
            }
        } else {
            current += char;
            if (char === quoteChar) {
                inQuotes = false;
                quoteChar = '';
            }
        }
    }
    
    // Ajouter la dernière commande
    if (current.trim()) {
        pipeline.push(current.trim());
    }
    
    return pipeline;
}

/**
 * Parse une commande individuelle dans un pipeline
 * @param {string} commandString - Commande à parser
 * @param {Object} context - Contexte d'exécution
 * @returns {Object} - {cmd, args, redirections}
 */
export function parseCommandInPipeline(commandString, context) {
    const parts = parseCommandLine(commandString);
    if (parts.length === 0) {
        return null;
    }

    const { command: cmdParts, redirections } = parseRedirections(parts);
    if (cmdParts.length === 0) {
        return null;
    }

    const cmd = cmdParts[0];
    let args = cmdParts.slice(1);
    args = substituteVariablesInArgs(args, context);

    return { cmd, args, redirections };
}

/**
 * Exécute un pipeline de commandes
 * @param {Array} pipeline - Tableau des commandes string
 * @param {Object} context - Contexte d'exécution 
 * @param {Function} cmdExecutor - Fonction pour exécuter une commande
 */
export function executePipeline(pipeline, context, cmdExecutor) {
    if (pipeline.length === 0) {
        return;
    }
    
    if (pipeline.length === 1) {
        // Une seule commande, pas de pipe
        const parsedCommand = parseCommandInPipeline(pipeline[0], context);
        if (parsedCommand) {
            cmdExecutor(parsedCommand.cmd, parsedCommand.args, context);
        }
        return;
    }
    
    // Plusieurs commandes avec pipes
    let currentOutput = '';
    
    for (let i = 0; i < pipeline.length; i++) {
        const isFirst = i === 0;
        const isLast = i === pipeline.length - 1;
        
        const commandString = pipeline[i];
        const parsedCommand = parseCommandInPipeline(commandString, context);
        
        if (!parsedCommand) {
            continue;
        }
        
        // Créer un contexte modifié pour cette commande
        const pipeContext = { ...context };
        let commandOutput = '';
        
        // Pour les commandes qui ne sont pas la dernière, capturer la sortie
        if (!isLast) {
            // Remplacer addLine pour capturer la sortie
            pipeContext.addLine = (text) => {
                commandOutput += text;
                if (!text.endsWith('\n')) {
                    commandOutput += '\n';
                }
            };
        }
        
        // Pour les commandes qui ne sont pas la première, passer l'entrée via stdin
        if (!isFirst) {
            pipeContext.stdin = currentOutput;
        }
        
        // Exécuter la commande
        cmdExecutor(parsedCommand.cmd, parsedCommand.args, pipeContext);
        
        // La sortie de cette commande devient l'entrée de la suivante
        if (!isLast) {
            currentOutput = commandOutput;
        }
    }
}

/**
 * Vérifie si une commande contient des pipes
 * @param {string} command - Commande à vérifier
 * @returns {boolean}
 */
export function hasPipes(command) {
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < command.length; i++) {
        const char = command[i];
        
        if (!inQuotes) {
            if (char === '"' || char === "'") {
                inQuotes = true;
                quoteChar = char;
            } else if (char === '|') {
                return true;
            }
        } else {
            if (char === quoteChar) {
                inQuotes = false;
                quoteChar = '';
            }
        }
    }
    
    return false;
}