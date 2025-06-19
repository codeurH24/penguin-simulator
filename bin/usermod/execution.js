// bin/usermod/execution.js - Exécution des modifications usermod

import { applyGroupModifications } from './groups.js';
import { applyPropertyModifications } from './properties.js';

/**
 * Exécute toutes les modifications usermod
 * @param {string} username - Nom d'utilisateur
 * @param {Object} modifications - Toutes les modifications à appliquer
 * @param {Object} context - Contexte d'exécution
 * @param {Function} errorFn - Fonction d'affichage des erreurs
 * @returns {boolean} - true si succès
 */
export function executeUsermodChanges(username, modifications, context, errorFn) {
    const { fileSystem } = context;
    
    try {
        // Sauvegarder l'état actuel pour rollback en cas d'erreur
        const backupState = createBackup(context);
        
        // Phase 1: Appliquer les modifications de propriétés
        if (Object.keys(modifications.properties).length > 0) {
            if (!applyPropertyModifications(username, modifications.properties, context, errorFn)) {
                restoreBackup(backupState, context);
                return false;
            }
        }

        // Phase 2: Gérer le déplacement du répertoire home si demandé
        if (modifications.moveHome && modifications.properties.homeDirectory) {
            if (!moveHomeDirectory(username, modifications.properties, context, errorFn)) {
                restoreBackup(backupState, context);
                return false;
            }
        }

        // Phase 3: Appliquer les modifications de groupes
        if (modifications.groups) {
            // Utiliser le nouveau nom d'utilisateur si il a changé
            const effectiveUsername = modifications.properties.newUsername || username;
            
            if (!applyGroupModifications(effectiveUsername, modifications.groups, context, errorFn)) {
                restoreBackup(backupState, context);
                return false;
            }
        }

        // Phase 4: Mettre à jour les permissions des fichiers si l'UID a changé
        if (modifications.properties.uid !== undefined) {
            if (!updateFileOwnership(username, modifications.properties, context, errorFn)) {
                restoreBackup(backupState, context);
                return false;
            }
        }

        return true;
        
    } catch (error) {
        errorFn(`usermod: erreur inattendue pendant l'exécution: ${error.message}`);
        return false;
    }
}

/**
 * Crée une sauvegarde des fichiers système avant modification
 * @param {Object} context - Contexte d'exécution
 * @returns {Object} - État de sauvegarde
 */
function createBackup(context) {
    const { fileSystem } = context;
    
    return {
        passwd: fileSystem['/etc/passwd'] ? { ...fileSystem['/etc/passwd'] } : null,
        group: fileSystem['/etc/group'] ? { ...fileSystem['/etc/group'] } : null,
        shadow: fileSystem['/etc/shadow'] ? { ...fileSystem['/etc/shadow'] } : null
    };
}

/**
 * Restaure l'état de sauvegarde en cas d'erreur
 * @param {Object} backupState - État de sauvegarde
 * @param {Object} context - Contexte d'exécution
 */
function restoreBackup(backupState, context) {
    const { fileSystem } = context;
    
    if (backupState.passwd) {
        fileSystem['/etc/passwd'] = backupState.passwd;
    }
    if (backupState.group) {
        fileSystem['/etc/group'] = backupState.group;
    }
    if (backupState.shadow) {
        fileSystem['/etc/shadow'] = backupState.shadow;
    }
}

/**
 * Déplace le répertoire home de l'utilisateur
 * @param {string} username - Nom d'utilisateur
 * @param {Object} properties - Propriétés modifiées
 * @param {Object} context - Contexte d'exécution
 * @param {Function} errorFn - Fonction d'affichage des erreurs
 * @returns {boolean} - true si succès
 */
function moveHomeDirectory(username, properties, context, errorFn) {
    const { fileSystem } = context;
    
    // Récupérer l'ancien répertoire home
    const passwdContent = fileSystem['/etc/passwd'].content;
    const lines = passwdContent.split('\n').filter(line => line.trim());
    
    let oldHomeDir = null;
    for (const line of lines) {
        const fields = line.split(':');
        if (fields[0] === username) {
            oldHomeDir = fields[5];
            break;
        }
    }

    if (!oldHomeDir) {
        errorFn(`usermod: impossible de trouver le répertoire personnel pour l'utilisateur ${username}`);
        return false;
    }

    const newHomeDir = properties.homeDirectory;
    
    // Vérifier que l'ancien répertoire existe
    if (!fileSystem[oldHomeDir]) {
        // Pas d'erreur si l'ancien répertoire n'existe pas
        return true;
    }

    // Vérifier que le nouveau répertoire n'existe pas déjà
    if (fileSystem[newHomeDir]) {
        errorFn(`usermod: le répertoire ${newHomeDir} existe déjà`);
        return false;
    }

    try {
        // Créer le répertoire parent si nécessaire
        const parentDir = newHomeDir.substring(0, newHomeDir.lastIndexOf('/'));
        if (parentDir && !fileSystem[parentDir]) {
            createDirectoryRecursive(parentDir, fileSystem);
        }

        // Déplacer récursivement tout le contenu
        moveDirectoryRecursive(oldHomeDir, newHomeDir, fileSystem);
        
        return true;
        
    } catch (error) {
        errorFn(`usermod: échec du déplacement du répertoire personnel: ${error.message}`);
        return false;
    }
}

/**
 * Déplace un répertoire et tout son contenu récursivement
 * @param {string} sourcePath - Chemin source
 * @param {string} destPath - Chemin destination
 * @param {Object} fileSystem - Système de fichiers
 */
function moveDirectoryRecursive(sourcePath, destPath, fileSystem) {
    const sourceItem = fileSystem[sourcePath];
    
    // Copier l'élément source vers la destination
    fileSystem[destPath] = {
        ...sourceItem
    };
    
    // Si c'est un répertoire, déplacer récursivement tous les sous-éléments
    if (sourceItem.type === 'dir') {
        for (const path in fileSystem) {
            if (path.startsWith(sourcePath + '/')) {
                const relativePath = path.substring(sourcePath.length);
                const newPath = destPath + relativePath;
                fileSystem[newPath] = { ...fileSystem[path] };
                delete fileSystem[path];
            }
        }
    }
    
    // Supprimer l'élément source
    delete fileSystem[sourcePath];
}

/**
 * Crée un répertoire récursivement
 * @param {string} dirPath - Chemin du répertoire
 * @param {Object} fileSystem - Système de fichiers
 */
function createDirectoryRecursive(dirPath, fileSystem) {
    const parts = dirPath.split('/').filter(part => part);
    let currentPath = '';
    
    for (const part of parts) {
        currentPath += '/' + part;
        if (!fileSystem[currentPath]) {
            fileSystem[currentPath] = {
                type: 'dir',
                permissions: '755',
                owner: 'root',
                group: 'root'
            };
        }
    }
}

/**
 * Met à jour la propriété des fichiers quand l'UID change
 * @param {string} username - Nom d'utilisateur
 * @param {Object} properties - Propriétés modifiées
 * @param {Object} context - Contexte d'exécution
 * @param {Function} errorFn - Fonction d'affichage des erreurs
 * @returns {boolean} - true si succès
 */
function updateFileOwnership(username, properties, context, errorFn) {
    const { fileSystem } = context;
    
    try {
        // Parcourir tous les fichiers et mettre à jour ceux qui appartiennent à l'utilisateur
        for (const path in fileSystem) {
            const item = fileSystem[path];
            if (item.owner === username) {
                // Mettre à jour le nom du propriétaire si le nom d'utilisateur a changé
                if (properties.newUsername) {
                    item.owner = properties.newUsername;
                }
            }
        }
        
        return true;
        
    } catch (error) {
        errorFn(`usermod: échec de mise à jour de la propriété des fichiers: ${error.message}`);
        return false;
    }
}

/**
 * Valide que toutes les modifications peuvent être appliquées
 * @param {string} username - Nom d'utilisateur
 * @param {Object} modifications - Toutes les modifications
 * @param {Object} context - Contexte d'exécution
 * @param {Function} errorFn - Fonction d'affichage des erreurs
 * @returns {boolean} - true si valide
 */
export function validateAllModifications(username, modifications, context, errorFn) {
    const { fileSystem } = context;
    
    // Vérifier que les fichiers système existent
    if (!fileSystem['/etc/passwd']) {
        errorFn('usermod: /etc/passwd introuvable');
        return false;
    }
    
    if (!fileSystem['/etc/group']) {
        errorFn('usermod: /etc/group introuvable');
        return false;
    }
    
    // Vérifications spécifiques pour les modifications complexes
    if (modifications.moveHome && !modifications.properties.homeDirectory) {
        errorFn('usermod: erreur interne - déplacement du home demandé sans nouveau répertoire personnel');
        return false;
    }
    
    return true;
}