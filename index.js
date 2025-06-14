import { TerminalService } from './modules/terminal/xterm/terminal.js';
import { createAndSaveContext, getContextFromDB } from './core/basic-context.js';
import { envAddHome, envLoadFromEnvironment } from './modules/install-system.js';
import { exportAsDownloadURL } from './modules/backup/filesystem/export-utils.js';
import { loadBackupTestData, removeBackupTestData } from './modules/backup/filesystem/loaders.js';
import { fetchLoadUserSession, saveUserSessionAsDownload } from './modules/backup/user/user-session-backup.js';

export async function initApp(testMode=false) {
    try {
        let context;
        
        if (testMode) {
            context = await createAndSaveContext(testMode);
        } else {
            context = await getContextFromDB() || await createAndSaveContext(testMode);

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
window.terminal = await initApp();


