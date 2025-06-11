// Remplacez cmdEcho dans bin/echo.js par :
import { addLine, write, flushLine, showError } from '../modules/terminal/terminal.js';
    
export function cmdEcho(args, context) {
    const term = context.terminal;
    let outputFn = context?.addLine || (str => { 
         
        term.write(`${str}`)
        if (str.endsWith('\n')) {
            term.write('\r\x1b[K');
        }
    });
    
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
            .replace(/\\a/g, '')
            .replace(/\\v/g, '\x0B')
            .replace(/\\\\/g, '\\')
            .replace(/\\"/g, '"')
            .replace(/\\0/g, '')
            .replace(/\\'/g, "'");
            
        // Octal et hex
        text = text.replace(/\\([0-9]+)/g, '\\$1'); 
        text = text.replace(/\\x([0-9A-Fa-f]{1,2})/g, (match, hex) => {
            return String.fromCharCode(parseInt(hex, 16));
        });
    }
    
    // Afficher avec ou sans nouvelle ligne
    if (noNewline) {
        outputFn(text);
    } else {
        outputFn(text + '\n');
    }
}