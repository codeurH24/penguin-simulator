// bin/mkdir.js - Commande mkdir (make directory) avec vérifications de permissions
// Équivalent de /bin/mkdir sous Debian

import { resolvePath, getDirname } from '../modules/filesystem.js';
import { 
    canCreateInDirectory, 
    createDirectoryMetadata, 
    checkPermissionWithError 
} from '../modules/users/file-permissions.js';

/**
 * Commande mkdir - Crée des répertoires avec vérification des permissions
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, currentPath, saveFileSystem, currentUser)
 */
export function cmdMkdir(args, context) {
    const { fileSystem, getCurrentPath, saveFileSystem } = context;
    const currentPath = getCurrentPath();
    
    // Obtenir l'utilisateur courant, avec fallback sur root si non défini
    const currentUser = context.currentUser || { username: 'root', groups: ['root'] };
    
    const term = context.terminal;
    const errorFn = context?.showError || (str => { term.write(`${str}\r\n`) });
    const successFn = context?.showSuccess || (str => { term.write(`${str}\r\n`) });
    
    if (args.length === 0) {
        errorFn('mkdir: nom de dossier manquant');
        errorFn('Usage: mkdir [OPTION]... DIRECTORY...');
        errorFn('Créer le(s) DIRECTORY(s), s\'ils n\'existent pas déjà.');
        errorFn('Options:');
        errorFn('  -p, --parents     créer les répertoires parents si nécessaire');
        return;
    }

    // Gérer l'option -p
    let createParents = false;
    let dirArgs = [...args];

    if (args[0] === '-p' || args[0] === '--parents') {
        createParents = true;
        dirArgs = args.slice(1);
    }

    if (dirArgs.length === 0) {
        errorFn('mkdir: nom de dossier manquant après les options');
        return;
    }

    let hasErrors = false;
    let successCount = 0;

    dirArgs.forEach(dirName => {
        const fullPath = resolvePath(dirName, currentPath);

        // Vérifier si le dossier existe déjà
        if (fileSystem[fullPath]) {
            if (!createParents) {
                errorFn(`mkdir: ${dirName}: Le dossier existe déjà`);
                hasErrors = true;
            }
            return;
        }

        if (createParents) {
            // Mode -p : créer tous les répertoires parents nécessaires
            if (createDirectoryTreeWithPermissions(fullPath, fileSystem, currentUser, context, errorFn)) {
                successCount++;
            } else {
                hasErrors = true;
            }
        } else {
            // Mode normal : créer seulement le répertoire demandé
            if (createSingleDirectoryWithPermissions(fullPath, dirName, fileSystem, currentUser, context, errorFn)) {
                successCount++;
            } else {
                hasErrors = true;
            }
        }
    });

    // Sauvegarder seulement s'il y a eu des créations réussies
    if (successCount > 0) {
        saveFileSystem();
    }
}

/**
 * Crée un seul répertoire avec vérification des permissions
 * @param {string} fullPath - Chemin complet du répertoire
 * @param {string} dirName - Nom d'affichage du répertoire
 * @param {Object} fileSystem - Système de fichiers
 * @param {Object} currentUser - Utilisateur courant
 * @param {Object} context - Contexte complet
 * @param {Function} errorFn - Fonction d'erreur
 * @returns {boolean} - true si créé avec succès
 */
function createSingleDirectoryWithPermissions(fullPath, dirName, fileSystem, currentUser, context, errorFn) {
    // Vérifier que le parent existe
    const parentPath = getDirname(fullPath);
    if (!fileSystem[parentPath]) {
        errorFn(`mkdir: ${dirName}: Le répertoire parent n'existe pas`);
        return false;
    }

    // Ne vérifier les permissions que si on a un utilisateur réel (pas le fallback root)
    const shouldCheckPermissions = currentUser.username !== 'root' || 
                                  (currentUser.username === 'root' && context?.currentUser);
    
    if (shouldCheckPermissions) {
        // Vérifier les permissions d'écriture dans le parent
        if (!checkPermissionWithError(canCreateInDirectory, parentPath, fileSystem, currentUser, errorFn)) {
            return false;
        }
    }

    // Créer le répertoire
    fileSystem[fullPath] = createDirectoryMetadata(currentUser);
    return true;
}

/**
 * Crée une arborescence de répertoires avec vérification des permissions
 * @param {string} fullPath - Chemin complet final
 * @param {Object} fileSystem - Système de fichiers
 * @param {Object} currentUser - Utilisateur courant
 * @param {Object} context - Contexte complet
 * @param {Function} errorFn - Fonction d'erreur
 * @returns {boolean} - true si créé avec succès
 */
function createDirectoryTreeWithPermissions(fullPath, fileSystem, currentUser, context, errorFn) {
    const parts = fullPath.split('/').filter(p => p);
    let currentDir = '';

    // Ne vérifier les permissions que si on a un utilisateur réel (pas le fallback root)
    const shouldCheckPermissions = currentUser.username !== 'root' || 
                                  (currentUser.username === 'root' && context?.currentUser);

    for (const part of parts) {
        currentDir = currentDir === '' ? '/' + part : currentDir + '/' + part;
        
        // Si le répertoire existe déjà, continuer
        if (fileSystem[currentDir]) {
            // Vérifier que c'est bien un répertoire
            if (fileSystem[currentDir].type !== 'dir') {
                errorFn(`mkdir: impossible de créer le répertoire '${currentDir}': Le fichier existe`);
                return false;
            }
            continue;
        }

        if (shouldCheckPermissions) {
            // Vérifier les permissions sur le parent
            const parentPath = currentDir.substring(0, currentDir.lastIndexOf('/')) || '/';
            if (fileSystem[parentPath]) {
                if (!checkPermissionWithError(canCreateInDirectory, parentPath, fileSystem, currentUser, errorFn)) {
                    return false;
                }
            }
        }

        // Créer le répertoire
        fileSystem[currentDir] = createDirectoryMetadata(currentUser);
    }

    return true;
}