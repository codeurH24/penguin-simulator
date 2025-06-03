// bin/echo.js - Commande echo isolée avec support des redirections
// Équivalent de /bin/echo sous Debian

import { addLine } from '../modules/terminal.js';

/**
 * Commande echo - Affiche une ligne de texte
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (peut contenir addLine personnalisé)
 */
export function cmdEcho(args, context) {
    // Utiliser addLine du contexte si disponible, sinon celui par défaut
    const outputFn = context?.addLine || addLine;
    
    // Gérer les options de echo
    let newline = true;
    let interpretEscapes = false;
    let textArgs = [...args];
    
    // Extraire les options
    textArgs = textArgs.filter(arg => {
        if (arg === '-n') {
            newline = false; // Pas de nouvelle ligne à la fin
            return false;
        } else if (arg === '-e') {
            interpretEscapes = true; // Interpréter les séquences d'échappement
            return false;
        } else if (arg === '-E') {
            interpretEscapes = false; // Ne pas interpréter les séquences
            return false;
        }
        return true;
    });
    
    // Joindre tous les arguments avec des espaces
    let text = textArgs.join(' ');
    
    // Interpréter les séquences d'échappement si option -e
    if (interpretEscapes) {
        text = interpretEscapeSequences(text);
    }
    
    // Afficher le texte
    if (newline) {
        outputFn(text);
    } else {
        // Pour -n, on devrait écrire sans nouvelle ligne
        // Dans le contexte de la redirection, on retourne le texte sans \n final
        outputFn(text);
    }
}

/**
 * Interprète les séquences d'échappement (\n, \t, etc.)
 * @param {string} text - Texte avec potentielles séquences d'échappement
 * @returns {string} - Texte avec séquences interprétées
 */
function interpretEscapeSequences(text) {
    return text
        .replace(/\\n/g, '\n')    // Nouvelle ligne
        .replace(/\\t/g, '\t')    // Tabulation
        .replace(/\\r/g, '\r')    // Retour chariot
        .replace(/\\b/g, '\b')    // Backspace
        .replace(/\\f/g, '\f')    // Form feed
        .replace(/\\v/g, '\v')    // Tabulation verticale
        .replace(/\\a/g, '\a')    // Alert (bell)
        .replace(/\\\\/g, '\\')   // Backslash littéral
        .replace(/\\0/g, '\0');   // Caractère null
}