// bin/chown.js - Commande chown (change owner) isolée avec support complet
// Équivalent de /bin/chown sous Debian

import { resolvePath } from '../modules/filesystem.js';
import { parsePasswdFile, parseGroupFile } from '../modules/users/user.service.js';

/**
 * Expanse un pattern en liste de fichiers matchants (globbing basique)
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
 * Parse la specification owner[:group] de chown
 * @param {string} ownerSpec - Specification "user:group", "user:", ":group", etc.
 * @returns {Object} - {newOwner: string|null, newGroup: string|null}
 */
function parseOwnerSpec(ownerSpec) {
    let newOwner = null;
    let newGroup = null;
    
    if (!ownerSpec || ownerSpec === ':') {
        // ":" seul ou vide = pas de changement
        return { newOwner, newGroup };
    }
    
    if (ownerSpec.includes(':')) {
        const parts = ownerSpec.split(':');
        const ownerPart = parts[0];
        const groupPart = parts[1];
        
        if (ownerPart) {
            newOwner = ownerPart;
        }
        
        if (groupPart) {
            newGroup = groupPart;
        } else if (ownerPart) {
            // "user:" = change owner and group to user's primary group
            newGroup = '_PRIMARY_GROUP_';
        }
    } else {
        // Seulement l'owner sans ":"
        newOwner = ownerSpec;
    }
    
    return { newOwner, newGroup };
}

/**
 * Valide qu'un utilisateur existe
 * @param {string} username - Nom d'utilisateur ou UID
 * @param {Object} fileSystem - Système de fichiers
 * @returns {Object|null} - User object ou null si inexistant
 */
function validateUser(username, fileSystem) {
    const users = parsePasswdFile(fileSystem);
    
    // Chercher par nom
    let user = users.find(u => u.username === username);
    if (user) return user;
    
    // Chercher par UID si c'est un nombre
    if (/^\d+$/.test(username)) {
        const uid = parseInt(username);
        user = users.find(u => u.uid === uid);
        if (user) return user;
    }
    
    return null;
}

/**
 * Valide qu'un groupe existe
 * @param {string} groupname - Nom de groupe ou GID
 * @param {Object} fileSystem - Système de fichiers
 * @returns {Object|null} - Group object ou null si inexistant
 */
function validateGroup(groupname, fileSystem) {
    const groups = parseGroupFile(fileSystem);
    
    // Chercher par nom
    let group = groups.find(g => g.name === groupname);
    if (group) return group;
    
    // Chercher par GID si c'est un nombre
    if (/^\d+$/.test(groupname)) {
        const gid = parseInt(groupname);
        group = groups.find(g => g.gid === gid);
        if (group) return group;
    }
    
    return null;
}

/**
 * Vérifie les permissions pour changer owner/group
 * @param {Object} fileItem - Élément du système de fichiers
 * @param {Object} currentUser - Utilisateur actuel
 * @param {string} newOwner - Nouveau propriétaire (peut être null)
 * @param {string} newGroup - Nouveau groupe (peut être null)
 * @param {Object} fileSystem - Système de fichiers
 * @returns {Object} - {canChangeOwner: boolean, canChangeGroup: boolean, error: string|null}
 */
function checkPermissions(fileItem, currentUser, newOwner, newGroup, fileSystem) {
    const result = {
        canChangeOwner: false,
        canChangeGroup: false,
        error: null
    };
    
    // root peut tout faire
    if (currentUser.username === 'root') {
        result.canChangeOwner = true;
        result.canChangeGroup = true;
        return result;
    }
    
    // Changement de propriétaire : seul root peut le faire
    if (newOwner) {
        result.error = `chown: opération non permise pour '${currentUser.username}'`;
        return result;
    }
    
    // Changement de groupe : propriétaire peut changer vers un groupe dont il est membre
    if (newGroup) {
        if (fileItem.owner !== currentUser.username) {
            result.error = `chown: opération non permise`;
            return result;
        }
        
        // Vérifier que l'utilisateur est membre du nouveau groupe
        const groups = parseGroupFile(fileSystem);
        const targetGroup = groups.find(g => g.name === newGroup || g.gid.toString() === newGroup);
        if (targetGroup) {
            const userGroups = currentUser.groups || [];
            if (!userGroups.includes(targetGroup.name)) {
                result.error = `chown: groupe '${newGroup}' invalide`;
                return result;
            }
        }
        
        result.canChangeGroup = true;
    }
    
    return result;
}

/**
 * Collecte tous les fichiers récursivement d'un répertoire
 * @param {string} dirPath - Chemin du répertoire
 * @param {Object} fileSystem - Système de fichiers
 * @returns {Array} - Liste des chemins triés (répertoires en premier)
 */
function getAllFilesRecursive(dirPath, fileSystem) {
    const files = [];
    const dirs = [];
    
    // Ajouter le répertoire lui-même
    if (fileSystem[dirPath] && fileSystem[dirPath].type === 'dir') {
        dirs.push(dirPath);
    } else {
        files.push(dirPath);
    }
    
    // Parcourir récursivement
    Object.keys(fileSystem).forEach(path => {
        if (path !== dirPath && path.startsWith(dirPath + '/')) {
            if (fileSystem[path].type === 'dir') {
                dirs.push(path);
            } else {
                files.push(path);
            }
        }
    });
    
    // Trier: répertoires en premier, puis fichiers
    return [...dirs.sort(), ...files.sort()];
}

/**
 * Obtient le groupe principal d'un utilisateur
 * @param {string} username - Nom d'utilisateur
 * @param {Object} fileSystem - Système de fichiers
 * @returns {string|null} - Nom du groupe principal
 */
function getPrimaryGroup(username, fileSystem) {
    const users = parsePasswdFile(fileSystem);
    const user = users.find(u => u.username === username);
    if (!user) return null;
    
    const groups = parseGroupFile(fileSystem);
    const primaryGroup = groups.find(g => g.gid === user.gid);
    return primaryGroup ? primaryGroup.name : null;
}

/**
 * Commande chown - Change le propriétaire et/ou le groupe de fichiers
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, getCurrentPath, saveFileSystem, currentUser)
 */
export function cmdChown(args, context) {
    const { fileSystem, getCurrentPath, saveFileSystem } = context;
    const currentPath = getCurrentPath();
    const currentUser = context.currentUser;
    
    const term = context.terminal;
    const errorFn = context?.showError || (str => { term.write(`${str}\r\n`) });
    const outputFn = context?.addLine || (str => { term.write(`${str}\r\n`) });
    
    if (args.length === 0) {
        errorFn('chown: opérande manquant');
        errorFn('Essayez « chown --help » pour plus d\'informations.');
        return;
    }
    
    // Parse les options
    let recursive = false;
    let verbose = false;
    let changesOnly = false;
    let silent = false;
    let noDeref = false;
    let fromOwner = null;
    let fromGroup = null;
    let pathArgs = [];
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg.startsWith('--from=')) {
            const fromSpec = arg.substring(7);
            if (fromSpec.includes(':')) {
                const parts = fromSpec.split(':');
                fromOwner = parts[0] || null;
                fromGroup = parts[1] || null;
            } else {
                fromOwner = fromSpec;
            }
        } else if (arg.startsWith('-') && arg !== '-') {
            // Options courtes
            for (const char of arg.substring(1)) {
                switch (char) {
                    case 'R':
                        recursive = true;
                        break;
                    case 'v':
                        verbose = true;
                        break;
                    case 'c':
                        changesOnly = true;
                        break;
                    case 'f':
                        silent = true;
                        break;
                    case 'h':
                        noDeref = true;
                        break;
                    default:
                        if (!silent) {
                            errorFn(`chown: option invalide -- '${char}'`);
                        }
                        return;
                }
            }
        } else {
            pathArgs.push(arg);
        }
    }
    
    if (pathArgs.length === 0) {
        errorFn('chown: opérande manquant');
        return;
    }
    
    // Premier argument = owner:group specification
    const ownerSpec = pathArgs[0];
    const filePaths = pathArgs.slice(1);
    
    if (filePaths.length === 0) {
        errorFn('chown: opérande manquant');
        errorFn('Essayez « chown --help » pour plus d\'informations.');
        return;
    }
    
    // Parse owner:group
    const { newOwner, newGroup } = parseOwnerSpec(ownerSpec);
    
    // Validation des utilisateurs/groupes
    let validatedNewOwner = null;
    let validatedNewGroup = null;
    let resolvedNewGroup = null;
    
    if (newOwner) {
        validatedNewOwner = validateUser(newOwner, fileSystem);
        if (!validatedNewOwner) {
            if (!silent) {
                errorFn(`chown: utilisateur invalide : '${newOwner}'`);
            }
            return;
        }
        
        // Gérer "user:" -> groupe principal de l'utilisateur
        if (newGroup === '_PRIMARY_GROUP_') {
            resolvedNewGroup = getPrimaryGroup(validatedNewOwner.username, fileSystem);
            if (!resolvedNewGroup) {
                if (!silent) {
                    errorFn(`chown: impossible de déterminer le groupe principal de '${newOwner}'`);
                }
                return;
            }
        }
    }
    
    if (newGroup && newGroup !== '_PRIMARY_GROUP_') {
        validatedNewGroup = validateGroup(newGroup, fileSystem);
        if (!validatedNewGroup) {
            if (!silent) {
                errorFn(`chown: groupe invalide : '${newGroup}'`);
            }
            return;
        }
        resolvedNewGroup = validatedNewGroup.name;
    }
    
    // Traitement des fichiers
    let hasErrors = false;
    
    filePaths.forEach(filePath => {
        // Expansion des patterns
        const expandedPaths = expandGlob(filePath, currentPath, fileSystem);
        
        expandedPaths.forEach(expandedPath => {
            const fullPath = resolvePath(expandedPath, currentPath);
            
            if (!fileSystem[fullPath]) {
                if (!silent) {
                    errorFn(`chown: impossible d'accéder à '${expandedPath}': Aucun fichier ou dossier de ce type`);
                }
                hasErrors = true;
                return;
            }
            
            // Collecter tous les fichiers à traiter
            let targetPaths = [fullPath];
            if (recursive && fileSystem[fullPath].type === 'dir') {
                targetPaths = getAllFilesRecursive(fullPath, fileSystem);
            }
            
            // Traitement de chaque fichier/dossier
            targetPaths.forEach(targetPath => {
                const fileItem = fileSystem[targetPath];
                
                // Vérifier --from si spécifié
                if (fromOwner && fileItem.owner !== fromOwner) {
                    return; // Skip si le propriétaire actuel ne correspond pas
                }
                if (fromGroup && fileItem.group !== fromGroup) {
                    return; // Skip si le groupe actuel ne correspond pas
                }
                
                // Déterminer les nouveaux propriétaire et groupe
                const finalNewOwner = validatedNewOwner ? validatedNewOwner.username : null;
                const finalNewGroup = resolvedNewGroup;
                
                // Vérifier les permissions
                const permissions = checkPermissions(fileItem, currentUser, finalNewOwner, finalNewGroup, fileSystem);
                if (permissions.error) {
                    if (!silent) {
                        errorFn(`chown: ${permissions.error}`);
                    }
                    hasErrors = true;
                    return;
                }
                
                // Effectuer les changements
                let changed = false;
                const oldOwner = fileItem.owner;
                const oldGroup = fileItem.group;
                
                if (finalNewOwner && permissions.canChangeOwner && fileItem.owner !== finalNewOwner) {
                    fileItem.owner = finalNewOwner;
                    changed = true;
                }
                
                if (finalNewGroup && permissions.canChangeGroup && fileItem.group !== finalNewGroup) {
                    fileItem.group = finalNewGroup;
                    changed = true;
                }
                
                // Messages de sortie
                if (changed || (!changesOnly && verbose)) {
                    if (verbose || changesOnly) {
                        if (changed || verbose) {
                            const newOwnerDisplay = fileItem.owner;
                            const newGroupDisplay = fileItem.group;
                            const displayPath = targetPath.startsWith(currentPath + '/') ? 
                                targetPath.substring(currentPath.length + 1) : targetPath;
                            
                            if (changed) {
                                outputFn(`propriétaire de '${displayPath}' conservé en tant que ${newOwnerDisplay}:${newGroupDisplay}`);
                            } else if (verbose) {
                                outputFn(`propriétaire de '${displayPath}' conservé en tant que ${newOwnerDisplay}:${newGroupDisplay}`);
                            }
                        }
                    }
                }
                
                // Mettre à jour les timestamps
                if (changed) {
                    fileItem.modified = new Date();
                }
            });
        });
    });
    
    // Sauvegarder les changements
    if (!hasErrors || context.saveOnError !== false) {
        saveFileSystem();
    }
}