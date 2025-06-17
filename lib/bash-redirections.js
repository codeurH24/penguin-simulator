// lib/bash-redirections.js - Gestion des redirections bash avec vérifications de permissions
// Module pour capturer et rediriger la sortie des commandes

import { resolvePath, getDirname } from '../modules/filesystem.js';
import { 
    FileSystemService,
    PermissionDeniedError,
    FileNotFoundError,
    IsDirectoryError,
    NotDirectoryError
} from '../modules/filesystem/index.js';

/**
 * Exécute une commande avec redirection de sortie
 * @param {Function} commandExecutor - Fonction qui exécute la commande
 * @param {Object} redirections - Objet redirections {output, append, input}
 * @param {Object} context - Contexte d'exécution
 */
export function executeWithRedirection(commandExecutor, redirections, context) {
    if (!redirections.output && !redirections.append) {
        // Pas de redirection, exécution normale
        commandExecutor();
        return;
    }

    // Capturer la sortie
    let output = '';
    const originalAddLine = context.addLine;
    
    // Remplacer temporairement addLine pour capturer
    context.addLine = (text) => {
        console.log('text', JSON.stringify(text));
        output += text;
    };

    try {
        // Exécuter la commande
        commandExecutor();
        
        // Traiter la redirection avec vérifications de permissions
        handleOutputRedirection(output, redirections, context);
        
    } catch (error) {
        // Restaurer l'addLine original même en cas d'erreur
        context.addLine = originalAddLine;
        
        // Gérer toutes les erreurs de filesystem
        const errorFn = context?.showError || (str => { 
            context.terminal?.write(`${str}\r\n`) 
        });
        
        if (error instanceof PermissionDeniedError) {
            errorFn(`bash: ${error.path}: Permission denied`);
        } else if (error instanceof FileNotFoundError) {
            errorFn(`bash: ${error.path}: No such file or directory`);
        } else if (error instanceof IsDirectoryError) {
            errorFn(`bash: ${error.path}: Is a directory`);
        } else {
            // Pour toute autre erreur, afficher le message de l'erreur
            errorFn(`bash: ${error.message || error}`);
        }
        return;
        
    } finally {
        // Restaurer l'addLine original
        context.addLine = originalAddLine;
    }
}

/**
 * Gère la redirection de sortie vers un fichier avec vérifications de permissions
 * @param {string} output - Contenu à écrire
 * @param {Object} redirections - Objet redirections
 * @param {Object} context - Contexte d'exécution
 */
function handleOutputRedirection(output, redirections, context) {
    const fileName = redirections.output || redirections.append;
    const filePath = resolvePath(fileName, context.getCurrentPath());
    
    try {
        if (redirections.output) {
            // Redirection > (écraser)
            createOrOverwriteFileSecure(filePath, output, context);
        } else if (redirections.append) {
            // Redirection >> (ajouter)
            appendToFileSecure(filePath, output, context);
        }
        
        // Sauvegarder le filesystem
        context.saveFileSystem();
        
    } catch (error) {
        // Les erreurs de permissions sont remontées au niveau supérieur
        throw error;
    }
}

/**
 * ✅ NOUVELLE VERSION : Crée ou écrase un fichier avec vérifications de permissions
 * @param {string} filePath - Chemin du fichier
 * @param {string} content - Contenu à écrire
 * @param {Object} context - Contexte d'exécution
 * @throws {PermissionDeniedError} - Si permissions insuffisantes
 */
function createOrOverwriteFileSecure(filePath, content, context) {
    const fs = new FileSystemService(context);
    const currentUser = context.currentUser || { username: 'root', uid: 0, gid: 0, groups: ['root'] };
    
    try {
        // Cas 1: Le fichier existe déjà
        if (context.fileSystem[filePath]) {
            const fileEntry = context.fileSystem[filePath];
            
            if (fileEntry.type !== 'file') {
                throw new IsDirectoryError(filePath);
            }
            
            // Vérifier la permission d'écriture sur le fichier existant
            const writePermCheck = fs.permissionsSystem.hasPermission(filePath, currentUser, 'write');
            if (!writePermCheck.allowed) {
                throw new PermissionDeniedError(filePath, 'write to file');
            }
            
            // Écraser le contenu en utilisant FileSystem.setContent()
            fs.fileSystem.setContent(filePath, content);
        } 
        // Cas 2: Créer un nouveau fichier
        else {
            const parentDir = getDirname(filePath);
            
            // Vérifier que le répertoire parent existe
            if (!context.fileSystem[parentDir]) {
                throw new FileNotFoundError(parentDir);
            }
            
            // Vérifier la permission d'écriture sur le répertoire parent
            const parentWriteCheck = fs.permissionsSystem.hasPermission(parentDir, currentUser, 'write');
            if (!parentWriteCheck.allowed) {
                throw new PermissionDeniedError(parentDir, 'create file in directory');
            }
            
            // Créer une entrée de fichier avec le contenu
            const fileEntry = {
                type: 'file',
                size: content.length,
                content: content,
                created: new Date(),
                modified: new Date(),
                accessed: new Date(),
                permissions: '-rw-r--r--', // 644 par défaut
                owner: currentUser.username,
                group: currentUser.groups && currentUser.groups[0] || currentUser.username,
                links: 1
            };
            
            // Utiliser setFile() pour créer le nouveau fichier
            fs.setFile(filePath, fileEntry);
        }
        
    } catch (error) {
        // Remonter toutes les erreurs (permissions, etc.)
        throw error;
    }
}

/**
 * ✅ NOUVELLE VERSION : Ajoute du contenu à un fichier avec vérifications de permissions
 * @param {string} filePath - Chemin du fichier
 * @param {string} content - Contenu à ajouter
 * @param {Object} context - Contexte d'exécution
 * @throws {PermissionDeniedError} - Si permissions insuffisantes
 */
function appendToFileSecure(filePath, content, context) {
    const fs = new FileSystemService(context);
    const currentUser = context.currentUser || { username: 'root', uid: 0, gid: 0, groups: ['root'] };
    
    try {
        // Cas 1: Le fichier existe déjà
        if (context.fileSystem[filePath]) {
            const fileEntry = context.fileSystem[filePath];
            
            if (fileEntry.type !== 'file') {
                throw new IsDirectoryError(filePath);
            }
            
            // Vérifier la permission d'écriture sur le fichier existant
            const writePermCheck = fs.permissionsSystem.hasPermission(filePath, currentUser, 'write');
            if (!writePermCheck.allowed) {
                throw new PermissionDeniedError(filePath, 'append to file');
            }
            
            // Ajouter le contenu en utilisant FileSystem.setContent()
            const currentContent = fs.fileSystem.getContent(filePath);
            const newContent = currentContent + content;
            fs.fileSystem.setContent(filePath, newContent);
        } 
        // Cas 2: Créer un nouveau fichier (même logique que createOrOverwrite)
        else {
            createOrOverwriteFileSecure(filePath, content, context);
        }
        
    } catch (error) {
        // Remonter toutes les erreurs (permissions, etc.)
        throw error;
    }
}

/**
 * Vérifie si une redirection est présente
 * @param {Object} redirections - Objet redirections
 * @returns {boolean}
 */
export function hasRedirection(redirections) {
    return !!(redirections.output || redirections.append || redirections.input);
}

/**
 * ✅ FONCTION UTILITAIRE : Teste les permissions avant redirection
 * Fonction pour diagnostiquer les permissions sans effectuer l'écriture
 * @param {string} filePath - Chemin du fichier de destination
 * @param {boolean} isAppend - true pour >>, false pour >
 * @param {Object} context - Contexte d'exécution
 * @returns {Object} - {allowed: boolean, reason: string}
 */
export function checkRedirectionPermissions(filePath, isAppend, context) {
    const fs = new FileSystemService(context);
    const currentUser = context.currentUser || { username: 'root', uid: 0, gid: 0, groups: ['root'] };
    const resolvedPath = resolvePath(filePath, context.getCurrentPath());
    
    try {
        // Si le fichier existe
        if (context.fileSystem[resolvedPath]) {
            const fileEntry = context.fileSystem[resolvedPath];
            
            if (fileEntry.type !== 'file') {
                return { 
                    allowed: false, 
                    reason: `${resolvedPath} is a directory` 
                };
            }
            
            // Vérifier permission d'écriture sur le fichier
            const writePermCheck = fs.permissionsSystem.hasPermission(resolvedPath, currentUser, 'write');
            return {
                allowed: writePermCheck.allowed,
                reason: writePermCheck.allowed ? null : `No write permission on ${resolvedPath}`
            };
        } 
        // Si le fichier n'existe pas, vérifier le répertoire parent
        else {
            const parentDir = getDirname(resolvedPath);
            
            if (!context.fileSystem[parentDir]) {
                return { 
                    allowed: false, 
                    reason: `Parent directory ${parentDir} does not exist` 
                };
            }
            
            // Vérifier permission d'écriture sur le répertoire parent
            const parentWriteCheck = fs.permissionsSystem.hasPermission(parentDir, currentUser, 'write');
            return {
                allowed: parentWriteCheck.allowed,
                reason: parentWriteCheck.allowed ? null : `No write permission in directory ${parentDir}`
            };
        }
        
    } catch (error) {
        return { 
            allowed: false, 
            reason: `Error checking permissions: ${error.message}` 
        };
    }
}