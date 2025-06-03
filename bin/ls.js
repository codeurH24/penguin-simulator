// bin/ls.js - Commande ls (list) isolée avec support des redirections
// Équivalent de /bin/ls sous Debian

import { resolvePath } from '../modules/filesystem.js';
import { addLine, showError } from '../modules/terminal.js';

/**
 * Commande ls - Liste le contenu d'un répertoire
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, currentPath, peut contenir addLine personnalisé)
 */
export function cmdLs(args, context) {
    const { fileSystem, currentPath } = context;
    
    // Utiliser addLine du contexte si disponible, sinon celui par défaut
    const outputFn = context?.addLine || addLine;
    
    // Gérer les options
    let longFormat = false;
    let showAll = false;
    let humanReadable = false;
    let pathArgs = [...args];
    
    // Extraire les options
    pathArgs = pathArgs.filter(arg => {
        if (arg.startsWith('-')) {
            if (arg.includes('l')) longFormat = true;
            if (arg.includes('a')) showAll = true;
            if (arg.includes('h')) humanReadable = true;
            return false;
        }
        return true;
    });
    
    const lsPath = pathArgs.length > 0 ? resolvePath(pathArgs[0], currentPath) : currentPath;
    
    if (!fileSystem[lsPath]) {
        showError(`ls: ${pathArgs[0] || lsPath}: Dossier introuvable`);
        return;
    }
    
    if (fileSystem[lsPath].type !== 'dir') {
        showError(`ls: ${pathArgs[0] || ''}: N'est pas un dossier`);
        return;
    }

    // Récupérer tous les éléments du répertoire
    const items = Object.keys(fileSystem).filter(path => {
        if (path === lsPath) return false;
        const prefix = lsPath === '/' ? '/' : lsPath + '/';
        if (!path.startsWith(prefix)) return false;
        const relativePath = path.substring(prefix.length);
        return !relativePath.includes('/');
    });

    // Ajouter les entrées spéciales . et .. si option -a
    let allItems = [...items];
    if (showAll) {
        // Créer les entrées . et .. 
        const currentDir = {
            path: lsPath,
            isSpecial: true,
            name: '.',
            ...fileSystem[lsPath]
        };
        
        const parentPath = lsPath === '/' ? '/' : lsPath.split('/').slice(0, -1).join('/') || '/';
        const parentDir = {
            path: parentPath,
            isSpecial: true, 
            name: '..',
            ...fileSystem[parentPath]
        };
        
        allItems.unshift(currentDir, parentDir);
    }

    if (allItems.length === 0 && !showAll) {
        return; // Dossier vide, ne rien afficher
    }

    if (longFormat) {
        // Calculer et afficher le total en premier
        const total = calculateTotal(allItems, fileSystem, humanReadable);
        outputFn(`total ${total}`);
        
        // Format détaillé ls -l
        showLongFormat(allItems, fileSystem, humanReadable, outputFn);
    } else {
        // Format simple ls (plusieurs colonnes)
        showSimpleFormat(allItems, fileSystem, outputFn);
    }
}

/**
 * Calcule le total des blocs utilisés
 * @param {Array} items - Liste des éléments
 * @param {Object} fileSystem - Système de fichiers
 * @param {boolean} humanReadable - Format human-readable
 * @returns {string} - Total formaté
 */
function calculateTotal(items, fileSystem, humanReadable) {
    let totalSize = 0;
    
    items.forEach(item => {
        if (item.isSpecial) {
            // Pour . et .., utiliser la taille de l'item lui-même
            totalSize += item.size || 4096;
        } else {
            const fsItem = fileSystem[item];
            totalSize += fsItem.size || (fsItem.type === 'dir' ? 4096 : 0);
        }
    });
    
    // Convertir en blocs de 1K (comme le vrai ls)
    const blocks = Math.ceil(totalSize / 1024);
    
    if (humanReadable) {
        // En mode human-readable, toujours afficher l'unité K
        return blocks + 'K';
    }
    
    return blocks.toString();
}

/**
 * Affiche le format simple (noms seulement, sur plusieurs colonnes)
 * @param {Array} items - Liste des éléments
 * @param {Object} fileSystem - Système de fichiers
 * @param {Function} outputFn - Fonction d'affichage
 */
function showSimpleFormat(items, fileSystem, outputFn) {
    // Extraire les noms et trier
    const names = items.map(item => {
        if (item.isSpecial) {
            return item.name;
        }
        return item.split('/').pop();
    }).sort();
    
    // Afficher sur une seule ligne séparés par des espaces
    if (names.length > 0) {
        outputFn(names.join('  '));
    }
}

/**
 * Affiche le format détaillé ls -l
 * @param {Array} items - Liste des éléments
 * @param {Object} fileSystem - Système de fichiers
 * @param {boolean} humanReadable - Format human-readable
 * @param {Function} outputFn - Fonction d'affichage
 */
function showLongFormat(items, fileSystem, humanReadable, outputFn) {
    // Trier les éléments (. et .. en premier)
    const sortedItems = items.sort((a, b) => {
        if (a.isSpecial && b.isSpecial) {
            return a.name.localeCompare(b.name);
        }
        if (a.isSpecial) return -1;
        if (b.isSpecial) return 1;
        return a.localeCompare(b);
    });
    
    sortedItems.forEach(item => {
        let fsItem, name;
        
        if (item.isSpecial) {
            fsItem = item;
            name = item.name;
        } else {
            fsItem = fileSystem[item];
            name = item.split('/').pop();
        }
        
        // Utiliser les vraies métadonnées ou valeurs par défaut
        const permissions = fsItem.permissions || (fsItem.type === 'dir' ? 'drwxr-xr-x' : '-rw-r--r--');
        const links = fsItem.links?.toString() || (fsItem.type === 'dir' ? '2' : '1');
        const owner = fsItem.owner || 'root';
        const group = fsItem.group || 'root';
        
        // Formater la taille
        let size = fsItem.size !== undefined ? fsItem.size : (fsItem.type === 'dir' ? 4096 : 0);
        let sizeStr;
        
        if (humanReadable) {
            sizeStr = formatHumanReadable(size);
        } else {
            sizeStr = size.toString();
        }
        
        // Utiliser la vraie date de modification
        const modDate = fsItem.modified ? new Date(fsItem.modified) : new Date();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames[modDate.getMonth()];
        const day = modDate.getDate().toString().padStart(2, ' ');
        const time = modDate.toTimeString().substr(0, 5);
        
        // Format détaillé avec vraies données
        const line = `${permissions} ${links.padStart(2)} ${owner} ${group} ${sizeStr.padStart(4)} ${month} ${day} ${time} ${name}`;
        outputFn(line);
    });
}

/**
 * Formate une taille en format human-readable
 * @param {number} bytes - Taille en bytes
 * @returns {string} - Taille formatée (K, M, G)
 */
function formatHumanReadable(bytes) {
    if (bytes === 0) return '0';
    
    const units = ['', 'K', 'M', 'G', 'T'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    
    if (unitIndex === 0) {
        return size.toString();
    }
    
    // Arrondir à 1 décimale si nécessaire
    if (size < 10) {
        return size.toFixed(1) + units[unitIndex];
    } else {
        return Math.round(size) + units[unitIndex];
    }
}