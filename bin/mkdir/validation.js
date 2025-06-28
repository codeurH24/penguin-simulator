// bin/mkdir/validation.js - Validation des arguments de la commande mkdir
import { expandAllBraces } from '../../lib/bash-parser.js';

/**
 * Valide les arguments de la commande mkdir
 * @param {Array} args - Arguments à valider
 * @param {Function} errorFn - Fonction d'affichage d'erreur
 * @returns {Object} - {valid: boolean, createParents: boolean, dirArgs: Array}
 */
export function validateArguments(args, errorFn) {
    if (args.length === 0) {
        errorFn('mkdir: nom de dossier manquant');
        return { valid: false };
    }

    // Gérer l'option -p
    let createParents = false;
    let dirArgs = [...args];

    if (args[0] === '-p') {
        createParents = true;
        dirArgs = args.slice(1);
    }

    if (dirArgs.length === 0) {
        errorFn('mkdir: nom de dossier manquant');
        return { valid: false };
    }

    // Appliquer les brace expansions
    dirArgs = expandAllBraces(dirArgs);

    return {
        valid: true,
        createParents,
        dirArgs
    };
}