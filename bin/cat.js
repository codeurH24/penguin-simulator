// bin/cat.js - Commande cat modernisée avec FileSystemService
// Équivalent de /bin/cat sous Debian avec gestion des permissions

import { 
    FileSystemService,
    PermissionDeniedError,
    FileNotFoundError,
    IsDirectoryError
} from '../modules/filesystem/index.js';

/**
 * Commande cat - Affiche et concatène le contenu de fichiers
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, currentPath, terminal, etc.)
 */
export function cmdCat(args, context) {
    const fs = new FileSystemService(context);
    const term = context.terminal;
    
    // Fonctions de sortie
    const outputFn = context?.addLine || (str => {
        term.write(str.replace(/\n/g, '\r\n'));
    });
    const errorFn = context?.showError || (str => { 
        term.write(`${str}\r\n`) 
    });

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
        try {
            // ✅ Plus de vérification manuelle - FileSystemService gère tout !
            const content = fs.fileSystem.getContent(fileName);
            
            if (content) {
                // Si aucune option spéciale, afficher le contenu brut
                if (!showLineNumbers && !showEnds && !showNonPrintable) {
                    outputFn(content);
                } else {
                    // Appliquer les options
                    let processedContent = content;

                    if (showNonPrintable) {
                        processedContent = formatNonPrintable(processedContent);
                    }

                    if (showEnds) {
                        processedContent = processedContent.replace(/\n/g, '$\n');
                        if (processedContent.endsWith('$\n')) {
                            processedContent = processedContent.slice(0, -2) + '$';
                        }
                    }

                    if (showLineNumbers) {
                        const lines = processedContent.split('\n');
                        processedContent = lines.map((line, i) =>
                            line ? `${(lineNumber + i).toString().padStart(6)}  ${line}` : line
                        ).join('\n');
                        lineNumber += lines.length;
                    }

                    outputFn(processedContent);
                }
            }
            // Fichier vide - rien à afficher (comportement correct)
            
        } catch (error) {
            // ✅ Gestion moderne des erreurs avec types spécifiques
            if (error instanceof FileNotFoundError) {
                errorFn(`cat: ${fileName}: Fichier introuvable`);
            } else if (error instanceof IsDirectoryError) {
                errorFn(`cat: ${fileName}: N'est pas un fichier`);
            } else if (error instanceof PermissionDeniedError) {
                errorFn(`cat: ${fileName}: Permission refusée`);
            } else {
                // Erreur inattendue
                errorFn(`cat: ${fileName}: ${error.message}`);
            }
        }
    });
}

/**
 * Formate les caractères non-imprimables pour l'option -v
 * @param {string} content - Contenu à formater
 * @returns {string} - Contenu avec caractères non-imprimables visibles
 */
function formatNonPrintable(content) {
    return content.replace(/[\x00-\x08\x0B-\x1F\x7F]/g, char => {
        const code = char.charCodeAt(0);
        if (code === 9) return char; // Préserver les tabs
        if (code === 10) return char; // Préserver les newlines
        if (code === 13) return char; // Préserver les retours chariot
        if (code < 32) return `^${String.fromCharCode(code + 64)}`;
        if (code === 127) return '^?';
        return char;
    });
}