// terminal.js - Module d'interface et d'affichage du terminal avec autocomplétion
// Gère l'interaction avec le DOM et l'affichage + vérification immédiate ancien mot de passe

import { getCurrentUser } from './users.js';

let terminal = null;
let commandInput = null;
let promptElement = null;

// État pour la saisie de mot de passe
let passwordMode = {
    active: false,
    step: 'current', // 'current' | 'password' | 'confirm'
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    username: '',
    requireOldPassword: false,
    verifyOldPasswordCallback: null, // Nouvelle fonction pour vérifier immédiatement
    callback: null,
    originalPrompt: ''
};

/**
 * Récupère les variables d'environnement pour le prompt
 * @param {Object} context - Contexte avec currentPath et variables
 * @returns {Object} - {user, hostname}
 */
function getEnvironmentVars(context = null) {
    const currentUser = getCurrentUser();
    let user = currentUser.username;
    let hostname = 'bash';
    
    if (context) {
        // Variables d'environnement (comme dans bash-variables.js)
        const envVars = {
            'HOME': currentUser.home,
            'PWD': context.currentPath || '/',
            'USER': currentUser.username,
            'SHELL': currentUser.shell,
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
 * Démarre le mode saisie de mot de passe
 * @param {string} username - Utilisateur pour qui changer le mot de passe
 * @param {boolean} requireOldPassword - Demander l'ancien mot de passe
 * @param {Function} verifyOldPasswordCallback - Fonction pour vérifier l'ancien mot de passe
 * @param {Function} callback - Fonction appelée avec (oldPassword, newPassword) en cas de succès
 */
export function startPasswordInput(username, requireOldPassword, verifyOldPasswordCallback, callback) {
    passwordMode.active = true;
    passwordMode.requireOldPassword = requireOldPassword;
    passwordMode.step = requireOldPassword ? 'current' : 'password';
    passwordMode.currentPassword = '';
    passwordMode.newPassword = '';
    passwordMode.confirmPassword = '';
    passwordMode.username = username;
    passwordMode.verifyOldPasswordCallback = verifyOldPasswordCallback;
    passwordMode.callback = callback;
    passwordMode.originalPrompt = promptElement.innerHTML;
    
    // Changer le prompt selon la première étape
    if (requireOldPassword) {
        promptElement.innerHTML = '<span style="color: #ff6b6b;">Mot de passe actuel:</span> ';
        addLine(`Changement du mot de passe pour '${username}'`, 'info');
    } else {
        promptElement.innerHTML = '<span style="color: #ffd43b;">Nouveau mot de passe:</span> ';
        addLine(`Changement du mot de passe pour '${username}'`, 'info');
    }
    
    // Vider l'input
    commandInput.value = '';
    commandInput.focus();
}

/**
 * Annule le mode saisie de mot de passe
 */
export function cancelPasswordInput() {
    if (passwordMode.active) {
        passwordMode.active = false;
        promptElement.innerHTML = passwordMode.originalPrompt;
        commandInput.value = '';
        addLine('Changement de mot de passe annulé', 'error');
    }
}

/**
 * Gère la saisie en mode mot de passe
 * @param {string} input - Texte saisi
 * @returns {boolean} - true si on reste en mode password, false si on sort
 */
export function handlePasswordInput(input) {
    if (!passwordMode.active) return false;
    
    if (passwordMode.step === 'current') {
        // Première étape : saisir l'ancien mot de passe
        passwordMode.currentPassword = input;
        
        // Afficher des * au lieu du mot de passe
        addLine(`Mot de passe actuel: ${'*'.repeat(input.length)}`, 'info');
        
        // VÉRIFICATION IMMÉDIATE de l'ancien mot de passe
        if (passwordMode.verifyOldPasswordCallback) {
            addLine(`[DEBUG] Vérification immédiate de l'ancien mot de passe...`, 'info');
            const isValid = passwordMode.verifyOldPasswordCallback(passwordMode.username, input);
            addLine(`[DEBUG] Résultat vérification: ${isValid}`, 'info');
            
            if (!isValid) {
                // ÉCHEC - ancien mot de passe incorrect
                addLine('', '');
                addLine('❌ Mot de passe actuel incorrect', 'error');
                addLine('passwd: Authentication failure', 'error');
                
                // Sortir du mode password et restaurer le prompt
                passwordMode.active = false;
                promptElement.innerHTML = passwordMode.originalPrompt;
                commandInput.value = '';
                
                return false; // Sortir du mode password
            }
        }
        
        // Si on arrive ici, l'ancien mot de passe est correct
        addLine(`[DEBUG] Ancien mot de passe validé, passage à l'étape suivante`, 'info');
        passwordMode.step = 'password';
        
        // Passer à la saisie du nouveau mot de passe
        promptElement.innerHTML = '<span style="color: #ffd43b;">Nouveau mot de passe:</span> ';
        commandInput.value = '';
        
        return true; // Rester en mode password
        
    } else if (passwordMode.step === 'password') {
        // Deuxième étape (ou première si pas d'ancien) : saisir le nouveau mot de passe
        passwordMode.newPassword = input;
        passwordMode.step = 'confirm';
        
        // Afficher des * au lieu du mot de passe
        addLine(`Nouveau mot de passe: ${'*'.repeat(input.length)}`, 'info');
        
        // Changer le prompt pour la confirmation
        promptElement.innerHTML = '<span style="color: #ffd43b;">Retapez le nouveau mot de passe:</span> ';
        commandInput.value = '';
        
        return true; // Rester en mode password
        
    } else if (passwordMode.step === 'confirm') {
        // Troisième étape : confirmer le mot de passe
        passwordMode.confirmPassword = input;
        
        // Afficher des * au lieu du mot de passe
        addLine(`Confirmation: ${'*'.repeat(input.length)}`, 'info');
        
        // Vérifier que les mots de passe correspondent
        if (passwordMode.newPassword === passwordMode.confirmPassword) {
            // Succès !
            const currentPassword = passwordMode.currentPassword;
            const newPassword = passwordMode.newPassword;
            const callback = passwordMode.callback;
            
            // Restaurer le prompt normal
            promptElement.innerHTML = passwordMode.originalPrompt;
            passwordMode.active = false;
            commandInput.value = '';
            
            // Appeler le callback avec l'ancien et le nouveau mot de passe
            if (callback) {
                callback(currentPassword, newPassword);
            }
            
        } else {
            // Échec - les mots de passe ne correspondent pas
            addLine('', '');
            addLine('❌ Les mots de passe ne correspondent pas', 'error');
            addLine('Veuillez recommencer...', 'error');
            
            // Recommencer depuis la saisie du nouveau mot de passe
            passwordMode.step = 'password';
            passwordMode.newPassword = '';
            passwordMode.confirmPassword = '';
            promptElement.innerHTML = '<span style="color: #ffd43b;">Nouveau mot de passe:</span> ';
            commandInput.value = '';
        }
        
        return passwordMode.active; // false si succès, true si on recommence
    }
    
    return false;
}

/**
 * Vérifie si on est en mode saisie mot de passe
 * @returns {boolean}
 */
export function isPasswordMode() {
    return passwordMode.active;
}

/**
 * Obtient les commandes disponibles pour l'autocomplétion
 * @returns {Array} - Liste des commandes
 */
function getAvailableCommands() {
    return ['help', 'ls', 'cd', 'mkdir', 'mv', 'rm', 'echo', 'pwd', 'cat', 'set', 'clear', 'reset', 'useradd', 'userdel', 'su', 'passwd', 'whoami', 'id', 'groups'];
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
        const currentUser = getCurrentUser();
        return currentUser.home;
    }
    
    if (path.startsWith('~/')) {
        const currentUser = getCurrentUser();
        return currentUser.home + path.substring(1);
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
            dirPath = resolvePathForCompletion(pathPart.substring(0, lastSlash), currentPath);
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
        // En mode password, seule la touche Escape est autorisée (pour annuler)
        if (passwordMode.active) {
            if (e.key === 'Escape') {
                e.preventDefault();
                cancelPasswordInput();
            }
            // Toutes les autres touches (flèches, tab) sont ignorées en mode password
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Tab') {
                e.preventDefault();
            }
            return;
        }
        
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