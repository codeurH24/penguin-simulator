// bin/grep.js - Commande grep (recherche de motifs dans les fichiers)
// Équivalent de /bin/grep sous Debian avec support des patterns et options de base

import { resolvePath } from '../modules/filesystem.js';
import { 
    FileSystemService,
    PermissionDeniedError,
    FileNotFoundError,
    IsDirectoryError
} from '../modules/filesystem/index.js';

/**
 * Commande grep - Recherche de motifs dans des fichiers ou l'entrée standard
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, currentPath, terminal, etc.)
 */
export function cmdGrep(args, context) {
    const fs = new FileSystemService(context);
    const term = context.terminal;
    
    // Fonctions de sortie
    const outputFn = context?.addLine || (str => { term.write(`${str}\r\n`) });
    const errorFn = context?.showError || (str => { term.write(`${str}\r\n`) });
    
    if (args.length === 0) {
        errorFn('grep: Pattern manquant');
        errorFn('Usage: grep [options] PATTERN [FILE...]');
        return;
    }
    
    // Gérer les options
    let ignoreCase = false;
    let invertMatch = false;
    let showLineNumbers = false;
    let showOnlyCount = false;
    let showFilenames = false;
    let recursive = false;
    let quiet = false;
    let fixedStrings = false;
    let extendedRegexp = false;
    let wordMatch = false;
    let lineMatch = false;
    let pathArgs = [...args];
    
    // Extraire les options
    let pattern = null;
    let fileArgs = [];
    
    for (let i = 0; i < pathArgs.length; i++) {
        const arg = pathArgs[i];
        
        if (arg.startsWith('-') && !pattern) {
            // Traiter les options
            for (let j = 1; j < arg.length; j++) {
                const option = arg[j];
                switch (option) {
                    case 'i':
                        ignoreCase = true;
                        break;
                    case 'v':
                        invertMatch = true;
                        break;
                    case 'n':
                        showLineNumbers = true;
                        break;
                    case 'c':
                        showOnlyCount = true;
                        break;
                    case 'H':
                        showFilenames = true;
                        break;
                    case 'r':
                    case 'R':
                        recursive = true;
                        break;
                    case 'q':
                        quiet = true;
                        break;
                    case 'F':
                        fixedStrings = true;
                        break;
                    case 'E':
                        extendedRegexp = true;
                        break;
                    case 'w':
                        wordMatch = true;
                        break;
                    case 'x':
                        lineMatch = true;
                        break;
                    default:
                        errorFn(`grep: option invalide -- '${option}'`);
                        return;
                }
            }
        } else if (!pattern) {
            // Premier argument non-option = pattern
            pattern = arg;
        } else {
            // Arguments restants = fichiers
            fileArgs.push(arg);
        }
    }
    
    if (!pattern) {
        errorFn('grep: Pattern manquant');
        return;
    }
    
    // Préparer le pattern de recherche
    let searchPattern;
    try {
        if (fixedStrings) {
            // Recherche de chaîne fixe (échapper les caractères regex)
            searchPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        } else {
            searchPattern = pattern;
        }
        
        if (wordMatch) {
            searchPattern = `\\b${searchPattern}\\b`;
        }
        if (lineMatch) {
            searchPattern = `^${searchPattern}$`;
        }
        
        const flags = ignoreCase ? 'gi' : 'g';
        searchPattern = new RegExp(searchPattern, flags);
    } catch (error) {
        errorFn(`grep: Pattern invalide: ${error.message}`);
        return;
    }
    
    // Si aucun fichier spécifié, lire depuis stdin
    if (fileArgs.length === 0) {
        if (context.stdin && context.stdin.trim()) {
            searchInText(context.stdin, searchPattern, {
                ignoreCase,
                invertMatch,
                showLineNumbers,
                showOnlyCount,
                quiet,
                filename: null
            }, outputFn);
        } else {
            errorFn('grep: Aucun fichier spécifié et aucune entrée standard');
        }
        return;
    }
    
    // Traiter les fichiers spécifiés
    let totalMatches = 0;
    const shouldShowFilenames = fileArgs.length > 1 || showFilenames;
    
    for (const filePath of fileArgs) {
        try {
            const resolvedPath = resolvePath(filePath, context.getCurrentPath());
            
            // Vérifier si c'est un répertoire
            const fileEntry = fs.getFile(resolvedPath, 'read');
            
            if (fileEntry.type === 'directory') {
                if (recursive) {
                    // Traitement récursif - pour l'instant pas implémenté
                    errorFn(`grep: ${filePath}: est un répertoire (récursif pas encore supporté)`);
                } else {
                    errorFn(`grep: ${filePath}: est un répertoire`);
                }
                continue;
            }
            
            // Lire le contenu du fichier
            const content = fileEntry.content;
            const matches = searchInText(content, searchPattern, {
                ignoreCase,
                invertMatch,
                showLineNumbers,
                showOnlyCount,
                quiet,
                filename: shouldShowFilenames ? filePath : null
            }, outputFn);
            
            totalMatches += matches;
            
        } catch (error) {
            if (error instanceof PermissionDeniedError) {
                errorFn(`grep: ${filePath}: Permission refusée`);
            } else if (error instanceof FileNotFoundError) {
                errorFn(`grep: ${filePath}: Aucun fichier ou dossier de ce type`);
            } else if (error instanceof IsDirectoryError) {
                errorFn(`grep: ${filePath}: est un répertoire`);
            } else {
                errorFn(`grep: ${filePath}: ${error.message}`);
            }
        }
    }
    
    // Si count global demandé
    if (showOnlyCount && fileArgs.length > 1) {
        outputFn(`Total: ${totalMatches}`);
    }
}

/**
 * Recherche un pattern dans un texte et affiche les résultats
 * @param {string} text - Texte à analyser
 * @param {RegExp} pattern - Pattern de recherche
 * @param {Object} options - Options de recherche
 * @param {Function} outputFn - Fonction d'affichage
 * @returns {number} - Nombre de correspondances trouvées
 */
function searchInText(text, pattern, options, outputFn) {
    const {
        invertMatch,
        showLineNumbers,
        showOnlyCount,
        quiet,
        filename
    } = options;
    
    const lines = text.split('\n');
    let matchCount = 0;
    const matchingLines = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const matches = line.match(pattern);
        const hasMatch = matches && matches.length > 0;
        
        // Appliquer la logique d'inversion si nécessaire
        const shouldInclude = invertMatch ? !hasMatch : hasMatch;
        
        if (shouldInclude) {
            matchCount++;
            
            if (!quiet && !showOnlyCount) {
                let outputLine = '';
                
                // Ajouter le nom de fichier si nécessaire
                if (filename) {
                    outputLine += `${filename}:`;
                }
                
                // Ajouter le numéro de ligne si demandé
                if (showLineNumbers) {
                    outputLine += `${i + 1}:`;
                }
                
                outputLine += line;
                matchingLines.push(outputLine);
            }
        }
    }
    
    // Afficher les résultats
    if (showOnlyCount) {
        let countOutput = '';
        if (filename) {
            countOutput += `${filename}:`;
        }
        countOutput += matchCount;
        outputFn(countOutput);
    } else if (!quiet) {
        matchingLines.forEach(line => outputFn(line));
    }
    
    return matchCount;
}