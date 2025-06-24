// bin/ls.js - Commande ls modernisée avec FileSystemService
// Équivalent de /bin/ls sous Debian avec gestion des permissions

import { 
    FileSystemService
} from '../modules/filesystem/index.js';
import { 
    PermissionDeniedError,
    FileNotFoundError,
    NotDirectoryError
} from '../modules/filesystem/FileSystemExceptions.js';

/**
 * Valide les options de la commande ls
 * @param {Array} args - Arguments de la commande
 * @param {Function} errorFn - Fonction d'affichage des erreurs
 * @returns {Object|null} - {options, pathArgs} ou null en cas d'erreur
 */
function validateLsOptions(args, errorFn) {
    const options = {
        longFormat: false,
        showAll: false,
        humanReadable: false
    };
    const pathArgs = [];
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg.startsWith('-')) {
            // Options longues
            if (arg === '--help') {
                return { showHelp: true };
            } else if (arg === '--version') {
                return { showVersion: true };
            } else if (arg.startsWith('--')) {
                // Options longues non reconnues
                errorFn(`ls: option non reconnue « ${arg} »`);
                errorFn(`Essayez « ls --help » pour plus d'informations.`);
                return null;
            }
            
            // Options courtes (avec ou sans tiret simple)
            const optionChars = arg.slice(1); // Enlever le premier tiret
            
            for (const char of optionChars) {
                switch (char) {
                    case 'l':
                        options.longFormat = true;
                        break;
                    case 'a':
                        options.showAll = true;
                        break;
                    case 'h':
                        options.humanReadable = true;
                        break;
                    default:
                        // Option courte non reconnue
                        errorFn(`ls: option invalide -- « ${char} »`);
                        errorFn(`Essayez « ls --help » pour plus d'informations.`);
                        return null;
                }
            }
        } else {
            // Ce n'est pas une option, c'est un argument de chemin
            pathArgs.push(arg);
        }
    }
    
    return { options, pathArgs };
}

/**
 * Affiche l'aide de la commande ls
 * @param {Function} outputFn - Fonction d'affichage
 */
function showLsHelp(outputFn) {
    outputFn("Usage: ls [OPTION]... [FICHIER]...");
    outputFn("Liste les informations des FICHIERs (du répertoire courant par défaut).");
    outputFn("");
    outputFn("  -a                    ne pas ignorer les entrées qui commencent par .");
    outputFn("  -h                    avec -l, affiche les tailles sous forme lisible");
    outputFn("  -l                    utilise un format de liste long");
    outputFn("      --help            affiche cette aide et termine");
    outputFn("      --version         affiche la version et termine");
}

/**
 * Affiche la version de la commande ls
 * @param {Function} outputFn - Fonction d'affichage
 */
function showLsVersion(outputFn) {
    outputFn("ls (simulateur) 1.0");
    outputFn("Émulation de la commande ls de GNU coreutils");
}

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
    
    // Valider les options
    const validation = validateLsOptions(args, errorFn);
    if (!validation) {
        return; // Erreur de validation
    }
    
    // Gérer les options spéciales
    if (validation.showHelp) {
        showLsHelp(outputFn);
        return;
    }
    
    if (validation.showVersion) {
        showLsVersion(outputFn);
        return;
    }
    
    // Extraire les options et arguments validés
    const { longFormat, showAll, humanReadable } = validation.options;
    const pathArgs = validation.pathArgs || [];
    
    // Déterminer le répertoire à lister
    const targetPath = pathArgs.length > 0 ? pathArgs[0] : context.getCurrentPath();
    
    try {
        // Vérifier les permissions de liste sur le répertoire cible
        const dirEntry = fs.getFile(targetPath, 'list');

        if (dirEntry.type !== 'dir') {
            throw new NotDirectoryError(targetPath);
        }

        // Obtenir la liste des entrées
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
                    type: 'directory',
                    entry: currentDirEntry,
                    isSpecial: true
                };
                
                // Obtenir l'entrée du répertoire parent
                const parentPath = targetPath === '/' ? '/' : targetPath.replace(/\/[^/]+$/, '') || '/';
                const parentDirEntry = fs.getFile(parentPath, 'read');
                const parentItem = {
                    name: '..',
                    path: parentPath,
                    type: 'directory',
                    entry: parentDirEntry,
                    isSpecial: true
                };
                
                // Ajouter . et .. en premier
                allItems.unshift(parentItem, currentItem);
                
            } catch (error) {
                // Si on ne peut pas accéder aux entrées spéciales, les ignorer
                console.warn('Impossible d\'accéder aux entrées spéciales:', error.message);
            }
        }
        
        // Trier par nom (. et .. en premier si présents, puis alphabétique)
        allItems.sort((a, b) => {
            if (a.name === '.' && b.name !== '.') return -1;
            if (b.name === '.' && a.name !== '.') return 1;
            if (a.name === '..' && b.name !== '..') return -1;
            if (b.name === '..' && a.name !== '..') return 1;
            if (a.name === '.' && b.name === '..') return -1;
            if (a.name === '..' && b.name === '.') return 1;
            return a.name.localeCompare(b.name);
        });
        
        if (longFormat) {
            // Format long avec métadonnées détaillées
            displayLongFormat(allItems, outputFn, humanReadable);
        } else {
            // Format simple (noms seulement)
            displaySimpleFormat(allItems, outputFn);
        }
        
    } catch (error) {
        if (error instanceof FileNotFoundError) {
            errorFn(`ls: impossible d'accéder à '${targetPath}': Dossier introuvable`);
        } else if (error instanceof NotDirectoryError) {
            errorFn(`ls: impossible d'accéder à '${targetPath}': N'est pas un dossier`);
        } else if (error instanceof PermissionDeniedError) {
            errorFn(`ls: impossible d'accéder à '${targetPath}': Permission refusée`);
        } else {
            errorFn(`ls: erreur lors de l'accès à '${targetPath}': ${error.message}`);
        }
    }
}

/**
 * Affiche la liste en format simple (noms seulement)
 * @param {Array} items - Liste des éléments
 * @param {Function} outputFn - Fonction d'affichage
 */
function displaySimpleFormat(items, outputFn) {
    if (items.length === 0) {
        return;
    }
    
    // Grouper les éléments par ligne (simulation de colonnes)
    const names = items.map(item => {
        return { name: item.name, type: item.type };
    });
    
    // Affichage simple sur une ligne avec espaces
    const displayText = names.map(item => item.name).join('  ');
    outputFn(displayText);
}

/**
 * Affiche la liste en format long avec métadonnées
 * @param {Array} items - Liste des éléments
 * @param {Function} outputFn - Fonction d'affichage  
 * @param {boolean} humanReadable - Format lisible pour les tailles
 */
function displayLongFormat(items, outputFn, humanReadable = false) {
    if (items.length === 0) {
        return;
    }
    
    // Calculer la taille totale en blocs de 1024 octets
    // Le vrai ls utilise une logique spécifique pour le calcul des blocs
    const totalSize = items.reduce((sum, item) => {
        const size = item.entry?.size || 0;
        // Le vrai ls utilise des blocs de 1K mais avec un minimum de 4K par entrée
        const blocks = size > 0 ? Math.max(Math.ceil(size / 1024), 4) : 4;
        return sum + blocks;
    }, 0);
    
    // Afficher la ligne total
    let totalDisplay;
    if (humanReadable && totalSize >= 1) {
        totalDisplay = `total ${totalSize}K`;
    } else {
        totalDisplay = `total ${totalSize}`;
    }
    outputFn(totalDisplay, 'info');
    
    // Afficher chaque élément avec ses métadonnées
    items.forEach(item => {
        const line = formatLongEntry(item, humanReadable);
        const className = item.type === 'directory' ? 'directory' : 'file';
        outputFn(line, className);
    });
}

/**
 * Formate une entrée pour l'affichage long
 * @param {Object} item - Élément à formater
 * @param {boolean} humanReadable - Format lisible pour les tailles
 * @returns {string} - Ligne formatée
 */
function formatLongEntry(item, humanReadable = false) {
    const entry = item.entry || {};
    const isDir = item.type === 'directory' || item.type === 'dir';
    
    // Permissions (format Unix)
    const permissions = isDir ? 'drwxr-xr-x' : '-rw-r--r--';
    
    // Nombre de liens (toujours 1 pour les fichiers, 2+ pour dossiers)
    const links = isDir ? '2' : '1';
    
    // Propriétaire et groupe
    const owner = entry.owner || 'root';
    const group = entry.group || 'root';
    
    // Taille
    let size = entry.size || 0;
    let sizeStr;
    
    if (humanReadable && size >= 1024) {
        // Format human-readable (1K, 2M, etc.)
        if (size >= 1024 * 1024 * 1024) {
            sizeStr = `${(size / (1024 * 1024 * 1024)).toFixed(1)}G`;
        } else if (size >= 1024 * 1024) {
            sizeStr = `${(size / (1024 * 1024)).toFixed(1)}M`;
        } else {
            sizeStr = `${(size / 1024).toFixed(1)}K`;
        }
    } else {
        sizeStr = size.toString();
    }
    
    // Date de modification (format mmm dd hh:mm)
    const date = entry.modified ? new Date(entry.modified) : new Date();
    const monthNames = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun',
                       'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'];
    const month = monthNames[date.getMonth()];
    const day = date.getDate().toString().padStart(2, ' ');
    const time = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    const dateStr = `${month} ${day} ${time}`;
    
    // Nom du fichier (sans indicateur de dossier en format long)
    const displayName = item.name;
    
    // Assembler la ligne (format similaire à ls -l)
    return `${permissions} ${links.padStart(2)} ${owner.padEnd(8)} ${group.padEnd(8)} ${sizeStr.padStart(8)} ${dateStr} ${displayName}`;
}