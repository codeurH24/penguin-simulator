// bin/cat.js - Commande cat (concatenate) isolée - CORRIGER CETTE PARTIE
// Équivalent de /bin/cat sous Debian

import { resolvePath } from '../modules/filesystem.js';

/**
 * Commande cat - Affiche et concatène le contenu de fichiers
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, currentPath, peut contenir addLine personnalisé)
 */
export function cmdCat(args, context) {

    const { fileSystem, getCurrentPath } = context;
    const currentPath = getCurrentPath();

    const term = context.terminal;
    // Utiliser addLine et showError du contexte si disponibles, sinon ceux par défaut
    let outputFn = context?.addLine || (str => {
        term.write(str.replace(/\n/g, '\r\n'));
    });
    const errorFn = context?.showError || (str => { term.write(`${str}\r\n`) });

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
                        line ? `${(i + 1).toString().padStart(6)}  ${line}` : line
                    ).join('\n');
                }

                outputFn(processedContent);
            }
        } else {
            // Fichier vide - rien à afficher
        }
    });
}