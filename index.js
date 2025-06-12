import { TerminalService } from './modules/terminal/xterm/terminal.js';
import { createAndSaveContext, getContextFromDB } from './core/basic-context.js';
import { envAddHome, envLoadFromEnvironment } from './modules/install-system.js';

async function initApp() {
    try {
        // Récupérer ou créer le contexte
        let context = await getContextFromDB();
        if (!context) {
            context = await createAndSaveContext();
        }

        if (!context.variables.HOME) envAddHome(context);
        envLoadFromEnvironment(context)

        new TerminalService(context);

    } catch (error) {
        console.error('Erreur:', error.message);
    }

}

// Lancer l'initialisation
initApp();