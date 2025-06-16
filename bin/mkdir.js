// bin/mkdir.js - Commande mkdir (make directory) avec vérifications de permissions
// Équivalent de /bin/mkdir sous Debian

import { resolvePath, getDirname } from '../modules/filesystem.js';
import { PermissionsSystem } from '../modules/filesystem/PermissionsSystem.js';

/**
 * Commande mkdir - Crée des répertoires avec vérifications de permissions
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, currentPath, saveFileSystem, currentUser)
 */
export function cmdMkdir(args, context) {

    const { fileSystem, getCurrentPath, saveFileSystem } = context;
    const currentPath = getCurrentPath();
    
    const term = context.terminal;
    // Utiliser les fonctions du contexte si disponibles, sinon celles par défaut
    const errorFn = context?.showError || (str => { term.write(`${str}\r\n`) });
    const successFn = context?.showSuccess || (str => { term.write(`${str}\r\n`) });
    
    if (args.length === 0) {
        errorFn('mkdir: nom de dossier manquant');
        return;
    }

    // Gérer l'option -p
    let createParents = false;
    let dirArgs = [...args];

    if (args[0] === '-p') {
        createParents = true;
        dirArgs = args.slice(1);
    }

    if (dirArgs.length === 0) {
        errorFn('mkdir: nom de dossier manquant');
        return;
    }

    // Obtenir l'utilisateur actuel pour les vérifications de permissions
    const user = context.currentUser;
    if (!user) {
        errorFn('mkdir: impossible de déterminer l\'utilisateur actuel');
        return;
    }

    // Créer une instance du système de permissions
    const fileSystemService = {
        context: context,
        _normalizePath: (path) => path // Simple normalization
    };
    const permissionsSystem = new PermissionsSystem(fileSystemService);

    dirArgs.forEach(dirName => {
        const fullPath = resolvePath(dirName, currentPath);

        if (fileSystem[fullPath]) {
            if (!createParents) {
                errorFn(`mkdir: ${dirName}: Le dossier existe déjà`);
            }
        } else {
            // Créer les répertoires parents si nécessaire
            if (createParents) {
                const parts = fullPath.split('/').filter(p => p);
                let currentDir = '';

                for (const part of parts) {
                    currentDir = currentDir === '' ? '/' + part : currentDir + '/' + part;
                    if (!fileSystem[currentDir]) {
                        // Vérifier les permissions sur le répertoire parent
                        const parentPath = getDirname(currentDir);
                        if (!checkCreatePermissions(parentPath, user, permissionsSystem, errorFn, dirName)) {
                            return; // Arrêter si pas de permissions
                        }
                        
                        fileSystem[currentDir] = createDirectoryEntry(user);
                    }
                }
            } else {
                // Vérifier que le parent existe
                const parentPath = getDirname(fullPath);
                if (!fileSystem[parentPath]) {
                    errorFn(`mkdir: ${dirName}: Le répertoire parent n'existe pas`);
                    return;
                }

                // Vérifier les permissions sur le répertoire parent
                if (!checkCreatePermissions(parentPath, user, permissionsSystem, errorFn, dirName)) {
                    return; // Arrêter si pas de permissions
                }
                
                fileSystem[fullPath] = createDirectoryEntry(user);
            }
            saveFileSystem();
        }
    });
}

/**
 * Vérifie les permissions pour créer un répertoire dans un répertoire parent
 * @param {string} parentPath - Chemin du répertoire parent
 * @param {Object} user - Utilisateur actuel
 * @param {PermissionsSystem} permissionsSystem - Système de permissions
 * @param {Function} errorFn - Fonction d'affichage d'erreur
 * @param {string} dirName - Nom du répertoire à créer (pour les erreurs)
 * @returns {boolean} - true si l'utilisateur peut créer, false sinon
 */
function checkCreatePermissions(parentPath, user, permissionsSystem, errorFn, dirName) {
    // Vérifier que le répertoire parent existe
    const parentEntry = permissionsSystem.fileSystemService.context.fileSystem[parentPath];
    if (!parentEntry) {
        // Ne pas afficher d'erreur ici car c'est déjà géré dans la logique principale
        return false;
    }

    // Vérifier les permissions d'écriture sur le répertoire parent
    const writePermission = permissionsSystem.hasPermission(parentPath, user, 'write');
    if (!writePermission.allowed) {
        errorFn(`mkdir: impossible de créer le répertoire '${dirName}': Permission refusée`);
        return false;
    }

    // Vérifier les permissions d'exécution (traverse) sur le répertoire parent
    const executePermission = permissionsSystem.hasPermission(parentPath, user, 'traverse');
    if (!executePermission.allowed) {
        errorFn(`mkdir: impossible de créer le répertoire '${dirName}': Permission refusée`);
        return false;
    }

    return true;
}

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