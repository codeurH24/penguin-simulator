// terminal.js - Module d'interface et d'affichage du terminal avec autocomplétion
// Gère l'interaction avec le DOM et l'affichage

let terminal = null;
let commandInput = null;
let promptElement = null;

/**
 * Récupère les variables d'environnement pour le prompt
 * @param {Object} context - Contexte avec currentPath et variables
 * @returns {Object} - {user, hostname}
 */
function getEnvironmentVars(context = null) {
    let user = 'root';
    let hostname = 'bash';
    
    if (context) {
        // Variables d'environnement (comme dans bash.js)
        const envVars = {
            'HOME': '/root',
            'PWD': context.currentPath || '/',
            'USER': 'root',
            'SHELL': '/bin/bash',
            'HOSTNAME': 'bash',
            'PATH': '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
        };
        
        // Récupérer depuis les variables utilisateur d'abord, sinon depuis env
        const variables = context.variables || {};
        user = variables.USER || envVars.USER;
        hostname = variables.HOSTNAME || envVars.HOSTNAME;
    }
    
    return { user, hostname };
}

/**
 * Initialise les éléments DOM du terminal
 */
export function initTerminalElements() {
    terminal = document.getElementById('terminal');
    commandInput = document.getElementById('commandInput');
    promptElement = document.getElementById('prompt');

    if (!terminal || !commandInput || !promptElement) {
        throw new Error('Éléments DOM du terminal non trouvés');
    }

    // Focus automatique sur clic
    terminal.addEventListener('click', () => {
        commandInput.focus();
    });

    // Focus initial
    commandInput.focus();
}



/**
 * Obtient les commandes disponibles pour l'autocomplétion
 * @returns {Array} - Liste des commandes
 */
function getAvailableCommands() {
    return ['help', 'ls', 'cd', 'mkdir', 'mv', 'rm', 'echo', 'pwd', 'cat', 'set', 'clear', 'reset'];
}

/**
 * Obtient les fichiers/dossiers disponibles dans un répertoire
 * @param {string} dirPath - Chemin du répertoire
 * @param {Object} fileSystem - Système de fichiers
 * @returns {Array} - Liste des fichiers/dossiers
 */
function getAvailableFiles(dirPath, fileSystem) {
    if (!fileSystem) return [];
    
    const items = Object.keys(fileSystem).filter(path => {
        if (path === dirPath) return false;
        const prefix = dirPath === '/' ? '/' : dirPath + '/';
        if (!path.startsWith(prefix)) return false;
        const relativePath = path.substring(prefix.length);
        return !relativePath.includes('/');
    });

    return items.map(path => {
        const name = path.split('/').pop();
        const isDir = fileSystem[path].type === 'dir';
        return isDir ? name + '/' : name;
    }).sort();
}

/**
 * Résout un chemin pour l'autocomplétion
 * @param {string} path - Chemin à résoudre
 * @param {string} currentPath - Chemin courant
 * @returns {string} - Chemin résolu
 */
function resolvePathForCompletion(path, currentPath) {
    if (path.startsWith('/')) {
        return path;
    }
    
    if (path === '~') {
        return '/root';
    }
    
    if (path.startsWith('~/')) {
        return '/root' + path.substring(1);
    }
    
    // Chemin relatif
    if (currentPath === '/') {
        return '/' + path;
    }
    
    return currentPath + '/' + path;
}

/**
 * Gère l'autocomplétion avec Tab
 * @param {string} input - Texte actuel de l'input
 * @param {Object} context - Contexte avec fileSystem et currentPath
 * @returns {Object} - {completed: string, suggestions: Array}
 */
function handleTabCompletion(input, context) {
    const { fileSystem, currentPath } = context;
    const parts = input.split(' ');
    const lastPart = parts[parts.length - 1];
    
    console.log('Tab pressed, input:', input, 'lastPart:', lastPart); // Debug
    
    // Si c'est le premier mot, compléter les commandes
    if (parts.length === 1) {
        const commands = getAvailableCommands().filter(cmd => cmd.startsWith(lastPart));
        console.log('Commands found:', commands); // Debug
        
        if (commands.length === 1) {
            return { completed: commands[0] + ' ', suggestions: [] };
        } else if (commands.length > 1) {
            // Trouver le préfixe commun
            const commonPrefix = findCommonPrefix(commands);
            return { 
                completed: commonPrefix, 
                suggestions: commands.length > 10 ? [] : commands 
            };
        }
    } else {
        // Compléter les fichiers/dossiers
        const pathPart = lastPart;
        const lastSlash = pathPart.lastIndexOf('/');
        
        let dirPath, filePart;
        if (lastSlash >= 0) {
            dirPath = resolvePathForCompletion(pathPart.substring(0, lastSlash + 1), currentPath);
            filePart = pathPart.substring(lastSlash + 1);
        } else {
            dirPath = currentPath;
            filePart = pathPart;
        }
        
        const files = getAvailableFiles(dirPath, fileSystem).filter(file => 
            file.startsWith(filePart)
        );
        
        console.log('Files found:', files, 'in dir:', dirPath, 'filePart:', filePart); // Debug
        
        if (files.length === 1) {
            const basePath = lastSlash >= 0 ? pathPart.substring(0, lastSlash + 1) : '';
            const newInput = parts.slice(0, -1).concat([basePath + files[0]]).join(' ');
            return { completed: newInput, suggestions: [] };
        } else if (files.length > 1) {
            const commonPrefix = findCommonPrefix(files);
            const basePath = lastSlash >= 0 ? pathPart.substring(0, lastSlash + 1) : '';
            const newLastPart = basePath + commonPrefix;
            const newInput = parts.slice(0, -1).concat([newLastPart]).join(' ');
            
            return { 
                completed: newInput, 
                suggestions: files.length > 10 ? [] : files 
            };
        }
    }
    
    return { completed: input, suggestions: [] };
}

/**
 * Trouve le préfixe commun d'un tableau de chaînes
 * @param {Array} strings - Tableau de chaînes
 * @returns {string} - Préfixe commun
 */
function findCommonPrefix(strings) {
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
 * Ajoute une ligne de texte au terminal
 * @param {string} text - Texte à afficher
 * @param {string} className - Classe CSS optionnelle
 */
export function addLine(text, className = '') {
    if (!terminal) {
        console.error('Terminal non initialisé');
        return;
    }

    const line = document.createElement('div');
    line.className = `line ${className}`;
    line.textContent = text;

    const inputContainer = document.querySelector('.input-container');
    terminal.insertBefore(line, inputContainer);
    terminal.scrollTop = terminal.scrollHeight;
}

/**
 * Met à jour l'affichage du prompt avec couleurs Debian
 * @param {string} currentPath - Chemin courant à afficher
 * @param {Object} context - Contexte avec variables d'environnement (optionnel)
 */
export function updatePrompt(currentPath, context = null) {
    if (!promptElement) {
        console.error('Élément prompt non initialisé');
        return;
    }

    const { user, hostname } = getEnvironmentVars(context);
    const displayPath = currentPath === '/' ? '/' : currentPath;
    const promptSymbol = user === 'root' ? '#' : '$';
    
    // Créer le prompt avec HTML coloré style Debian
    promptElement.innerHTML = `<span style="color: #51cf66; font-weight: bold;">${user}@${hostname}</span><span style="color: #ffffff;">:</span><span style="color: #74c0fc; font-weight: bold;">${displayPath}</span><span style="color: #ffffff;">${promptSymbol}</span> `;
}

/**
 * Efface tout le contenu du terminal
 */
export function clearTerminal() {
    if (!terminal) {
        console.error('Terminal non initialisé');
        return;
    }

    const lines = terminal.querySelectorAll('.line');
    lines.forEach(line => line.remove());
}

/**
 * Récupère la valeur actuelle de l'input
 * @returns {string} - Commande tapée
 */
export function getCommandInput() {
    return commandInput ? commandInput.value.trim() : '';
}

/**
 * Vide l'input de commande
 */
export function clearCommandInput() {
    if (commandInput) {
        commandInput.value = '';
    }
}

/**
 * Définit la valeur de l'input de commande
 * @param {string} value - Valeur à définir
 */
export function setCommandInput(value) {
    if (commandInput) {
        commandInput.value = value;
    }
}

/**
 * Configure la gestion de l'historique des commandes et Tab
 * @param {Function} handleHistoryUp - Callback pour flèche haut
 * @param {Function} handleHistoryDown - Callback pour flèche bas
 * @param {Function} getContext - Fonction qui retourne le contexte actuel
 */
export function setupCommandHistory(handleHistoryUp, handleHistoryDown, getContext) {
    if (!commandInput) {
        console.error('Input de commande non initialisé');
        return;
    }

    commandInput.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            const newCommand = handleHistoryUp();
            if (newCommand !== undefined) {
                commandInput.value = newCommand;
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const newCommand = handleHistoryDown();
            if (newCommand !== undefined) {
                commandInput.value = newCommand;
            }
        } else if (e.key === 'Tab') {
            e.preventDefault(); // Empêcher le comportement par défaut de Tab
            
            const context = getContext();
            if (context && context.fileSystem && context.currentPath) {
                const currentInput = commandInput.value;
                const { completed, suggestions } = handleTabCompletion(currentInput, context);
                
                // Mettre à jour l'input
                commandInput.value = completed;
                
                // Afficher les suggestions s'il y en a plusieurs
                if (suggestions.length > 1) {
                    addLine(suggestions.join('  '), 'info');
                }
            } else {
                // Debug : afficher un message si le contexte n'est pas disponible
                console.log('Contexte non disponible pour autocomplétion', context);
            }
        }
    });
}

/**
 * Configure la gestion de la touche Entrée
 * @param {Function} onEnterPressed - Callback appelé quand Entrée est pressée
 */
export function setupEnterHandler(onEnterPressed) {
    if (!commandInput) {
        console.error('Input de commande non initialisé');
        return;
    }

    commandInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const command = commandInput.value.trim();
            onEnterPressed(command);
        }
    });
}

/**
 * Affiche le prompt avec la commande exécutée (style Debian)
 * @param {string} currentPath - Chemin courant
 * @param {string} command - Commande exécutée
 * @param {Object} context - Contexte avec variables d'environnement (optionnel)
 */
export function showCommandExecution(currentPath, command, context = null) {
    const { user, hostname } = getEnvironmentVars(context);
    const displayPath = currentPath === '/' ? '/' : currentPath;
    const promptSymbol = user === 'root' ? '#' : '$';
    
    // Créer la ligne avec le prompt coloré + commande
    const line = document.createElement('div');
    line.className = 'line';
    line.innerHTML = `<span style="color: #51cf66; font-weight: bold;">${user}@${hostname}</span><span style="color: #ffffff;">:</span><span style="color: #74c0fc; font-weight: bold;">${displayPath}</span><span style="color: #ffffff;">${promptSymbol} ${command}</span>`;
    
    const inputContainer = document.querySelector('.input-container');
    terminal.insertBefore(line, inputContainer);
    terminal.scrollTop = terminal.scrollHeight;
}

/**
 * Affiche un message d'aide formaté
 * @param {Array} helpLines - Lignes d'aide à afficher
 */
export function showHelp(helpLines) {
    helpLines.forEach(line => {
        addLine(line);
    });
}

/**
 * Affiche un message d'erreur
 * @param {string} message - Message d'erreur
 */
export function showError(message) {
    addLine(message, 'error');
}

/**
 * Affiche un message de succès
 * @param {string} message - Message de succès
 */
export function showSuccess(message) {
    addLine(message, 'prompt');
}

/**
 * Affiche un listing de fichiers/dossiers
 * @param {Array} items - Liste des éléments à afficher
 * @param {Function} isDirectory - Fonction pour tester si un élément est un dossier
 */
export function showListing(items, isDirectory) {
    if (items.length === 0) {
        addLine('(dossier vide)');
        return;
    }

    items.forEach(item => {
        const name = item.split('/').pop();
        if (isDirectory(item)) {
            addLine(name + '/', 'directory');
        } else {
            addLine(name);
        }
    });
}

/**
 * Vérifie si les éléments du terminal sont initialisés
 * @returns {boolean} - true si tout est initialisé
 */
export function isTerminalReady() {
    return terminal !== null && commandInput !== null && promptElement !== null;
}