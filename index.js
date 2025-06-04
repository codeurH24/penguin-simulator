import { initDB, saveData, loadData, isDBReady } from './modules/storage.js';
import { initUserSystem, getCurrentUser } from './modules/users.js';
import { 
    initTerminalElements, 
    addLine, 
    updatePrompt, 
    setupCommandHistory,
    setupEnterHandler,
    showCommandExecution,
    clearCommandInput,
    isTerminalReady,
    isPasswordMode,
    handlePasswordInput
} from './modules/terminal.js';
import { executeCommand as execCommand } from './bin/bash.js';
import { initOldPwd } from './lib/bash-variables.js';

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
 * @returns {Object} - Contexte avec variables d'environnement et informations utilisateur
 */
function createContext() {
    const currentUser = getCurrentUser();
    return {
        fileSystem,
        currentPath,
        setCurrentPath,
        saveFileSystem,
        variables: shellVariables,
        currentUser
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
        
        // S'assurer qu'OLDPWD est initialisé après le chargement
        if (!shellVariables.OLDPWD) {
            shellVariables.OLDPWD = currentPath;
        }
        
        // IMPORTANT: S'assurer que les fichiers système existent après le chargement
        if (!fileSystem['/etc/passwd']) {
            console.log('Fichiers système manquants après chargement, re-initialisation...');
            initUserSystem(fileSystem);
        }
        
        updatePrompt(currentPath, createContext());
        addLine('📂 Données restaurées depuis la dernière session', 'prompt');
    } else {
        // Première fois - initialiser les fichiers système et OLDPWD
        initUserSystem(fileSystem);
        shellVariables.OLDPWD = currentPath;
        addLine('🆕 Nouveau système initialisé', 'prompt');
    }
}

// Fonction pour changer le répertoire courant
function setCurrentPath(newPath) {
    const oldPath = currentPath;
    currentPath = newPath;
    
    // Mettre à jour OLDPWD
    shellVariables.OLDPWD = oldPath;
    
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

// Initialisation asynchrone
async function initTerminal() {
    // Initialiser les éléments DOM du terminal
    try {
        initTerminalElements();
    } catch (error) {
        console.error('Erreur initialisation terminal:', error);
        return;
    }

    // Initialiser la base de données AVANT tout
    const dbSuccess = await initDB();
    if (dbSuccess) {
        await loadFileSystem(); // Ceci va aussi initialiser les fichiers système si nécessaire
        addLine('💾 IndexedDB connecté - persistance activée', 'prompt');
    } else {
        // Si pas de DB, initialiser quand même les fichiers système et OLDPWD
        initUserSystem(fileSystem);
        shellVariables.OLDPWD = currentPath;
        addLine('⚠️ IndexedDB indisponible - mode mémoire', 'error');
    }
    
    // Vérification finale que les fichiers système existent
    if (!fileSystem['/etc/passwd']) {
        console.error('ERREUR: /etc/passwd manquant, re-initialisation forcée');
        initUserSystem(fileSystem);
    }
    
    // S'assurer qu'OLDPWD est toujours initialisé
    if (!shellVariables.OLDPWD) {
        shellVariables.OLDPWD = currentPath;
    }
    
    addLine('👥 Système d\'utilisateurs prêt', 'prompt');
    
    // Configurer le prompt et les gestionnaires d'événements
    updatePrompt(currentPath, createContext());
    setupCommandHistory(handleHistoryUp, handleHistoryDown, createContext);
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
    console.log('Fichiers système créés:', {
        passwd: !!fileSystem['/etc/passwd'],
        shadow: !!fileSystem['/etc/shadow'],
        group: !!fileSystem['/etc/group']
    });
    
    console.log('Variables shell initialisées:', shellVariables);
}

// Lancer l'initialisation
initTerminal();