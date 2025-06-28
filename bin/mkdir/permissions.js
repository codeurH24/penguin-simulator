// bin/mkdir/permissions.js - Vérification des permissions pour mkdir

import { PermissionsSystem } from '../../modules/filesystem/PermissionsSystem.js';

/**
 * Vérifie les permissions pour créer un répertoire dans un répertoire parent
 * @param {string} parentPath - Chemin du répertoire parent
 * @param {Object} user - Utilisateur actuel
 * @param {Object} context - Contexte d'exécution
 * @param {Function} errorFn - Fonction d'affichage d'erreur
 * @param {string} dirName - Nom du répertoire à créer (pour les erreurs)
 * @returns {boolean} - true si l'utilisateur peut créer, false sinon
 */
export function checkCreatePermissions(parentPath, user, context, errorFn, dirName) {
    // Créer une instance du système de permissions
    const fileSystemService = {
        context: context,
        _normalizePath: (path) => path // Simple normalization
    };
    const permissionsSystem = new PermissionsSystem(fileSystemService);
    
    // Vérifier que le répertoire parent existe
    const parentEntry = context.fileSystem[parentPath];
    if (!parentEntry) {
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