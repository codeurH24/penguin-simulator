// context.js - Module de gestion du contexte d'exécution bash (objet de programmation)
// Chaque contexte est un objet indépendant avec ses propres données

import { getCurrentUser, initUserSystem } from '../modules/users/user.service.js';
import { updatePrompt, addLine } from '../modules/terminal/terminal.js';
import { saveData, loadData, isDBReady } from '../modules/storage.js';

// Instance globale pour l'application principale
let globalContextInstance = null;

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
 * Classe Context - Chaque instance est indépendante
 */
class Context {
    constructor(options = {}) {
        // Données internes à cette instance
        this.fileSystem = {
            '/': createDirectoryEntry(),
            '/home': createDirectoryEntry(),
            '/root': createDirectoryEntry()
        };
        this.currentPath = '/root';
        this.shellVariables = { OLDPWD: '/root' };
        this.isTestMode = options.testMode || false;
        
        // Initialiser les fichiers système
        initUserSystem(this.fileSystem, () => this.saveFileSystem());
    }
    
    /**
     * Change le répertoire courant
     * @param {string} newPath - Nouveau chemin
     */
    setCurrentPath(newPath) {
        console.log('DEBUG Class setCurrentPath this.isTestMode', this.isTestMode)
        const oldPath = this.currentPath;
        this.currentPath = newPath;
        this.shellVariables.OLDPWD = oldPath;

        
        console.log('DEBUG Class setCurrentPath this.currentPath', this.currentPath)
        
        // Mettre à jour le prompt seulement si pas en mode test
        if (!this.isTestMode) {
            updatePrompt(this.currentPath, this.createContextData());
        } else {
            
        }
    }

    /**
     * Obtient le chemin courant
     * @returns {string} - Chemin courant de cette instance
     */
    getCurrentPath() {
        return this.currentPath;
    }
    
    /**
     * Sauvegarde le système de fichiers
     * @returns {Promise<void>}
     */
    async saveFileSystem() {
        // Sauvegarder seulement si pas en mode test et IndexedDB disponible
        if (!this.isTestMode && isDBReady()) {
            await saveData({
                fileSystem: this.fileSystem,
                currentPath: this.currentPath,
                variables: this.shellVariables
            });
        }
    }
    
    /**
     * Charge le système de fichiers depuis IndexedDB
     * @returns {Promise<void>}
     */
    async loadFileSystem() {
        const data = await loadData();
        if (data) {
            this.fileSystem = data.fileSystem || this.fileSystem;
            this.currentPath = data.currentPath || '/root';
            this.shellVariables = data.variables || { OLDPWD: '/root' };
            
            // S'assurer qu'OLDPWD est initialisé
            if (!this.shellVariables.OLDPWD) {
                this.shellVariables.OLDPWD = this.currentPath;
            }
            
            // Réinitialiser les fichiers système si nécessaire
            if (!this.fileSystem['/etc/passwd']) {
                console.log('Fichiers système manquants, re-initialisation...');
                initUserSystem(this.fileSystem, () => this.saveFileSystem());
            }
            
            if (!this.isTestMode) {
                updatePrompt(this.currentPath, this.createContextData());
                addLine('📂 Données restaurées depuis la dernière session', 'prompt');
            }
        } else {
            // Première fois - le système est déjà initialisé dans le constructeur
            if (!this.isTestMode) {
                addLine('🆕 Nouveau système initialisé', 'prompt');
            }
        }
    }
    
    /**
     * Initialise le contexte (pour l'application principale)
     * @returns {Promise<void>}
     */
    async initContext() {
        const dbSuccess = await isDBReady();
        if (dbSuccess) {
            await this.loadFileSystem();
            if (!this.isTestMode) {
                addLine('💾 IndexedDB connecté - persistance activée', 'prompt');
            }
        } else {
            if (!this.isTestMode) {
                addLine('⚠️ IndexedDB indisponible - mode mémoire', 'error');
            }
        }
        
        // Vérification finale
        if (!this.fileSystem['/etc/passwd']) {
            console.error('ERREUR: /etc/passwd manquant, re-initialisation forcée');
            initUserSystem(this.fileSystem, () => this.saveFileSystem());
        }
        
        if (!this.shellVariables.OLDPWD) {
            this.shellVariables.OLDPWD = this.currentPath;
        }
    }
    
    /**
     * Crée l'objet de données du contexte (pour compatibilité avec l'API existante)
     * @returns {Object} - Données du contexte
     */
    createContextData() {
        const currentUser = getCurrentUser();
        
        return {
            fileSystem: this.fileSystem,
            getCurrentPath: () => this.getCurrentPath.bind(this)(),
            setCurrentPath: (newPath) => this.setCurrentPath.bind(this)(newPath),
            saveFileSystem: () => this.saveFileSystem(),
            variables: this.shellVariables,
            currentUser
        };
    }
}

/**
 * Crée une nouvelle instance de contexte
 * @param {Object} options - Options { testMode: boolean }
 * @returns {Object} - Contexte pour l'exécution des commandes
 */
export function createContext(options = {}) {
    if (options.testMode) {
        // Pour les tests, créer une nouvelle instance à chaque fois
        const testContext = new Context({ testMode: true });
        return testContext.createContextData();
    } else {
        // Pour l'application principale, utiliser l'instance globale
        if (!globalContextInstance) {
            globalContextInstance = new Context({ testMode: false });
        }
        return globalContextInstance.createContextData();
    }
}

/**
 * Initialise le contexte global (appelé au démarrage de l'application)
 * @returns {Promise<void>}
 */
export async function initContext() {
    if (!globalContextInstance) {
        globalContextInstance = new Context({ testMode: false });
    }
    await globalContextInstance.initContext();
}

/**
 * Obtient le chemin courant (pour usage externe)
 * @returns {string} - Chemin courant
 */
export function getCurrentPath() {
    if (!globalContextInstance) {
        return '/root';
    }
    return globalContextInstance.currentPath;
}

/**
 * Obtient les variables du shell (pour usage externe)
 * @returns {Object} - Variables du shell
 */
export function getShellVariables() {
    if (!globalContextInstance) {
        return { OLDPWD: '/root' };
    }
    return globalContextInstance.shellVariables;
}