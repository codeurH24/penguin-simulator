// bin/bash.js - Shell bash et dispatcher de commandes avec gestion des redirections
// Shell principal avec architecture modulaire

import { addLine, showError } from '../modules/terminal.js';
import { cmdRm } from './rm.js';
import { cmdLs } from './ls.js';
import { cmdMkdir } from './mkdir.js';
import { cmdMv } from './mv.js';
import { cmdEcho } from './echo.js';
import { cmdCat } from './cat.js';
import { 
    executeBuiltin, 
    isBuiltinCommand,
    getBuiltinCommands 
} from '../lib/bash-builtins.js';
import { 
    handleVariableAssignment, 
    substituteVariablesInArgs,
    isVariableAssignment 
} from '../lib/bash-variables.js';
import { 
    parseCommandLine, 
    parseRedirections,
    handleOutputRedirection,
    handleInputRedirection,
    validateRedirections,
    separateRedirections 
} from '../lib/bash-parser.js';

/**
 * Exécute une commande avec capture de sortie
 * @param {string} cmd - Nom de la commande
 * @param {Array} args - Arguments
 * @param {Object} context - Contexte d'exécution
 * @returns {string} - Sortie capturée
 */
function executeCommandWithCapture(cmd, args, context) {
    let output = '';
    
    // Fonction de capture qui accumule la sortie
    const captureAddLine = (text) => {
        output += text + '\n';
    };
    
    // Créer un contexte temporaire avec la fonction de capture
    const captureContext = {
        ...context,
        addLine: captureAddLine
    };
    
    try {
        // Exécuter la commande
        if (!executeSingleCommand(cmd, args, captureContext, true)) {
            throw new Error(`bash: ${cmd}: commande introuvable`);
        }
    } catch (error) {
        throw error;
    }
    
    // Enlever le dernier \n s'il existe
    return output.replace(/\n$/, '');
}

/**
 * Exécute une commande (builtin ou externe)
 * @param {string} cmd - Nom de la commande
 * @param {Array} args - Arguments
 * @param {Object} context - Contexte d'exécution
 * @param {boolean} suppressError - Ne pas afficher l'erreur si commande introuvable
 * @returns {boolean} - true si la commande a été exécutée avec succès
 */
function executeSingleCommand(cmd, args, context, suppressError = false) {
    // Essayer d'abord les builtins
    if (isBuiltinCommand(cmd)) {
        executeBuiltin(cmd, args, context);
        return true;
    }
    
    // Puis les commandes externes
    switch (cmd) {
        case 'ls':
            cmdLs(args, context);
            return true;
        case 'echo':
            cmdEcho(args, context);
            return true;
        case 'cat':
            cmdCat(args, context);
            return true;
        case 'mkdir':
            cmdMkdir(args, context);
            return true;
        case 'mv':
            cmdMv(args, context);
            return true;
        case 'rm':
            cmdRm(args, context);
            return true;
        default:
            if (!suppressError) {
                showError(`bash: ${cmd}: commande introuvable`);
            }
            return false;
    }
}

/**
 * Fonction principale pour exécuter une commande complète
 * @param {string} command - Commande complète à exécuter
 * @param {Object} context - Contexte d'exécution
 */
export function executeCommand(command, context) {
    const trimmedCommand = command.trim();
    if (!trimmedCommand) return;

    try {
        // Parser la ligne de commande avec gestion des guillemets
        const parts = parseCommandLine(trimmedCommand);
        if (parts.length === 0) return;

        // Vérifier si c'est une assignation de variable (var=value)
        if (parts.length === 1 && isVariableAssignment(parts[0])) {
            handleVariableAssignment(parts[0], context);
            return;
        }

        // Parser les redirections
        const { command: cmdParts, redirections } = parseRedirections(parts);
        
        if (cmdParts.length === 0) {
            showError('bash: commande manquante');
            return;
        }
        
        const cmd = cmdParts[0];
        const args = cmdParts.slice(1);

        // Substituer les variables dans les arguments
        const substitutedArgs = substituteVariablesInArgs(args, context);

        // Valider les redirections
        const validation = validateRedirections(cmd, redirections);
        if (!validation.valid) {
            showError(validation.error);
            return;
        }

        // Séparer les redirections
        const { input: inputRedirections, output: outputRedirections } = separateRedirections(redirections);

        // Exécuter la commande
        if (outputRedirections.length > 0) {
            // Commande avec redirection de sortie - capturer la sortie
            const output = executeCommandWithCapture(cmd, substitutedArgs, context);
            
            // Appliquer les redirections de sortie
            outputRedirections.forEach(redirection => {
                handleOutputRedirection(redirection, output, context);
            });
        } else {
            // Commande normale
            executeSingleCommand(cmd, substitutedArgs, context);
        }
        
    } catch (error) {
        showError(error.message);
    }
}

/**
 * Obtient la liste de toutes les commandes disponibles
 * @returns {Array} - Liste des commandes disponibles
 */
export function getAvailableCommands() {
    const builtins = getBuiltinCommands();
    const externals = ['ls', 'echo', 'cat', 'mkdir', 'mv', 'rm'];
    return [...builtins, ...externals];
}

/**
 * Vérifie si une commande existe
 * @param {string} command - Nom de la commande
 * @returns {boolean} - true si la commande existe
 */
export function commandExists(command) {
    return getAvailableCommands().includes(command);
}