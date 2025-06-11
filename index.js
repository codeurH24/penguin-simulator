// index.js - Point d'entrée principal mis à jour pour la structure modulaire
// import { initDB } from './modules/storage.js';
// import { getCurrentUser } from './modules/users/user.service.js';
// import { 
//     initTerminal,
//     addLine
// } from './modules/terminal/terminal.js';
import { executeCommand as execCommand } from './bin/bash.js';
import { createContext, initContext, getCurrentPath } from './core/context.js';
import { TerminalService } from './modules/terminal/xterm/terminal.js';
import { createAndSaveContext, getContextFromDB } from './core/basic-context.js';

/**
 * Fonction pour exécuter une commande
 * @param {string} command - Commande à exécuter
 */
function executeCommand(command) {
    const context = createContext();
    
    // Exécuter la commande
    execCommand(command, context);
}

/**
 * Initialisation asynchrone du terminal
 */
async function initApp() {
    try {
        // Récupérer ou créer le contexte
        let context = await getContextFromDB();
        if (!context) {
            context = await createAndSaveContext();
        }
        
        const terminal = new TerminalService();
        terminal.setContext(context);
        
    } catch (error) {
        console.error('Erreur:', error.message);
    }

}

// Lancer l'initialisation
initApp();