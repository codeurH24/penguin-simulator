// storage.js - Module de gestion IndexedDB
// Module 100% indépendant pour la persistance des données

let db = null;

/**
 * Initialise la base de données IndexedDB
 * @returns {Promise<boolean>} - true si succès, false si échec
 */
export function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('TerminalDB', 1);
        
        request.onupgradeneeded = function(e) {
            db = e.target.result;
            if (!db.objectStoreNames.contains('files')) {
                db.createObjectStore('files');
            }
        };
        
        request.onsuccess = function(e) {
            db = e.target.result;
            resolve(true);
        };
        
        request.onerror = function(e) {
            console.error('Erreur IndexedDB:', e);
            resolve(false);
        };
    });
}

/**
 * Sauvegarde les données dans IndexedDB
 * @param {Object} data - Données à sauvegarder
 * @returns {Promise<boolean>} - true si succès, false si échec
 */
export function saveData(data) {
    if (!db) {
        console.warn('Base de données non initialisée');
        return Promise.resolve(false);
    }
    
    return new Promise((resolve) => {
        try {
            const transaction = db.transaction(['files'], 'readwrite');
            const store = transaction.objectStore('files');
            const request = store.put(data, 'data');
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => {
                console.error('Erreur lors de la sauvegarde');
                resolve(false);
            };
        } catch (error) {
            console.error('Erreur transaction:', error);
            resolve(false);
        }
    });
}

/**
 * Charge les données depuis IndexedDB
 * @returns {Promise<Object|null>} - Données chargées ou null si erreur
 */
export function loadData() {
    if (!db) {
        console.warn('Base de données non initialisée');
        return Promise.resolve(null);
    }
    
    return new Promise((resolve) => {
        try {
            const transaction = db.transaction(['files'], 'readonly');
            const store = transaction.objectStore('files');
            const request = store.get('data');
            
            request.onsuccess = function(e) {
                resolve(e.target.result || null);
            };
            
            request.onerror = () => {
                console.error('Erreur lors du chargement');
                resolve(null);
            };
        } catch (error) {
            console.error('Erreur transaction:', error);
            resolve(null);
        }
    });
}

/**
 * Vérifie si IndexedDB est disponible et initialisé
 * @returns {boolean} - true si disponible
 */
export function isDBReady() {
    return db !== null;
}

/**
 * Ferme la connexion à la base de données
 */
export function closeDB() {
    if (db) {
        db.close();
        db = null;
    }
}