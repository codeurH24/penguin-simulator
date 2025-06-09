// bin/bash.js - Shell bash et dispatcher de commandes avec gestion des redirections
// Shell principal avec architecture modulaire

import { addLine, showError } from '../modules/terminal/terminal.js';
import { cmdRm } from './rm.js';
import { cmdLs } from './ls.js';
import { cmdMkdir } from './mkdir.js';
import { cmdMv } from './mv.js';
import { cmdEcho } from './echo.js';
import { cmdCat } from './cat.js';
import { cmdUseradd } from './useradd.js';
import { cmdUserdel } from './userdel.js';
import { cmdSu } from './su.js';
import { cmdPasswd } from './passwd.js';
import { cmdWhoami, cmdId, cmdGroups } from './user-info.js';
import { cmdTouch } from './touch.js';
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
import { resolvePath } from '../modules/filesystem.js';

/**
 * Exécute une commande avec capture de sortie
 * @param {string} cmd - Nom de la commande
 * @param {Array} args - Arguments
 * @param {Object} context - Contexte d'exécution
 * @returns {string} - Sortie capturée
 */
function executeCommandWithCapture(cmd, args, context) {
    let output = '';
    
    const captureAddLine = (text) => {
        output += text;
    };
    
    const captureContext = {
        ...context,
        addLine: captureAddLine
    };
    
    if (!executeSingleCommand(cmd, args, captureContext, true)) {
        throw new Error(`bash: ${cmd}: commande introuvable`);
    }
    
    return output;
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
        case 'touch':
            cmdTouch(args, context);
            return true;
        case 'mv':
            cmdMv(args, context);
            return true;
        case 'rm':
            cmdRm(args, context);
            return true;
        case 'useradd':
            cmdUseradd(args, context);
            return true;
        case 'userdel':
            cmdUserdel(args, context);
            return true;
        case 'su':
            cmdSu(args, context);
            return true;
        case 'passwd':
            cmdPasswd(args, context);
            return true;
        case 'whoami':
            cmdWhoami(args, context);
            return true;
        case 'id':
            cmdId(args, context);
            return true;
        case 'groups':
            cmdGroups(args, context);
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
        // Parser la ligne de commande
        const parts = parseCommandLine(trimmedCommand);
        if (parts.length === 0) return;

        // Vérifier assignation de variable
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

        // Substituer les variables
        const substitutedArgs = substituteVariablesInArgs(args, context);

        // Valider les redirections (fonction n'accepte qu'un seul paramètre)
        const errors = validateRedirections(redirections);
        if (errors.length > 0) {
            errors.forEach(err => showError(err));
            return;
        }

        // Exécuter avec redirections si nécessaire
        if (redirections.output || redirections.append) {
            // Capturer la sortie
            const output = executeCommandWithCapture(cmd, substitutedArgs, context);
            
            // Écrire dans le fichier
            const fileName = redirections.output || redirections.append;
            const filePath = resolvePath(fileName, context.getCurrentPath());
            
            if (!context.fileSystem[filePath] || redirections.output) {
                // Créer ou écraser le fichier
                context.fileSystem[filePath] = {
                    type: 'file',
                    size: output.length,
                    content: output,
                    created: new Date(),
                    modified: new Date(),
                    accessed: new Date(),
                    permissions: '-rw-r--r--',
                    owner: 'root',
                    group: 'root',
                    links: 1
                };
            } else {
                // Append au fichier existant
                const file = context.fileSystem[filePath];
                file.content = (file.content || '') + output;
                file.size = file.content.length;
                file.modified = new Date();
            }
            
            context.saveFileSystem();
        } else {
            // Exécution normale
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
    const externals = ['ls', 'echo', 'cat', 'mkdir', 'mv', 'rm', 'touch', 'useradd', 'userdel', 'su', 'passwd', 'whoami', 'id', 'groups'];
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