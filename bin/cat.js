// bin/cat.js - Commande cat (concatenate) isolée
// Équivalent de /bin/cat sous Debian

import { resolvePath } from '../modules/filesystem.js';
import { addLine, showError } from '../modules/terminal.js';

/**
 * Commande cat - Affiche et concatène le contenu de fichiers
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, currentPath, peut contenir addLine personnalisé)
 */
export function cmdCat(args, context) {

    const { fileSystem, getCurrentPath } = context;
    const currentPath = getCurrentPath();
    
    // Utiliser addLine du contexte si disponible, sinon celui par défaut
    const outputFn = context?.addLine || addLine;
    
    // Si aucun argument, lire depuis stdin (simulation)
    if (args.length === 0) {
        showError('cat: lecture depuis stdin non supportée');
        showError('Usage: cat <fichier1> [fichier2] ...');
        return;
    }
    
    // Gérer les options
    let showLineNumbers = false;
    let showNonPrintable = false;
    let showEnds = false;
    let fileArgs = [...args];
    
    // Extraire les options
    fileArgs = fileArgs.filter(arg => {
        if (arg.startsWith('-')) {
            if (arg.includes('n')) showLineNumbers = true;      // -n: numéroter les lignes
            if (arg.includes('v')) showNonPrintable = true;     // -v: afficher caractères non-imprimables
            if (arg.includes('E')) showEnds = true;             // -E: marquer la fin des lignes
            return false;
        }
        return true;
    });
    
    if (fileArgs.length === 0) {
        showError('cat: aucun fichier spécifié');
        return;
    }
    
    let lineNumber = 1;
    
    // Traiter chaque fichier
    fileArgs.forEach((fileName, fileIndex) => {
        const filePath = resolvePath(fileName, currentPath);
        
        if (!fileSystem[filePath]) {
            showError(`cat: ${fileName}: Fichier introuvable`);
            return;
        }
        
        const file = fileSystem[filePath];
        if (file.type !== 'file') {
            showError(`cat: ${fileName}: N'est pas un fichier`);
            return;
        }
        
        // Mettre à jour la date d'accès
        file.accessed = new Date();
        
        // Obtenir le contenu
        const content = file.content || '';
        
        if (content) {
            const lines = content.split('\n');
            
            // Traiter chaque ligne
            lines.forEach((line, lineIndex) => {
                let formattedLine = line;
                
                // Appliquer les options
                if (showNonPrintable) {
                    formattedLine = formatNonPrintable(formattedLine);
                }
                
                if (showEnds && lineIndex < lines.length - 1) {
                    formattedLine += '$';
                }
                
                if (showLineNumbers) {
                    // Numéroter seulement les lignes non-vides ou la dernière ligne si elle n'est pas vide
                    if (line || lineIndex < lines.length - 1) {
                        formattedLine = lineNumber.toString().padStart(6) + '  ' + formattedLine;
                        lineNumber++;
                    }
                }
                
                outputFn(formattedLine);
            });
        } else {
            // Fichier vide - rien à afficher
        }
    });
}

/**
 * Formate les caractères non-imprimables pour l'option -v
 * @param {string} text - Texte à formater
 * @returns {string} - Texte avec caractères non-imprimables visibles
 */
function formatNonPrintable(text) {
    return text
        .replace(/\t/g, '^I')          // Tabulation
        .replace(/\r/g, '^M')          // Retour chariot
        .replace(/\x00/g, '^@')        // Caractère null
        .replace(/\x1b/g, '^[')        // Escape
        .replace(/\x7f/g, '^?')        // DEL
        // Afficher les caractères de contrôle (0x01-0x1F sauf \t)
        .replace(/[\x01-\x08\x0b-\x0c\x0e-\x1f]/g, (match) => {
            return '^' + String.fromCharCode(match.charCodeAt(0) + 64);
        });
}

/**
 * Version alternative de cat qui lit depuis une chaîne (pour les pipes futurs)
 * @param {string} content - Contenu à afficher
 * @param {Object} options - Options de formatage
 * @param {Function} outputFn - Fonction d'affichage
 */
export function catFromString(content, options = {}, outputFn = addLine) {
    const { showLineNumbers = false, showNonPrintable = false, showEnds = false } = options;
    
    if (!content) return;
    
    const lines = content.split('\n');
    let lineNumber = 1;
    
    lines.forEach((line, lineIndex) => {
        let formattedLine = line;
        
        if (showNonPrintable) {
            formattedLine = formatNonPrintable(formattedLine);
        }
        
        if (showEnds && lineIndex < lines.length - 1) {
            formattedLine += '$';
        }
        
        if (showLineNumbers) {
            if (line || lineIndex < lines.length - 1) {
                formattedLine = lineNumber.toString().padStart(6) + '  ' + formattedLine;
                lineNumber++;
            }
        }
        
        outputFn(formattedLine);
    });
}