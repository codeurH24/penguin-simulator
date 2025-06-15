// bin/ls.js - Commande ls modernisée avec FileSystemService
// Équivalent de /bin/ls sous Debian avec gestion des permissions

import { 
    FileSystemService,
    PermissionDeniedError,
    FileNotFoundError,
    NotDirectoryError
} from '../modules/filesystem/index.js';

/**
 * Commande ls - Liste le contenu d'un répertoire avec vérification des permissions
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, currentPath, terminal, etc.)
 */
export function cmdLs(args, context) {
    const fs = new FileSystemService(context);
    const term = context.terminal;
    
    // Fonctions de sortie
    const outputFn = context?.addLine || (str => { term.write(`${str}\r\n`) });
    const errorFn = context?.showError || (str => { term.write(`${str}\r\n`) });
    
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
    
    // Déterminer le répertoire à lister
    const targetPath = pathArgs.length > 0 ? pathArgs[0] : context.getCurrentPath();
    
    try {
        // ✅ FileSystemService vérifie automatiquement :
        // - Existence du répertoire 
        // - Permissions de lecture (r) sur le répertoire
        // - Permissions de traverse (x) sur tout le chemin d'accès
        const entries = fs.listDirectory(targetPath);
        
        // Traiter les entrées récupérées
        let allItems = entries.map(entry => ({
            name: entry.name,
            path: entry.path,
            type: entry.type,
            entry: entry.entry,
            isSpecial: false
        }));
        
        // Filtrer les fichiers cachés si -a n'est pas utilisé
        if (!showAll) {
            allItems = allItems.filter(item => !item.name.startsWith('.'));
        }
        
        // Ajouter les entrées spéciales . et .. si option -a
        if (showAll) {
            try {
                // Obtenir l'entrée du répertoire courant
                const currentDirEntry = fs.getFile(targetPath, 'read');
                const currentItem = {
                    name: '.',
                    path: targetPath,
                    type: 'dir',
                    entry: currentDirEntry,
                    isSpecial: true
                };
                
                // Obtenir l'entrée du répertoire parent
                const parentPath = getParentPath(targetPath);
                try {
                    const parentDirEntry = fs.getFile(parentPath, 'read');
                    const parentItem = {
                        name: '..',
                        path: parentPath,
                        type: 'dir',
                        entry: parentDirEntry,
                        isSpecial: true
                    };
                    
                    allItems.unshift(currentItem, parentItem);
                } catch (error) {
                    // Si on ne peut pas lire le parent, ajouter juste .
                    allItems.unshift(currentItem);
                }
            } catch (error) {
                // Si on ne peut pas lire le répertoire courant, continuer sans . et ..
            }
        }
        
        // Si le répertoire est vide, ne rien afficher (comportement Linux standard)
        if (allItems.length === 0) {
            return;
        }
        
        if (longFormat) {
            // Calculer et afficher le total en premier
            const total = calculateTotal(allItems, humanReadable);
            outputFn(`total ${total}`, 'info');
            
            // Format détaillé ls -l
            showLongFormat(allItems, humanReadable, outputFn);
        } else {
            // Format simple ls (plusieurs colonnes)
            showSimpleFormat(allItems, outputFn);
        }
        
    } catch (error) {
        // ✅ Gestion moderne des erreurs avec types spécifiques
        if (error instanceof FileNotFoundError) {
            errorFn(`ls: ${targetPath}: Dossier introuvable`);
        } else if (error instanceof NotDirectoryError) {
            errorFn(`ls: ${targetPath}: N'est pas un dossier`);
        } else if (error instanceof PermissionDeniedError) {
            errorFn(`ls: ${targetPath}: Permission refusée`);
        } else {
            // Erreur inattendue
            errorFn(`ls: ${targetPath}: ${error.message}`);
        }
    }
}

/**
 * Obtient le chemin du répertoire parent
 * @param {string} path - Chemin du fichier
 * @returns {string} - Chemin du parent
 */
function getParentPath(path) {
    if (path === '/') return '/';
    const lastSlash = path.lastIndexOf('/');
    return lastSlash === 0 ? '/' : path.substring(0, lastSlash);
}

/**
 * Calcule le total des blocs utilisés
 * @param {Array} items - Liste des éléments
 * @param {boolean} humanReadable - Format human-readable
 * @returns {string} - Total formaté
 */
function calculateTotal(items, humanReadable) {
    let totalSize = 0;
    
    items.forEach(item => {
        totalSize += item.entry.size || (item.type === 'dir' ? 4096 : 0);
    });
    
    // Convertir en blocs de 1K (comme le vrai ls)
    const blocks = Math.ceil(totalSize / 1024);
    
    if (humanReadable) {
        return formatHumanReadable(totalSize);
    }
    
    return blocks.toString();
}

/**
 * Formate une taille en format human-readable
 * @param {number} size - Taille en octets
 * @returns {string} - Taille formatée
 */
function formatHumanReadable(size) {
    const units = ['B', 'K', 'M', 'G', 'T'];
    let unitIndex = 0;
    let value = size;
    
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
    }
    
    if (unitIndex === 0) {
        return `${value}${units[unitIndex]}`;
    } else {
        return `${value.toFixed(1)}${units[unitIndex]}`;
    }
}

/**
 * Affiche le format simple (noms seulement) avec couleurs
 * @param {Array} items - Liste des éléments
 * @param {Function} outputFn - Fonction d'affichage
 */
function showSimpleFormat(items, outputFn) {
    if (items.length === 0) {
        return;
    }

    // Trier les éléments par nom
    const sortedItems = [...items].sort((a, b) => a.name.localeCompare(b.name));
    
    // Créer une ligne avec les noms formatés
    const formattedNames = sortedItems.map(item => {
        if (item.type === 'dir') {
            return `${item.name}/`; // Ajouter / pour les dossiers
        } else {
            return item.name;
        }
    });
    
    // Afficher en une ligne séparée par des espaces
    const line = formattedNames.join('  ');
    outputFn(line);
}

/**
 * Affiche le format détaillé ls -l avec couleurs
 * @param {Array} items - Liste des éléments
 * @param {boolean} humanReadable - Format human-readable
 * @param {Function} outputFn - Fonction d'affichage
 */
function showLongFormat(items, humanReadable, outputFn) {
    // Trier les éléments (. et .. en premier, puis alphabétique)
    const sortedItems = [...items].sort((a, b) => {
        if (a.isSpecial && !b.isSpecial) return -1;
        if (!a.isSpecial && b.isSpecial) return 1;
        if (a.name === '.' && b.name === '..') return -1;
        if (a.name === '..' && b.name === '.') return 1;
        return a.name.localeCompare(b.name);
    });
    
    sortedItems.forEach(item => {
        const entry = item.entry;
        const permissions = entry.permissions || '-rw-r--r--';
        const links = entry.links || 1;
        const owner = entry.owner || 'root';
        const group = entry.group || 'root';
        const size = formatSize(entry.size || 0, humanReadable);
        const date = formatDate(entry.modified || new Date());
        
        let displayName = item.name;
        let className = '';
        
        // Déterminer la classe CSS selon le type
        if (item.type === 'dir') {
            displayName += '/';
            className = 'directory';
        }
        
        // Construire la ligne format ls -l
        const line = `${permissions} ${links.toString().padStart(3)} ${owner} ${group} ${size.padStart(8)} ${date} ${displayName}`;
        
        outputFn(line, className);
    });
}

/**
 * Formate une taille selon les options
 * @param {number} size - Taille en octets
 * @param {boolean} humanReadable - Format human-readable
 * @returns {string} - Taille formatée
 */
function formatSize(size, humanReadable) {
    if (humanReadable) {
        return formatHumanReadable(size);
    } else {
        return size.toString();
    }
}

/**
 * Formate une date pour l'affichage ls -l
 * @param {Date} date - Date à formater
 * @returns {string} - Date formatée
 */
function formatDate(date) {
    if (!date || !(date instanceof Date)) {
        date = new Date();
    }
    
    const now = new Date();
    const sixMonthsAgo = new Date(now.getTime() - (6 * 30 * 24 * 60 * 60 * 1000));
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const month = months[date.getMonth()];
    const day = date.getDate().toString().padStart(2);
    
    if (date > sixMonthsAgo) {
        // Fichier récent : afficher l'heure
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${month} ${day} ${hours}:${minutes}`;
    } else {
        // Fichier ancien : afficher l'année
        const year = date.getFullYear();
        return `${month} ${day}  ${year}`;
    }
}