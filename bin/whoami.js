// bin/whoami.js - Commande whoami sous Debian
// Affiche le nom de l'utilisateur courant

/**
 * Commande whoami - Affiche le nom d'utilisateur courant
 * Comportement conforme à Debian: rejette tous les arguments
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (currentUser, terminal)
 */
export function cmdWhoami(args, context) {
    const term = context?.terminal;
    const outputFn = context?.addLine || ((str) => { term.write(`${str}\r\n`) });
    const showError = context?.showError || ((str) => { term.write(`${str}\r\n`) });
    
    // Rejeter tous les arguments (comportement Debian)
    if (args.length > 0) {
        showError('whoami: trop d\'arguments');
        showError('Usage: whoami');
        return;
    }
    
    // Vérifier qu'un utilisateur est connecté
    const currentUser = context.currentUser;
    if (!currentUser) {
        showError('whoami: aucun utilisateur connecté');
        return;
    }
    
    // Afficher le nom d'utilisateur courant
    outputFn(currentUser.username);
}