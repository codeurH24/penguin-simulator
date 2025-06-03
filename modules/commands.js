// commands.js - Module des commandes bash
// Contient toutes les implémentations des commandes du terminal

import { resolvePath, getBasename, getDirname } from './filesystem.js';
import { addLine, showError, showSuccess, showListing, clearTerminal } from './terminal.js';

/**
 * Commande help - Affiche l'aide
 */
export function cmdHelp() {
    addLine('Commandes disponibles:');
    addLine('  ls          - Lister le contenu');
    addLine('  cd <dir>    - Changer de dossier');
    addLine('  mkdir [-p] <dir> - Créer un dossier (-p: créer parents)');
    addLine('  mv <src> <dest> - Déplacer/renommer');
    addLine('  rm [-r] [-f] <files> - Supprimer (-r: récursif, -f: forcer)');
    addLine('  pwd         - Afficher le chemin');
    addLine('  clear       - Vider le terminal');
    addLine('  reset       - Réinitialiser');
}

/**
 * Commande ls - Liste le contenu d'un répertoire
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, currentPath)
 */
export function cmdLs(args, context) {
    const { fileSystem, currentPath } = context;
    const lsPath = args.length > 0 ? resolvePath(args[0], currentPath) : currentPath;
    
    if (!fileSystem[lsPath]) {
        showError(`ls: ${args[0] || lsPath}: Dossier introuvable`);
        return;
    }
    
    if (fileSystem[lsPath].type !== 'dir') {
        showError(`ls: ${args[0]}: N'est pas un dossier`);
        return;
    }

    const items = Object.keys(fileSystem).filter(path => {
        if (path === lsPath) return false;
        const prefix = lsPath === '/' ? '/' : lsPath + '/';
        if (!path.startsWith(prefix)) return false;
        const relativePath = path.substring(prefix.length);
        return !relativePath.includes('/');
    });

    showListing(items, (path) => fileSystem[path].type === 'dir');
}

/**
 * Commande cd - Change de répertoire
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, currentPath, setCurrentPath, saveFileSystem)
 */
export function cmdCd(args, context) {
    const { fileSystem, currentPath, setCurrentPath, saveFileSystem } = context;
    
    if (args.length === 0) {
        setCurrentPath('/');
        saveFileSystem();
        return;
    }

    const targetPath = resolvePath(args[0], currentPath);
    
    if (!fileSystem[targetPath]) {
        showError(`cd: ${args[0]}: Dossier introuvable`);
        return;
    }
    
    if (fileSystem[targetPath].type !== 'dir') {
        showError(`cd: ${args[0]}: N'est pas un dossier`);
        return;
    }

    setCurrentPath(targetPath);
    saveFileSystem();
}

/**
 * Commande mkdir - Crée des répertoires
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, currentPath, saveFileSystem)
 */
export function cmdMkdir(args, context) {
    const { fileSystem, currentPath, saveFileSystem } = context;
    
    if (args.length === 0) {
        showError('mkdir: nom de dossier manquant');
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
        showError('mkdir: nom de dossier manquant');
        return;
    }

    dirArgs.forEach(dirName => {
        const fullPath = resolvePath(dirName, currentPath);

        if (fileSystem[fullPath]) {
            if (!createParents) {
                showError(`mkdir: ${dirName}: Le dossier existe déjà`);
            }
        } else {
            // Créer les répertoires parents si nécessaire
            if (createParents) {
                const parts = fullPath.split('/').filter(p => p);
                let currentDir = '';

                for (const part of parts) {
                    currentDir = currentDir === '' ? '/' + part : currentDir + '/' + part;
                    if (!fileSystem[currentDir]) {
                        fileSystem[currentDir] = { type: 'dir' };
                    }
                }
                showSuccess(`Dossier '${dirName}' créé (avec parents)`);
            } else {
                // Vérifier que le parent existe
                const parentPath = getDirname(fullPath);
                if (!fileSystem[parentPath]) {
                    showError(`mkdir: ${dirName}: Le répertoire parent n'existe pas`);
                    return;
                }
                fileSystem[fullPath] = { type: 'dir' };
                showSuccess(`Dossier '${dirName}' créé`);
            }
            saveFileSystem();
        }
    });
}

/**
 * Commande mv - Déplace/renomme des fichiers et dossiers
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, currentPath, saveFileSystem)
 */
export function cmdMv(args, context) {
    const { fileSystem, currentPath, saveFileSystem } = context;
    
    if (args.length < 2) {
        showError('mv: source et destination requises');
        showError('Usage: mv <source> <destination>');
        return;
    }

    const sourcePath = resolvePath(args[0], currentPath);
    let destPath = resolvePath(args[1], currentPath);

    if (!fileSystem[sourcePath]) {
        showError(`mv: ${args[0]}: Fichier ou dossier introuvable`);
        return;
    }

    // Si la destination est un dossier existant, déplacer DANS ce dossier
    if (fileSystem[destPath] && fileSystem[destPath].type === 'dir') {
        const sourceName = getBasename(sourcePath);
        destPath = destPath === '/' ? '/' + sourceName : destPath + '/' + sourceName;
    }

    if (fileSystem[destPath] && destPath !== sourcePath) {
        showError(`mv: ${args[1]}: La destination existe déjà`);
        return;
    }

    if (destPath === sourcePath) {
        showError(`mv: '${args[0]}' et '${args[1]}' sont le même fichier`);
        return;
    }

    // Déplacer l'élément
    fileSystem[destPath] = fileSystem[sourcePath];
    delete fileSystem[sourcePath];

    // Si c'est un dossier, déplacer aussi tout son contenu
    if (fileSystem[destPath].type === 'dir') {
        const sourcePrefix = sourcePath === '/' ? '/' : sourcePath + '/';
        const destPrefix = destPath === '/' ? '/' : destPath + '/';

        const childPaths = Object.keys(fileSystem).filter(path =>
            path.startsWith(sourcePrefix) && path !== sourcePath
        );

        childPaths.forEach(childPath => {
            const relativePath = childPath.substring(sourcePrefix.length);
            const newChildPath = destPrefix + relativePath;
            fileSystem[newChildPath] = fileSystem[childPath];
            delete fileSystem[childPath];
        });
    }

    showSuccess(`'${args[0]}' déplacé vers '${getBasename(destPath)}'`);
    saveFileSystem();
}

/**
 * Commande rm - Supprime des fichiers et dossiers
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, currentPath, saveFileSystem)
 */
export function cmdRm(args, context) {
    const { fileSystem, currentPath, saveFileSystem } = context;
    
    if (args.length === 0) {
        showError('rm: opérande manquant');
        showError('Usage: rm [-r] [-f] <fichiers...>');
        return;
    }

    // Gérer les options
    let recursive = false;
    let force = false;
    let fileArgs = [...args];

    // Extraire les options
    fileArgs = fileArgs.filter(arg => {
        if (arg === '-r' || arg === '-R') {
            recursive = true;
            return false;
        } else if (arg === '-f') {
            force = true;
            return false;
        } else if (arg.startsWith('-')) {
            // Options combinées comme -rf
            if (arg.includes('r') || arg.includes('R')) recursive = true;
            if (arg.includes('f')) force = true;
            return false;
        }
        return true;
    });

    if (fileArgs.length === 0) {
        showError('rm: aucun fichier spécifié');
        return;
    }

    fileArgs.forEach(fileName => {
        const fullPath = resolvePath(fileName, currentPath);

        if (!fileSystem[fullPath]) {
            if (!force) {
                showError(`rm: ${fileName}: Fichier ou dossier introuvable`);
            }
            return;
        }

        const item = fileSystem[fullPath];

        // Vérifier si c'est un dossier
        if (item.type === 'dir') {
            // Vérifier si le dossier a du contenu
            const hasContent = Object.keys(fileSystem).some(path => {
                const prefix = fullPath === '/' ? '/' : fullPath + '/';
                return path.startsWith(prefix) && path !== fullPath;
            });

            if (hasContent && !recursive) {
                showError(`rm: ${fileName}: est un répertoire`);
                return;
            }

            // Supprimer récursivement si -r
            if (recursive) {
                const toDelete = Object.keys(fileSystem).filter(path => {
                    return path === fullPath || path.startsWith(fullPath + '/');
                });

                toDelete.forEach(path => {
                    delete fileSystem[path];
                });

                showSuccess(`Dossier '${fileName}' supprimé (récursif)`);
            } else if (!hasContent) {
                // Dossier vide, on peut le supprimer
                delete fileSystem[fullPath];
                showSuccess(`Dossier vide '${fileName}' supprimé`);
            }
        } else {
            // C'est un fichier
            delete fileSystem[fullPath];
            showSuccess(`Fichier '${fileName}' supprimé`);
        }

        saveFileSystem();
    });
}

/**
 * Commande pwd - Affiche le répertoire courant
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (currentPath)
 */
export function cmdPwd(args, context) {
    const { currentPath } = context;
    addLine(currentPath);
}

/**
 * Commande clear - Efface le terminal
 */
export function cmdClear() {
    clearTerminal();
}

/**
 * Commande reset - Réinitialise le système de fichiers
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, setCurrentPath, saveFileSystem)
 */
export function cmdReset(args, context) {
    const { fileSystem, setCurrentPath, saveFileSystem } = context;
    
    // Réinitialiser le système de fichiers
    Object.keys(fileSystem).forEach(key => delete fileSystem[key]);
    fileSystem['/'] = { type: 'dir' };
    fileSystem['/home'] = { type: 'dir' };
    fileSystem['/home/user'] = { type: 'dir' };
    
    setCurrentPath('/');
    saveFileSystem();
    showSuccess('🔄 Système de fichiers réinitialisé');
}

/**
 * Fonction principale pour exécuter une commande
 * @param {string} command - Commande complète à exécuter
 * @param {Object} context - Contexte d'exécution
 */
export function executeCommand(command, context) {
    const parts = command.trim().split(' ').filter(p => p);
    if (parts.length === 0) return;

    const cmd = parts[0];
    const args = parts.slice(1);

    // Dispatcher vers la bonne commande
    switch (cmd) {
        case 'help':
            cmdHelp();
            break;
        case 'ls':
            cmdLs(args, context);
            break;
        case 'cd':
            cmdCd(args, context);
            break;
        case 'mkdir':
            cmdMkdir(args, context);
            break;
        case 'mv':
            cmdMv(args, context);
            break;
        case 'rm':
            cmdRm(args, context);
            break;
        case 'pwd':
            cmdPwd(args, context);
            break;
        case 'clear':
            cmdClear();
            break;
        case 'reset':
            cmdReset(args, context);
            break;
        default:
            showError(`bash: ${cmd}: commande introuvable`);
    }
}

/**
 * Obtient la liste de toutes les commandes disponibles
 * @returns {Array} - Liste des commandes disponibles
 */
export function getAvailableCommands() {
    return ['help', 'ls', 'cd', 'mkdir', 'mv', 'rm', 'pwd', 'clear', 'reset'];
}

/**
 * Vérifie si une commande existe
 * @param {string} command - Nom de la commande
 * @returns {boolean} - true si la commande existe
 */
export function commandExists(command) {
    return getAvailableCommands().includes(command);
}