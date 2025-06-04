// terminal.js - Module d'interface et d'affichage du terminal
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
 * Configure la gestion de l'historique des commandes
 * @param {Function} handleHistoryUp - Callback pour flèche haut
 * @param {Function} handleHistoryDown - Callback pour flèche bas
 */
export function setupCommandHistory(handleHistoryUp, handleHistoryDown) {
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