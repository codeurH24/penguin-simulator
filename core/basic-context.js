// modules/filesystem/file-entries.js

import { createDirEntry } from '../modules/filesystem/file-entries.js';
import { loadData, saveData, isDBReady, openDB } from '../modules/storage.js';
import { initUserSystem, getCurrentUser } from '../modules/users/user.service.js';

/**
 * Ajoute les méthodes nécessaires au contexte
 * @param {Object} context - Contexte auquel ajouter les méthodes
 * @returns {Object} - Contexte avec méthodes ajoutées
 */
export function addContextMethods(context) {
    context.getCurrentPath = function () {
        return context.currentPath;
    };

    context.setCurrentPath = function (newPath) {
        context.variables.OLDPWD = context.currentPath;
        context.currentPath = newPath;
    };

    context.saveFileSystem = function () {
        // Capturer l'état avant sauvegarde pour le logging
        if (context.terminal?.terminalService?.fileSystemLogger) {
            const logger = context.terminal.terminalService.fileSystemLogger;
            if (logger.originalFileSystem && logger.isActive) {
                logger.compareAndLog(
                    logger.originalFileSystem, 
                    context.fileSystem,
                    {
                        user: context.currentUser?.username || 'unknown',
                        workingDirectory: context.getCurrentPath() || '/',
                        command: context.terminal?.terminalService?.inputStr || null
                    }
                );
                // Mettre à jour l'état de référence
                logger.originalFileSystem = logger.deepClone(context.fileSystem);
            }
        }
        
        return saveContextToDB(context);
    };

    return context;
}

/**
 * Crée un contexte par défaut avec permissions réalistes Linux utilisant FileSystemService
 * @returns {Object} - Nouveau contexte avec structure de base
 */
export function createDefaultContext() {
    const context = {
        fileSystem: {},
        currentPath: '/root',
        localVariables: {},
        sessionVariables: {},
        variables: { OLDPWD: '/root', PWD: '/root', USER: 'root', UID: 0, HOSTNAME: 'bash', HOME: '/root' },
        currentUser: {
            username: 'root',
            uid: 0,
            gid: 0,
            home: '/root',
            shell: '/bin/bash',
            groups: ['root']
        }
    };

    try {
        // Créer les répertoires système de base avec permissions réalistes Linux

        // 1. Racine du système (/) - accessible à tous (755)
        const rootEntry = createDirEntry('root', 'root', 'drwxr-xr-x');
        context.fileSystem['/'] = rootEntry;

        // 2. Répertoire /home - accessible à tous pour traverser (755)
        const homeEntry = createDirEntry('root', 'root', 'drwxr-xr-x');
        context.fileSystem['/home'] = homeEntry;

        // 3. Répertoire /root - PRIVÉ pour root seulement (700)
        const rootHomeEntry = createDirEntry('root', 'root', 'drwx------');
        context.fileSystem['/root'] = rootHomeEntry;

        // 4. Répertoire /etc - configuration système accessible (755)
        const etcEntry = createDirEntry('root', 'root', 'drwxr-xr-x');
        context.fileSystem['/etc'] = etcEntry;

        // 5. Répertoire /tmp – répertoire temporaire accessible à tous avec sticky bit (1777)
        const tmpEntry = createDirEntry('root', 'root', 'drwxrwxrwt');
        context.fileSystem['/tmp'] = tmpEntry;


        // console.log('✅ Contexte par défaut : fichiers système créés avec succès');

    } catch (error) {
        console.error('❌ Erreur lors de la création des répertoires système avec FileSystemService:');
        console.error('📍 Stack trace:', error.stack);
        throw new Error(`Échec de l'initialisation du système de fichiers: ${error.message}`);
    }

    return addContextMethods(context);
}

/**
 * Crée un nouveau contexte et le sauvegarde dans IndexedDB
 * @returns {Promise<Object>} - Contexte créé et sauvegardé
 * @throws {Error} - Si impossible d'ouvrir la DB ou de sauvegarder
 */
export async function createAndSaveContext(testMode = false) {
    if (!isDBReady()) {
        await openDB();
    }
    const context = createDefaultContext();

    // Initialiser les fichiers système (passwd, shadow, group, etc.)
    initUserSystem(context.fileSystem, () => { });

    if (!testMode) {
        // Sauvegarder seulement les données, pas les méthodes
        const dataToSave = {
            fileSystem: context.fileSystem,
            currentPath: context.currentPath,
            variables: context.variables,
            currentUser: getCurrentUser() //  save root user
        };


        const success = await saveData(dataToSave);

        if (!success) {
            throw new Error('Échec de la sauvegarde du contexte');
        }
        console.log('Nouveau contexte par defaut créé et sauvegardé');
    }
    else {
        context.saveFileSystem = function() {}
        console.log('Nouveau contexte par defaut créé en mode test');
    }

    
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

    const defaultContext = createDefaultContext();
    const context = { ...defaultContext, ...data };

    // Ajoute les méthodes au contexte final
    addContextMethods(context);

    console.log('Contexte récupéré depuis IndexedDB :', context);
    return context;
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
        // currentPath: context.currentPath,
        variables: context.variables,
        // currentUser: getCurrentUser() //  save root user
    };

    const success = await saveData(dataToSave);
    console.log('Sauvegarde contexte:', success ? 'réussie' : 'échouée');
    return success;
}