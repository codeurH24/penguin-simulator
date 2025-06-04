import { initDB } from './modules/storage.js';
import { getCurrentUser } from './modules/users.js';
import { 
    initTerminalElements, 
    addLine, 
    updatePrompt, 
    setupCommandHistory,
    setupEnterHandler,
    showCommandExecution,
    clearCommandInput,
    isPasswordMode,
    handlePasswordInput
} from './modules/terminal.js';
import { executeCommand as execCommand } from './bin/bash.js';
import { createContext, initContext, getCurrentPath } from './core/context.js';

// Variables locales pour l'historique des commandes
const commandHistory = [];
let historyIndex = -1;

/**
 * Fonction pour exécuter une commande
 * @param {string} command - Commande à exécuter
 */
function executeCommand(command) {
    const context = createContext();
    showCommandExecution(getCurrentPath(), command, context);

    // Déléguer l'exécution au module commands
    execCommand(command, context);
}

/**
 * Fonction pour naviguer vers le haut dans l'historique
 * @returns {string|undefined} - Commande précédente ou undefined
 */
function handleHistoryUp() {
    if (historyIndex > 0) {
        historyIndex--;
        return commandHistory[historyIndex];
    }
    return undefined;
}

/**
 * Fonction pour naviguer vers le bas dans l'historique
 * @returns {string} - Commande suivante ou chaîne vide
 */
function handleHistoryDown() {
    if (historyIndex < commandHistory.length - 1) {
        historyIndex++;
        return commandHistory[historyIndex];
    } else {
        historyIndex = commandHistory.length;
        return '';
    }
}

/**
 * Fonction pour gérer l'appui sur Entrée
 * @param {string} command - Commande tapée
 */
function handleEnterPressed(command) {
    // Vérifier si on est en mode saisie de mot de passe
    if (isPasswordMode()) {
        // Gérer la saisie du mot de passe
        const continuePasswordMode = handlePasswordInput(command);
        
        // Vider l'input dans tous les cas
        clearCommandInput();
        
        // Si on sort du mode password, on ne fait rien de plus
        // Si on reste en mode password, on attend la prochaine saisie
        return;
    }
    
    // Mode normal : exécuter la commande
    if (command) {
        commandHistory.push(command);
        historyIndex = commandHistory.length;
        executeCommand(command);
    }
    clearCommandInput();
}

/**
 * Fonction qui retourne le contexte actuel (pour l'autocomplétion)
 * @returns {Object} - Contexte actuel
 */
function getContextForCompletion() {
    return createContext();
}

/**
 * Initialisation asynchrone du terminal
 */
async function initTerminal() {
    // Initialiser les éléments DOM du terminal
    try {
        initTerminalElements();
    } catch (error) {
        console.error('Erreur initialisation terminal:', error);
        return;
    }

    // Initialiser la base de données AVANT tout
    await initDB();
    
    // Initialiser le contexte (gère tout en interne)
    await initContext();
    
    addLine('👥 Système d\'utilisateurs prêt', 'prompt');
    
    // Configurer le prompt et les gestionnaires d'événements
    updatePrompt(getCurrentPath(), createContext());
    setupCommandHistory(handleHistoryUp, handleHistoryDown, getContextForCompletion);
    setupEnterHandler(handleEnterPressed);
    
    // Message de bienvenue
    addLine('🐧 Terminal Linux simulé - Debian-style bash shell', 'prompt');
    const currentUser = getCurrentUser();
    addLine(`Connecté en tant que ${currentUser.username}@bash`, 'prompt');
    addLine('Tapez "help" pour voir les commandes disponibles', 'prompt');
    addLine('', '');
    addLine('💡 Astuce: en mode passwd, tapez votre mot de passe et appuyez sur Entrée', 'info');
    addLine('   Utilisez Échap pour annuler la saisie de mot de passe', 'info');
    
    // Debug: vérifier que les fichiers système sont bien là
    const context = createContext();
    console.log('Fichiers système créés:', {
        passwd: !!context.fileSystem['/etc/passwd'],
        shadow: !!context.fileSystem['/etc/shadow'],
        group: !!context.fileSystem['/etc/group']
    });
}

// Lancer l'initialisation
initTerminal();