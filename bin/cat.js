// bin/cat.js - Commande cat (concatenate) isolée - CORRIGER CETTE PARTIE
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
    
    // Utiliser addLine et showError du contexte si disponibles, sinon ceux par défaut
    const outputFn = context?.addLine || addLine;
    const errorFn = context?.showError || showError;
    
    // Si aucun argument, lire depuis stdin (simulation)
    if (args.length === 0) {
        errorFn('cat: lecture depuis stdin non supportée');
        errorFn('Usage: cat <fichier1> [fichier2] ...');
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
        errorFn('cat: aucun fichier spécifié');
        return;
    }
    
    let lineNumber = 1;
    
    // Traiter chaque fichier
    fileArgs.forEach((fileName, fileIndex) => {
        const filePath = resolvePath(fileName, currentPath);
        
        if (!fileSystem[filePath]) {
            errorFn(`cat: ${fileName}: Fichier introuvable`);
            return;
        }
        
        const file = fileSystem[filePath];
        if (file.type !== 'file') {
            errorFn(`cat: ${fileName}: N'est pas un fichier`);
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