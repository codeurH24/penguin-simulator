// bin/mkdir/creation.js - Logique de création des répertoires

import { resolvePath, getDirname } from '../../modules/filesystem.js';
import { checkCreatePermissions } from './permissions.js';

/**
 * Crée une entrée de répertoire avec de vraies métadonnées et propriétaire approprié
 * @param {Object} user - Utilisateur qui crée le répertoire
 * @returns {Object} - Objet répertoire avec métadonnées
 */
function createDirectoryEntry(user = null) {
    const now = new Date();
    return {
        type: 'dir',
        size: 4096, // Taille standard d'un dossier Unix
        created: now,
        modified: now,
        accessed: now,
        permissions: 'drwxr-xr-x', // Permissions par défaut pour un répertoire
        owner: user ? user.username : 'root', // Le répertoire appartient à l'utilisateur qui le crée
        group: user ? (user.group || 'users') : 'root', // Groupe principal de l'utilisateur
        links: 2 // . et ..
    };
}

/**
 * Crée récursivement les répertoires parents
 * @param {string} fullPath - Chemin complet du répertoire final
 * @param {Object} fileSystem - Système de fichiers
 * @param {Object} user - Utilisateur actuel
 * @param {Object} context - Contexte d'exécution
 * @param {Function} errorFn - Fonction d'affichage d'erreur
 */
function createParentsRecursively(fullPath, fileSystem, user, context, errorFn) {
    const parts = fullPath.split('/').filter(p => p);
    let currentDir = '';

    for (const part of parts) {
        currentDir = currentDir === '' ? '/' + part : currentDir + '/' + part;
        if (!fileSystem[currentDir]) {
            // Vérifier les permissions sur le répertoire parent
            const parentPath = getDirname(currentDir);
            if (!checkCreatePermissions(parentPath, user, context, errorFn, part)) {
                return; // Arrêter si pas de permissions
            }
            
            fileSystem[currentDir] = createDirectoryEntry(user);
        }
    }
}

/**
 * Crée les répertoires demandés
 * @param {Array} dirArgs - Noms des répertoires à créer
 * @param {Object} options - Options de création
 */
export function createDirectories(dirArgs, options) {
    const { context, currentPath, user, createParents, errorFn, saveFileSystem } = options;
    const { fileSystem } = context;

    dirArgs.forEach(dirName => {
        const fullPath = resolvePath(dirName, currentPath);

        if (fileSystem[fullPath]) {
            if (!createParents) {
                errorFn(`mkdir: ${dirName}: Le dossier existe déjà`);
            }
        } else {
            // Créer les répertoires parents si nécessaire
            if (createParents) {
                createParentsRecursively(fullPath, fileSystem, user, context, errorFn);
            } else {
                // Vérifier que le parent existe
                const parentPath = getDirname(fullPath);
                if (!fileSystem[parentPath]) {
                    errorFn(`mkdir: ${dirName}: Le répertoire parent n'existe pas`);
                    return;
                }

                // Vérifier les permissions sur le répertoire parent
                if (!checkCreatePermissions(parentPath, user, context, errorFn, dirName)) {
                    return; // Arrêter si pas de permissions
                }
                
                fileSystem[fullPath] = createDirectoryEntry(user);
            }
            saveFileSystem();
        }
    });
}