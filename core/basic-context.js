// core/basic-context.js - Récupération basique du contexte depuis IndexedDB
import { loadData, saveData, isDBReady, openDB } from '../modules/storage.js';
import { initUserSystem, getCurrentUser } from '../modules/users/user.service.js';

/**
 * Ajoute les méthodes nécessaires au contexte
 * @param {Object} context - Contexte auquel ajouter les méthodes
 * @returns {Object} - Contexte avec méthodes ajoutées
 */
function addContextMethods(context) {
    context.getCurrentPath = function() {
        return context.currentPath;
    };

    context.setCurrentPath = function(newPath) {
        context.variables.OLDPWD = context.currentPath;
        context.currentPath = newPath;
    };

    context.saveFileSystem = function() {
        return saveContextToDB(context);
    };

    return context;
}

/**
 * Crée un contexte par défaut
 * @returns {Object} - Nouveau contexte avec structure de base
 */
function createDefaultContext() {
    const now = new Date();
    const dirEntry = {
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

    const context = {
        fileSystem: {
            '/': dirEntry,
            '/home': dirEntry,
            '/root': dirEntry,
            '/etc': dirEntry
        },
        currentPath: '/root',
        localVariables: {},
        sessionVariables: {},
        variables: { OLDPWD: '/root' },
        
        currentUser: getCurrentUser()
    };
    
    return addContextMethods(context);
}

/**
 * Crée un nouveau contexte et le sauvegarde dans IndexedDB
 * @returns {Promise<Object>} - Contexte créé et sauvegardé
 * @throws {Error} - Si impossible d'ouvrir la DB ou de sauvegarder
 */
export async function createAndSaveContext() {
    if (!isDBReady()) {
        await openDB();
    }
    
    const context = createDefaultContext();
    
    // Initialiser les fichiers système (passwd, shadow, group, etc.)
    initUserSystem(context.fileSystem, () => {});
    
    // Sauvegarder seulement les données, pas les méthodes
    const dataToSave = {
        fileSystem: context.fileSystem,
        currentPath: context.currentPath,
        variables: context.variables,
        currentUser: context.currentUser
    };
    
    const success = await saveData(dataToSave);
    
    if (!success) {
        throw new Error('Échec de la sauvegarde du contexte');
    }
    
    console.log('Nouveau contexte créé et sauvegardé');
    return context;
}

/**
 * Récupère un contexte depuis IndexedDB
 * @returns {Promise<Object|null>} - Contexte chargé ou null si pas trouvé
 * @throws {Error} - Si impossible d'ouvrir la DB
 */
export async function getContextFromDB() {
    if (!isDBReady()) {
        await openDB();
    }
    
    const data = await loadData();
    if (!data) {
        console.log('Aucune donnée trouvée dans IndexedDB');
        return null;
    }
    
    // Ajouter les méthodes au contexte récupéré
    addContextMethods(data);
    
    console.log('Contexte récupéré depuis IndexedDB:', data);
    return data;
}

/**
 * Sauvegarde un contexte dans IndexedDB  
 * @param {Object} context - Contexte à sauvegarder
 * @returns {Promise<boolean>} - true si sauvegarde réussie
 * @throws {Error} - Si impossible d'ouvrir la DB
 */
export async function saveContextToDB(context) {
    if (!isDBReady()) {
        await openDB();
    }
    
    // Sauvegarder seulement les données, pas les méthodes
    const dataToSave = {
        fileSystem: context.fileSystem,
        currentPath: context.currentPath,
        variables: context.variables,
        currentUser: context.currentUser
    };
    
    const success = await saveData(dataToSave);
    console.log('Sauvegarde contexte:', success ? 'réussie' : 'échouée');
    return success;
}