// bin/bash.js - Shell bash et dispatcher de commandes avec gestion des redirections
// Déplacé depuis modules/commands.js - contenu identique + redirections

import { resolvePath, getDirname } from '../modules/filesystem.js';
import { addLine, showError, showSuccess, clearTerminal } from '../modules/terminal.js';
import { cmdRm } from './rm.js';
import { cmdLs } from './ls.js';
import { cmdMkdir, createFileEntry } from './mkdir.js';
import { cmdMv } from './mv.js';
import { cmdEcho } from './echo.js';
import { cmdCat } from './cat.js';

/**
 * Commande help - Affiche l'aide
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte
 */
export function cmdHelp(args, context) {
    const outputFn = context?.addLine || addLine;
    
    outputFn('Commandes disponibles:');
    outputFn('  ls          - Lister le contenu');
    outputFn('  cd [dir]    - Changer de dossier (~ = home, cd = retour home)');
    outputFn('  mkdir [-p] <dir> - Créer un dossier (-p: créer parents)');
    outputFn('  mv <src> <dest> - Déplacer/renommer');
    outputFn('  rm [-r] [-f] <files> - Supprimer (-r: récursif, -f: forcer)');
    outputFn('  echo <text> - Afficher du texte');
    outputFn('  pwd         - Afficher le chemin');
    outputFn('  set         - Afficher les variables');
    outputFn('  clear       - Vider le terminal');
    outputFn('  reset       - Réinitialiser');
    outputFn('  cat <file>  - Afficher le contenu d\'un fichier');
    outputFn('');
    outputFn('Redirections:');
    outputFn('  cmd > file  - Rediriger la sortie vers un fichier');
    outputFn('  cmd >> file - Ajouter la sortie à un fichier');
    outputFn('  cat < file  - Lire depuis un fichier');
    outputFn('');
    outputFn('Variables:');
    outputFn('  var=value   - Définir une variable');
    outputFn('  $var        - Utiliser une variable');
    outputFn('  $HOME $PWD  - Variables d\'environnement');
    outputFn('');
    outputFn('Exemples:');
    outputFn('  cd ~        - Aller au répertoire home');
    outputFn('  echo "test" > file.txt  - Créer un fichier');
    outputFn('  ls -la      - Listing détaillé avec fichiers cachés');
}

/**
 * Commande cd - Change de répertoire
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, currentPath, setCurrentPath, saveFileSystem)
 */
export function cmdCd(args, context) {
    const { fileSystem, currentPath, setCurrentPath, saveFileSystem } = context;
    
    if (args.length === 0) {
        setCurrentPath('/root');
        saveFileSystem();
        return;
    }

    // Gérer l'alias ~ pour le répertoire home
    let targetArg = args[0];
    if (targetArg === '~') {
        targetArg = '/root';
    } else if (targetArg.startsWith('~/')) {
        targetArg = '/root' + targetArg.substring(1);
    }

    const targetPath = resolvePath(targetArg, currentPath);
    
    if (!fileSystem[targetPath]) {
        showError(`cd: ${args[0]}: Dossier introuvable`);
        return;
    }
    
    if (fileSystem[targetPath].type !== 'dir') {
        showError(`cd: ${args[0]}: N'est pas un dossier`);
        return;
    }

    setCurrentPath(targetPath);
    saveFileSystem();
}

/**
 * Commande pwd - Affiche le répertoire courant
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (currentPath)
 */
export function cmdPwd(args, context) {
    const { currentPath } = context;
    const outputFn = context?.addLine || addLine;
    outputFn(currentPath);
}

/**
 * Commande set - Affiche les variables définies
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (variables)
 */
export function cmdSet(args, context) {
    const { variables = {}, currentPath } = context;
    const outputFn = context?.addLine || addLine;
    
    // Variables d'environnement
    const envVars = {
        'HOME': '/root',
        'PWD': currentPath,
        'USER': 'root',
        'SHELL': '/bin/bash',
        'PATH': '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
    };
    
    // Afficher les variables d'environnement
    outputFn('Variables d\'environnement:');
    Object.entries(envVars).forEach(([name, value]) => {
        outputFn(`${name}=${value}`);
    });
    
    // Afficher les variables utilisateur
    if (Object.keys(variables).length > 0) {
        outputFn('');
        outputFn('Variables utilisateur:');
        Object.entries(variables).forEach(([name, value]) => {
            outputFn(`${name}=${value}`);
        });
    }
}

/**
 * Commande clear - Efface le terminal
 */
export function cmdClear() {
    clearTerminal();
}

/**
 * Commande reset - Réinitialise le système de fichiers
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, setCurrentPath, saveFileSystem, variables)
 */
export function cmdReset(args, context) {
    const { fileSystem, setCurrentPath, saveFileSystem, variables } = context;
    
    // Réinitialiser le système de fichiers avec vraies métadonnées
    Object.keys(fileSystem).forEach(key => delete fileSystem[key]);
    
    const now = new Date();
    const createDir = () => ({
        type: 'dir',
        size: 4096,
        created: now,
        modified: now,
        accessed: now,
        permissions: 'drwxr-xr-x',
        owner: 'root',
        group: 'root',
        links: 2
    });
    
    fileSystem['/'] = createDir();
    fileSystem['/home'] = createDir();
    fileSystem['/root'] = createDir();
    
    // Réinitialiser les variables
    if (variables) {
        Object.keys(variables).forEach(key => delete variables[key]);
    }
    
    setCurrentPath('/root');
    saveFileSystem();
    showSuccess('🔄 Système de fichiers et variables réinitialisés');
}

/**
 * Gère l'assignation de variables (var=value)
 * @param {string} assignment - Assignation (format var=value)
 * @param {Object} context - Contexte d'exécution
 */
function handleVariableAssignment(assignment, context) {
    const [varName, ...valueParts] = assignment.split('=');
    const value = valueParts.join('='); // Rejoindre au cas où la valeur contient des =
    
    if (!varName) {
        showError('bash: assignation de variable invalide');
        return;
    }
    
    // Stocker la variable dans le contexte
    if (!context.variables) {
        context.variables = {};
    }
    
    context.variables[varName] = value;
    // Pas de sortie pour les assignations de variables (comme le vrai bash)
}

/**
 * Substitue les variables dans un argument ($var, ${var})
 * @param {string} arg - Argument pouvant contenir des variables
 * @param {Object} context - Contexte contenant les variables
 * @returns {string} - Argument avec variables substituées
 */
function substituteVariables(arg, context) {
    if (!arg.includes('$')) {
        return arg; // Pas de variable, retourner tel quel
    }
    
    const variables = context.variables || {};
    
    // Variables d'environnement prédéfinies (mises à jour dynamiquement)
    const envVars = {
        'HOME': '/root',
        'PWD': context.currentPath,
        'USER': 'root',
        'SHELL': '/bin/bash',
        'PATH': '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
    };
    
    let result = arg;
    
    // Substituer les variables ${var} (format complet)
    result = result.replace(/\$\{([^}]+)\}/g, (match, varName) => {
        return variables[varName] || envVars[varName] || '';
    });
    
    // Substituer les variables $var (format simple)
    result = result.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, varName) => {
        return variables[varName] || envVars[varName] || '';
    });
    
    return result;
}

/**
 * Parse une ligne de commande en tenant compte des guillemets et des redirections
 * @param {string} command - Ligne de commande complète
 * @returns {Array} - Tableau des parties parsées
 */
function parseCommandLine(command) {
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
function parseRedirections(parts) {
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
        // Dispatcher vers la bonne commande
        switch (cmd) {
            case 'help':
                cmdHelp(args, captureContext);
                break;
            case 'ls':
                cmdLs(args, captureContext);
                break;
            case 'echo':
                cmdEcho(args, captureContext);
                break;
            case 'pwd':
                cmdPwd(args, captureContext);
                break;
            case 'set':
                cmdSet(args, captureContext);
                break;
            case 'cat':
                cmdCat(args, captureContext);
                break;
            default:
                throw new Error(`bash: ${cmd}: commande introuvable`);
        }
    } catch (error) {
        throw error;
    }
    
    // Enlever le dernier \n s'il existe
    return output.replace(/\n$/, '');
}

/**
 * Gère une redirection de sortie (> ou >>)
 * @param {Object} redirection - {type: '>' | '>>', file: string}
 * @param {string} output - Contenu à écrire
 * @param {Object} context - Contexte d'exécution
 */
function handleOutputRedirection(redirection, output, context) {
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
function handleInputRedirection(redirection, context) {
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
 * Fonction principale pour exécuter une commande
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
        if (parts.length === 1 && parts[0].includes('=')) {
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
        const substitutedArgs = args.map(arg => substituteVariables(arg, context));

        // Gérer les redirections d'entrée (< peut modifier le comportement de certaines commandes)
        const inputRedirections = redirections.filter(r => r.type === '<');
        const outputRedirections = redirections.filter(r => r.type === '>' || r.type === '>>');
        
        // Pour l'instant, on ne gère l'entrée que pour cat
        if (inputRedirections.length > 0 && cmd !== 'cat') {
            showError(`bash: redirection d'entrée non supportée pour ${cmd}`);
            return;
        }

        // Exécuter la commande
        if (outputRedirections.length > 0) {
            // Commande avec redirection de sortie - capturer la sortie
            const output = executeCommandWithCapture(cmd, substitutedArgs, context);
            
            // Appliquer les redirections de sortie
            outputRedirections.forEach(redirection => {
                handleOutputRedirection(redirection, output, context);
            });
        } else {
            // Commande normale - dispatcher vers la bonne commande
            switch (cmd) {
                case 'help':
                    cmdHelp(substitutedArgs, context);
                    break;
                case 'ls':
                    cmdLs(substitutedArgs, context);
                    break;
                case 'cd':
                    cmdCd(substitutedArgs, context);
                    break;
                case 'mkdir':
                    cmdMkdir(substitutedArgs, context);
                    break;
                case 'mv':
                    cmdMv(substitutedArgs, context);
                    break;
                case 'rm':
                    cmdRm(substitutedArgs, context);
                    break;
                case 'echo':
                    cmdEcho(substitutedArgs, context);
                    break;
                case 'pwd':
                    cmdPwd(substitutedArgs, context);
                    break;
                case 'cat':
                    cmdCat(substitutedArgs, context);
                    break;
                case 'set':
                    cmdSet(substitutedArgs, context);
                    break;
                case 'clear':
                    cmdClear();
                    break;
                case 'reset':
                    cmdReset(substitutedArgs, context);
                    break;
                default:
                    showError(`bash: ${cmd}: commande introuvable`);
            }
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
    return ['help', 'ls', 'cd', 'mkdir', 'mv', 'rm', 'echo', 'pwd', 'cat', 'set', 'clear', 'reset'];
}

/**
 * Vérifie si une commande existe
 * @param {string} command - Nom de la commande
 * @returns {boolean} - true si la commande existe
 */
export function commandExists(command) {
    return getAvailableCommands().includes(command);
}