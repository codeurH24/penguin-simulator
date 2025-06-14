import { TerminalService } from './modules/terminal/xterm/terminal.js';
import { createAndSaveContext, getContextFromDB } from './core/basic-context.js';
import { envAddHome, envLoadFromEnvironment } from './modules/install-system.js';
import { exportAsDownloadURL } from './modules/backup/filesystem/export-utils.js';
import { loadBackupTestData, removeBackupTestData } from './modules/backup/loaders.js';

export async function initApp() {
    try {
        // Récupérer ou créer le contexte
        let context = await getContextFromDB();
        if (!context) {
            context = await createAndSaveContext();

            if (!context.variables.HOME) envAddHome(context);
            envLoadFromEnvironment(context);
        }

        const terminal = new TerminalService(context);
        return terminal;

    } catch (error) {
        console.error('Erreur:', error.message);
    }

}

// Lancer l'initialisation
initApp();


