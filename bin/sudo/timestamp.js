// bin/sudo/timestamp.js - Gestion des timestamps sudo
import { authenticate } from './auth.js';

/**
 * Vérifie si le timestamp sudo est valide (moins de 15 minutes)
 * @param {Object} context - Contexte complet
 * @returns {boolean} - true si le timestamp est valide
 */
export function checkSudoTimestamp(context) {
    const { fileSystem, currentUser } = context;
    
    if (!currentUser) return false;
    
    const timestampPath = getSudoTimestampPath(currentUser.uid);
    const timestampFile = fileSystem[timestampPath];
    
    if (!timestampFile || timestampFile.type !== 'file') {
        return false; // Pas de timestamp = pas d'authentification récente
    }
    
    try {
        const lastAuthTime = parseInt(timestampFile.content);
        const currentTime = Date.now();
        const timeDiff = currentTime - lastAuthTime;
        
        // 15 minutes = 15 * 60 * 1000 = 900000 millisecondes
        const SUDO_TIMEOUT = 15 * 60 * 1000;
        
        if (timeDiff >= SUDO_TIMEOUT) {
            // Timestamp expiré : le supprimer automatiquement
            delete fileSystem[timestampPath];
            if (context.saveFileSystem) {
                context.saveFileSystem();
            }
            return false;
        }
        
        return true; // Timestamp valide
    } catch (error) {
        // Fichier corrompu : le supprimer et retourner false
        delete fileSystem[timestampPath];
        if (context.saveFileSystem) {
            context.saveFileSystem();
        }
        return false;
    }
}

/**
 * Met à jour ou crée le timestamp sudo
 * @param {Object} context - Contexte complet
 */
export function updateSudoTimestamp(context) {
    const { fileSystem, currentUser, saveFileSystem } = context;
    
    if (!currentUser) return;
    
    // Créer le répertoire /run/sudo/ts s'il n'existe pas
    ensureSudoTimestampDirectories(context);
    
    // Créer/mettre à jour le fichier timestamp
    const timestampPath = getSudoTimestampPath(currentUser.uid);
    const currentTime = Date.now().toString();
    
    fileSystem[timestampPath] = {
        type: 'file',
        content: currentTime,
        permissions: '-rw-------',
        owner: 'root',
        group: 'root',
        size: currentTime.length,
        created: new Date(),
        modified: new Date()
    };
    
    // Sauvegarder le système de fichiers
    if (saveFileSystem) {
        saveFileSystem();
    }
}

/**
 * Efface le timestamp sudo (sudo -k)
 * @param {Object} context - Contexte complet
 */
export function clearSudoTimestamp(context) {
    const { fileSystem, currentUser, saveFileSystem } = context;
    
    if (!currentUser) return;
    
    const timestampPath = getSudoTimestampPath(currentUser.uid);
    if (fileSystem[timestampPath]) {
        delete fileSystem[timestampPath];
        
        if (saveFileSystem) {
            saveFileSystem();
        }
    }
}

/**
 * Valide ou renouvelle le timestamp (sudo -v)
 * @param {Object} context - Contexte complet
 * @param {Function} outputFn - Fonction d'affichage
 * @param {Function} errorFn - Fonction d'affichage d'erreur
 */
export function validateTimestamp(context, outputFn, errorFn) {
    if (checkSudoTimestamp(context)) {
        // Timestamp valide : le renouveler
        updateSudoTimestamp(context);
        // Pas de message de sortie (comportement standard)
    } else {
        // Timestamp expiré : demander le mot de passe pour le renouveler
        authenticate(context, (isValid) => {
            if (!isValid) {
                errorFn('Sorry, try again.');
                return;
            }
            updateSudoTimestamp(context);
            // Pas de message de sortie si succès
        }, () => {
            outputFn('');
        });
    }
}

/**
 * Nettoie les timestamps expirés (appelée périodiquement)
 * @param {Object} context - Contexte complet
 */
export function cleanExpiredTimestamps(context) {
    const { fileSystem, saveFileSystem } = context;
    
    const tsDir = '/run/sudo/ts';
    if (!fileSystem[tsDir]) return;
    
    const currentTime = Date.now();
    const SUDO_TIMEOUT = 15 * 60 * 1000; // 15 minutes
    
    // Parcourir tous les fichiers dans /run/sudo/ts
    Object.keys(fileSystem).forEach(path => {
        if (path.startsWith('/run/sudo/ts/') && path !== tsDir) {
            const timestampFile = fileSystem[path];
            if (timestampFile && timestampFile.type === 'file') {
                try {
                    const lastAuthTime = parseInt(timestampFile.content);
                    const timeDiff = currentTime - lastAuthTime;
                    
                    if (timeDiff >= SUDO_TIMEOUT) {
                        // Timestamp expiré : supprimer le fichier
                        delete fileSystem[path];
                    }
                } catch (error) {
                    // Fichier corrompu : supprimer
                    delete fileSystem[path];
                }
            }
        }
    });
    
    if (saveFileSystem) {
        saveFileSystem();
    }
}

/**
 * Obtient le chemin du fichier timestamp pour un UID
 * @param {number} uid - UID de l'utilisateur
 * @returns {string} - Chemin du fichier timestamp
 */
export function getSudoTimestampPath(uid) {
    return `/run/sudo/ts/${uid}`;
}

/**
 * Crée les répertoires nécessaires pour les timestamps sudo
 * @param {Object} context - Contexte complet
 */
function ensureSudoTimestampDirectories(context) {
    const { fileSystem } = context;
    
    const runDir = '/run';
    const sudoDir = '/run/sudo';
    const tsDir = '/run/sudo/ts';
    
    if (!fileSystem[runDir]) {
        fileSystem[runDir] = {
            type: 'directory',
            permissions: 'drwxr-xr-x',
            owner: 'root',
            group: 'root',
            size: 4096,
            created: new Date(),
            modified: new Date()
        };
    }
    
    if (!fileSystem[sudoDir]) {
        fileSystem[sudoDir] = {
            type: 'directory',
            permissions: 'drwx------',
            owner: 'root',
            group: 'root',
            size: 4096,
            created: new Date(),
            modified: new Date()
        };
    }
    
    if (!fileSystem[tsDir]) {
        fileSystem[tsDir] = {
            type: 'directory',
            permissions: 'drwx------',
            owner: 'root',
            group: 'root',
            size: 4096,
            created: new Date(),
            modified: new Date()
        };
    }
}