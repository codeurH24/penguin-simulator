// bin/su.js - Commande su (switch user) - Version silencieuse
// Équivalent de /bin/su sous Debian

import { switchUser, getCurrentUser, getUserInfo } from '../modules/users/user.service.js';
import { showError } from '../modules/terminal.js';

/**
 * Commande su - Change d'utilisateur (SILENCIEUX comme le vrai bash)
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, setCurrentPath, saveFileSystem)
 */
export function cmdSu(args, context) {
    const { fileSystem, setCurrentPath, saveFileSystem } = context;
    
    // Par défaut, su sans argument = su root
    let targetUsername = args.length > 0 ? args[0] : 'root';
    let loginShell = false;
    let command = null;
    
    // Parser les options
    let i = 0;
    while (i < args.length) {
        const arg = args[i];
        
        if (arg === '-' || arg === '-l' || arg === '--login') {
            loginShell = true;
        } else if (arg === '-c' && i + 1 < args.length) {
            command = args[++i];
        } else if (arg.startsWith('-')) {
            showError(`su: option inconnue '${arg}'`);
            showError('Usage: su [options] [utilisateur]');
            showError('Options:');
            showError('  -              Démarrer un shell de connexion');
            showError('  -l, --login    Démarrer un shell de connexion');
            showError('  -c COMMANDE    Exécuter une commande comme l\'utilisateur cible');
            return;
        } else {
            targetUsername = arg;
        }
        i++;
    }
    
    const currentUser = getCurrentUser();
    
    // Vérifier si l'utilisateur cible existe
    const targetUser = getUserInfo(targetUsername, fileSystem);
    if (!targetUser) {
        showError(`su: l'utilisateur '${targetUsername}' n'existe pas`);
        return;
    }
    
    // Simulation de l'authentification
    // Dans un vrai système, on demanderait le mot de passe
    // Ici on simule que l'authentification réussit toujours
    
    try {
        // Changer d'utilisateur
        const newUser = switchUser(targetUsername, fileSystem);
        
        // Si c'est un login shell ou si on change vers un autre utilisateur,
        // changer le répertoire courant vers le home
        if (loginShell || targetUsername !== currentUser.username) {
            if (fileSystem[newUser.home]) {
                setCurrentPath(newUser.home);
            } else {
                // Si le home n'existe pas, rester dans le répertoire courant
                // Dans un vrai système, on afficherait un warning, mais on reste silencieux
            }
        }
        
        // IMPORTANT: Dans un vrai bash, su est COMPLÈTEMENT SILENCIEUX quand ça réussit
        // Pas de messages de succès, pas d'informations
        // Le seul signe de succès est le changement de prompt
        
        // Si une commande est spécifiée avec -c, l'exécuter
        if (command) {
            // Ici on pourrait exécuter la commande avec les privilèges du nouvel utilisateur
            // Pour l'instant, on simule juste
        }
        
        saveFileSystem();
        
        // PAS DE MESSAGES - su est silencieux quand ça réussit !
        
    } catch (error) {
        showError(error.message);
    }
}