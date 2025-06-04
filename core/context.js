// context.js - Module de gestion du contexte d'exécution bash
// Gère de manière autonome tout ce qui concerne le contexte

import { getCurrentUser, initUserSystem } from '../modules/users.js';
import { updatePrompt, addLine } from '../modules/terminal.js';
import { saveData, loadData, isDBReady } from '../modules/storage.js';

// Variables globales internes au module
let fileSystem = {};
let currentPath = '/root';
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
 * Initialise le système de fichiers par défaut
 */
function initDefaultFileSystem() {
    fileSystem = {
        '/': createDirectoryEntry(),
        '/home': createDirectoryEntry(),
        '/root': createDirectoryEntry()
    };
}

/**
 * Fonction pour changer le répertoire courant
 * @param {string} newPath - Nouveau chemin
 */
function setCurrentPath(newPath) {
    const oldPath = currentPath;
    currentPath = newPath;
    
    // Mettre à jour OLDPWD
    if (!shellVariables) {
        shellVariables = {};
    }
    shellVariables.OLDPWD = oldPath;
    
    updatePrompt(currentPath, createContext());
}

/**
 * Fonction pour sauvegarder le système de fichiers
 * @returns {Promise<void>}
 */
async function saveFileSystem() {
    if (isDBReady()) {
        await saveData({ fileSystem, currentPath, variables: shellVariables });
    }
}

/**
 * Fonction pour charger le système de fichiers depuis IndexedDB
 * @returns {Promise<void>}
 */
async function loadFileSystem() {
    const data = await loadData();
    if (data) {
        fileSystem = data.fileSystem || {};
        currentPath = data.currentPath || '/root';
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
        // Première fois - initialiser le système de fichiers par défaut
        initDefaultFileSystem();
        initUserSystem(fileSystem);
        shellVariables.OLDPWD = currentPath;
        addLine('🆕 Nouveau système initialisé', 'prompt');
    }
}

/**
 * Crée le contexte pour l'exécution des commandes
 * Cette fonction est complètement autonome
 * @returns {Object} - Contexte complet pour l'exécution des commandes
 */
export function createContext() {
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

/**
 * Initialise le contexte (appelé au démarrage)
 * @returns {Promise<void>}
 */
export async function initContext() {
    const dbSuccess = await isDBReady();
    if (dbSuccess) {
        await loadFileSystem();
        addLine('💾 IndexedDB connecté - persistance activée', 'prompt');
    } else {
        // Si pas de DB, initialiser le système par défaut
        initDefaultFileSystem();
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
}

/**
 * Obtient le chemin courant (pour usage externe)
 * @returns {string} - Chemin courant
 */
export function getCurrentPath() {
    return currentPath;
}

/**
 * Obtient les variables du shell (pour usage externe)
 * @returns {Object} - Variables du shell
 */
export function getShellVariables() {
    return shellVariables;
}