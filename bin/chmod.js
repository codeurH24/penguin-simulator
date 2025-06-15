// bin/chmod.js - Commande chmod (change mode) isolée
// Équivalent de /bin/chmod sous Debian avec support symbolique et numérique

import { resolvePath } from '../modules/filesystem.js';

/**
 * Expanse un pattern en liste de fichiers matchants (globbing)
 * @param {string} pattern - Pattern avec wildcards (*.txt, dir*, etc.)
 * @param {string} currentPath - Repertoire courant
 * @param {Object} fileSystem - Systeme de fichiers
 * @returns {Array} - Liste des fichiers matchants
 */
function expandGlob(pattern, currentPath, fileSystem) {
    if (!pattern.includes('*') && !pattern.includes('?')) {
        return [pattern];
    }
    
    // Séparer le chemin du pattern
    const lastSlash = pattern.lastIndexOf('/');
    let dirPath = '';
    let filePattern = pattern;
    
    if (lastSlash !== -1) {
        dirPath = pattern.substring(0, lastSlash);
        filePattern = pattern.substring(lastSlash + 1);
    }
    
    // Résoudre le chemin du dossier
    const searchPath = dirPath ? resolvePath(dirPath, currentPath) : currentPath;
    
    // Créer regex
    const regexPattern = filePattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
    const regex = new RegExp('^' + regexPattern + '$');
    
    // Chercher les fichiers
    const matches = [];
    Object.keys(fileSystem).forEach(path => {
        const parent = path.substring(0, path.lastIndexOf('/')) || '/';
        if (parent === searchPath) {
            const name = path.substring(path.lastIndexOf('/') + 1);
            if (regex.test(name)) {
                matches.push(dirPath ? `${dirPath}/${name}` : name);
            }
        }
    });
    
    return matches.length > 0 ? matches : [pattern];
}

/**
 * Convertit un mode numérique (755) en format symbolique (-rwxr-xr-x)
 * @param {string} numericMode - Mode numérique (ex: "755")
 * @param {boolean} isDirectory - Si c'est un répertoire
 * @returns {string} - Mode symbolique
 */
function numericToSymbolic(numericMode, isDirectory) {
    if (!/^[0-7]{3,4}$/.test(numericMode)) {
        throw new Error(`Mode numérique invalide: ${numericMode}`);
    }
    
    // Prendre les 3 derniers chiffres (ignorer les bits spéciaux pour l'instant)
    const mode = numericMode.slice(-3);
    const [owner, group, other] = mode.split('').map(n => parseInt(n));
    
    const convertOctalToSymbolic = (octal) => {
        let result = '';
        result += (octal & 4) ? 'r' : '-';
        result += (octal & 2) ? 'w' : '-';
        result += (octal & 1) ? 'x' : '-';
        return result;
    };
    
    const typeChar = isDirectory ? 'd' : '-';
    return typeChar + convertOctalToSymbolic(owner) + convertOctalToSymbolic(group) + convertOctalToSymbolic(other);
}

/**
 * Applique un mode symbolique (u+x, g-w, o=r, etc.) aux permissions existantes
 * @param {string} currentPermissions - Permissions actuelles (-rwxr-xr-x)
 * @param {string} symbolicMode - Mode symbolique (ex: "u+x", "g-w", "a=r")
 * @returns {string} - Nouvelles permissions
 */
function applySymbolicMode(currentPermissions, symbolicMode) {
    // Parser le mode symbolique
    const match = symbolicMode.match(/^([augo]*)([\+\-=])([rwx]*)$/);
    if (!match) {
        throw new Error(`Mode symbolique invalide: ${symbolicMode}`);
    }
    
    const [, who, op, perms] = match;
    const whoChars = who || 'a'; // par défaut 'a' (all)
    
    // Convertir les permissions actuelles en tableau
    let permArray = currentPermissions.substring(1).split(''); // enlever le premier caractère (type)
    
    // Appliquer selon qui est concerné
    for (const w of whoChars) {
        let positions = [];
        
        if (w === 'u' || w === 'a') positions.push(...[0, 1, 2]); // user
        if (w === 'g' || w === 'a') positions.push(...[3, 4, 5]); // group
        if (w === 'o' || w === 'a') positions.push(...[6, 7, 8]); // other
        
        for (const pos of positions) {
            const permType = ['r', 'w', 'x'][pos % 3];
            
            if (op === '=') {
                // Reset puis set
                permArray[pos] = perms.includes(permType) ? permType : '-';
            } else if (op === '+') {
                // Ajouter permission
                if (perms.includes(permType)) {
                    permArray[pos] = permType;
                }
            } else if (op === '-') {
                // Retirer permission
                if (perms.includes(permType)) {
                    permArray[pos] = '-';
                }
            }
        }
    }
    
    return currentPermissions[0] + permArray.join('');
}

/**
 * Vérifie si l'utilisateur actuel peut modifier les permissions d'un fichier
 * @param {Object} fileItem - Élément du système de fichiers
 * @param {Object} currentUser - Utilisateur actuel
 * @returns {boolean} - true si autorisé
 */
function canModifyPermissions(fileItem, currentUser) {
    // root peut tout modifier
    if (currentUser.username === 'root') {
        return true;
    }
    
    // Propriétaire peut modifier les permissions
    if (fileItem.owner === currentUser.username) {
        return true;
    }
    
    return false;
}

/**
 * Collecte tous les fichiers récursivement d'un répertoire
 * @param {string} dirPath - Chemin du répertoire
 * @param {Object} fileSystem - Système de fichiers
 * @returns {Array} - Liste des chemins
 */
function getAllFilesRecursive(dirPath, fileSystem) {
    const files = [dirPath];
    
    Object.keys(fileSystem).forEach(path => {
        if (path !== dirPath && path.startsWith(dirPath + '/')) {
            files.push(path);
        }
    });
    
    return files;
}

/**
 * Commande chmod - Change les permissions de fichiers et dossiers
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, getCurrentPath, saveFileSystem)
 */
export function cmdChmod(args, context) {
    const { fileSystem, getCurrentPath, saveFileSystem } = context;
    const currentPath = getCurrentPath();
    
    const term = context.terminal;
    const errorFn = context?.showError || (str => { term.write(`${str}\r\n`) });
    const successFn = context?.showSuccess || (str => { term.write(`${str}\r\n`) });
    
    if (args.length < 2) {
        errorFn('chmod: opérande manquant');
        errorFn('Usage: chmod [OPTION]... MODE[,MODE]... FILE...');
        errorFn('  ou:  chmod [OPTION]... OCTAL-MODE FILE...');
        errorFn('Options:');
        errorFn('  -R, --recursive  traiter les fichiers et répertoires récursivement');
        return;
    }
    
    // Analyser les options
    let recursive = false;
    let fileArgs = [...args];
    
    // Gérer les options
    fileArgs = fileArgs.filter(arg => {
        if (arg === '-R' || arg === '--recursive') {
            recursive = true;
            return false;
        } else if (arg.startsWith('-')) {
            if (arg.includes('R')) recursive = true;
            return false;
        }
        return true;
    });
    
    if (fileArgs.length < 2) {
        errorFn('chmod: il manque un opérande après la spécification du mode');
        return;
    }
    
    const modes = fileArgs[0].split(','); // Support des modes multiples séparés par virgule
    const filePatterns = fileArgs.slice(1);
    
    // Obtenir l'utilisateur actuel
    const currentUser = context.currentUser;
    
    // Expander tous les patterns avec wildcards
    let allFiles = [];
    filePatterns.forEach(pattern => {
        const expandedFiles = expandGlob(pattern, currentPath, fileSystem);
        allFiles = allFiles.concat(expandedFiles);
    });
    
    // Supprimer les doublons
    allFiles = [...new Set(allFiles)];
    
    let successCount = 0;
    let errorCount = 0;
    
    allFiles.forEach(fileName => {
        const fullPath = resolvePath(fileName, currentPath);
        
        if (!fileSystem[fullPath]) {
            errorFn(`chmod: impossible d'accéder à '${fileName}': Aucun fichier ou dossier de ce type`);
            errorCount++;
            return;
        }
        
        const fileItem = fileSystem[fullPath];
        
        // Vérifier les permissions
        if (!canModifyPermissions(fileItem, currentUser)) {
            errorFn(`chmod: modification des permissions de '${fileName}': Opération non permise`);
            errorCount++;
            return;
        }
        
        // Collecter les fichiers à traiter (avec récursivité si demandée)
        let filesToProcess = [fullPath];
        if (recursive && fileItem.type === 'dir') {
            filesToProcess = getAllFilesRecursive(fullPath, fileSystem);
        }
        
        // Appliquer les modes à tous les fichiers concernés
        filesToProcess.forEach(targetPath => {
            const targetItem = fileSystem[targetPath];
            if (!targetItem) return;
            
            let newPermissions = targetItem.permissions;
            
            try {
                // Appliquer chaque mode
                modes.forEach(mode => {
                    mode = mode.trim();
                    
                    if (/^[0-7]{3,4}$/.test(mode)) {
                        // Mode numérique
                        newPermissions = numericToSymbolic(mode, targetItem.type === 'dir');
                    } else {
                        // Mode symbolique
                        newPermissions = applySymbolicMode(newPermissions, mode);
                    }
                });
                
                // Appliquer les nouvelles permissions
                fileSystem[targetPath].permissions = newPermissions;
                fileSystem[targetPath].modified = new Date();
                
            } catch (error) {
                errorFn(`chmod: ${error.message}`);
                errorCount++;
                return;
            }
        });
        
        successCount++;
    });
    
    if (successCount > 0) {
        saveFileSystem();
    }
    
    // chmod est normalement silencieux en cas de succès (comportement Unix)
    // On n'affiche des messages que s'il y a des erreurs
}