// index.js - Point d'entrée principal mis à jour pour la structure modulaire
import { initDB } from './modules/storage.js';
import { getCurrentUser } from './modules/users/user.service.js';
import { 
    initTerminal,
    addLine
} from './modules/terminal/terminal.js';
import { executeCommand as execCommand } from './bin/bash.js';
import { createContext, initContext, getCurrentPath } from './core/context.js';

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
        // Initialiser la base de données AVANT tout
        await initDB();
        
        // Initialiser le contexte (gère tout en interne)
        await initContext();
        
        // Créer le contexte pour le terminal
        const context = createContext();
        
        // Initialiser le terminal avec le nouveau système modulaire
        const success = initTerminal(context, executeCommand);
        
        if (!success) {
            console.error('Échec de l\'initialisation du terminal');
            return;
        }
        
        addLine('👥 Système d\'utilisateurs prêt', 'success');
        
        // Messages de bienvenue
        addLine('🐧 Terminal Linux simulé - Debian-style bash shell', 'success');
        const currentUser = getCurrentUser();
        addLine(`Connecté en tant que ${currentUser.username}@bash`, 'success');
        addLine('Tapez "help" pour voir les commandes disponibles', 'info');
        addLine('', '');
        addLine('💡 Astuce: en mode passwd, tapez votre mot de passe et appuyez sur Entrée', 'info');
        addLine('   Utilisez Échap pour annuler la saisie de mot de passe', 'info');
        
        // Debug: vérifier que les fichiers système sont bien là
        console.log('Fichiers système créés:', {
            passwd: !!context.fileSystem['/etc/passwd'],
            shadow: !!context.fileSystem['/etc/shadow'],
            group: !!context.fileSystem['/etc/group']
        });
        
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
    }
}

// Lancer l'initialisation
initApp();