// bin/echo.js - Commande echo isolée avec support des redirections
// Équivalent de /bin/echo sous Debian

import { addLine } from '../modules/terminal/terminal.js';

/**
 * Commande echo - Affiche une ligne de texte
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (peut contenir addLine personnalisé)
 */
export function cmdEcho(args, context) {
    const outputFn = context?.addLine || addLine;
    
    // Options
    let noNewline = false;
    let enableEscape = false;
    let disableEscape = false;
    let textArgs = [...args];
    
    // Parser les options
    while (textArgs.length > 0) {
        const arg = textArgs[0];
        if (arg === '-n') {
            noNewline = true;
            textArgs.shift();
        } else if (arg === '-e') {
            enableEscape = true;
            disableEscape = false;
            textArgs.shift();
        } else if (arg === '-E') {
            disableEscape = true;
            enableEscape = false;
            textArgs.shift();
        } else if (arg.startsWith('-') && arg.length > 1) {
            // Options combinées
            let hasOptions = false;
            for (let i = 1; i < arg.length; i++) {
                if (arg[i] === 'n') {
                    noNewline = true;
                    hasOptions = true;
                } else if (arg[i] === 'e') {
                    enableEscape = true;
                    disableEscape = false;
                    hasOptions = true;
                } else if (arg[i] === 'E') {
                    disableEscape = true;
                    enableEscape = false;
                    hasOptions = true;
                }
            }
            if (hasOptions) {
                textArgs.shift();
            } else {
                break;
            }
        } else {
            break;
        }
    }
    
    // Joindre les arguments
    let text = textArgs.join(' ');
    
    // Traiter les séquences d'échappement si activé
    if (enableEscape && !disableEscape) {
        text = text
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\r/g, '\r')
            .replace(/\\b/g, '\b')
            .replace(/\\f/g, '\f')
            .replace(/\\a/g, '\x07')
            .replace(/\\v/g, '\x0B')
            .replace(/\\\\/g, '\\')
            .replace(/\\"/g, '"')
            .replace(/\\'/g, "'");
            
        // Octal et hex
        text = text.replace(/\\([0-7]{1,3})/g, (match, octal) => {
            return String.fromCharCode(parseInt(octal, 8));
        });
        text = text.replace(/\\x([0-9A-Fa-f]{1,2})/g, (match, hex) => {
            return String.fromCharCode(parseInt(hex, 16));
        });
    }
    
    // Afficher le texte
    outputFn(text);
    
    // Ajouter nouvelle ligne seulement si pas -n
    if (!noNewline) {
        outputFn('\n');
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