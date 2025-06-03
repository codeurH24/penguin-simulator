import { initDB, saveData, loadData, isDBReady } from './modules/storage.js';
import { 
    initTerminalElements, 
    addLine, 
    updatePrompt, 
    setupCommandHistory,
    setupEnterHandler,
    showCommandExecution,
    clearCommandInput,
    isTerminalReady
} from './modules/terminal.js';
import { executeCommand as execCommand } from './bin/bash.js';

// Variables globales
let fileSystem = {
    '/': createDirectoryEntry(),
    '/home': createDirectoryEntry(),
    '/root': createDirectoryEntry()
};

let currentPath = '/root';
const commandHistory = [];
let historyIndex = -1;
let shellVariables = {}; // Variables du shell

/**
 * Crée une entrée de répertoire avec de vraies métadonnées
 * @returns {Object} - Objet répertoire avec métadonnées
 */
function createDirectoryEntry() {
    const now = new Date();
    return {
        type: 'dir',
        size: 4096,
        created: now,
        modified: now,
        accessed: now,
        permissions: 'drwxr-xr-x',
        owner: 'root',
        group: 'root',
        links: 2
    };
}

/**
 * Crée le contexte pour les variables d'environnement
 * @returns {Object} - Contexte avec variables d'environnement
 */
function createContext() {
    return {
        fileSystem,
        currentPath,
        setCurrentPath,
        saveFileSystem,
        variables: shellVariables
    };
}

// Fonction pour sauvegarder le système de fichiers
async function saveFileSystem() {
    if (isDBReady()) {
        await saveData({ fileSystem, currentPath, variables: shellVariables });
    }
}

// Fonction pour charger le système de fichiers
async function loadFileSystem() {
    const data = await loadData();
    if (data) {
        fileSystem = data.fileSystem;
        currentPath = data.currentPath;
        shellVariables = data.variables || {};
        updatePrompt(currentPath, createContext());
        addLine('📂 Données restaurées depuis la dernière session', 'prompt');
    }
}

// Fonction pour changer le répertoire courant
function setCurrentPath(newPath) {
    currentPath = newPath;
    updatePrompt(currentPath, createContext());
}

// Fonction pour exécuter une commande
function executeCommand(command) {
    const context = createContext();
    showCommandExecution(currentPath, command, context);

    // Déléguer l'exécution au module commands
    execCommand(command, context);
}

// Fonction pour naviguer vers le haut dans l'historique
function handleHistoryUp() {
    if (historyIndex > 0) {
        historyIndex--;
        return commandHistory[historyIndex];
    }
    return undefined;
}

// Fonction pour naviguer vers le bas dans l'historique
function handleHistoryDown() {
    if (historyIndex < commandHistory.length - 1) {
        historyIndex++;
        return commandHistory[historyIndex];
    } else {
        historyIndex = commandHistory.length;
        return '';
    }
}

// Fonction pour gérer l'appui sur Entrée
function handleEnterPressed(command) {
    if (command) {
        commandHistory.push(command);
        historyIndex = commandHistory.length;
        executeCommand(command);
    }
    clearCommandInput();
}

// Initialisation asynchrone
async function initTerminal() {
    // Initialiser les éléments DOM du terminal
    try {
        initTerminalElements();
    } catch (error) {
        console.error('Erreur initialisation terminal:', error);
        return;
    }

    updatePrompt(currentPath, createContext());

    // Configurer les gestionnaires d'événements
    setupCommandHistory(handleHistoryUp, handleHistoryDown);
    setupEnterHandler(handleEnterPressed);

    // Initialiser la base de données
    const dbSuccess = await initDB();
    if (dbSuccess) {
        await loadFileSystem();
        addLine('💾 IndexedDB connecté - persistance activée', 'prompt');
    } else {
        addLine('⚠️ IndexedDB indisponible - mode mémoire', 'error');
    }
    
    // Message de bienvenue
    addLine('🐧 Terminal Linux simulé - Debian-style bash shell', 'prompt');
    addLine('Connecté en tant que root@bash', 'prompt');
    addLine('Tapez "help" pour voir les commandes disponibles', 'prompt');
}

// Lancer l'initialisation
initTerminal();