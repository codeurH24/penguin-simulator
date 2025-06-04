// bin/userdel.js - Commande userdel (supprimer un utilisateur)
// Équivalent de /usr/sbin/userdel sous Debian

import { removeUser, isRoot, getCurrentUser } from '../modules/users.js';
import { showError, showSuccess } from '../modules/terminal.js';

/**
 * Commande userdel - Supprime un utilisateur du système
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, saveFileSystem)
 */
export function cmdUserdel(args, context) {
    const { fileSystem, saveFileSystem } = context;
    
    // Vérifier les permissions (seul root peut supprimer des utilisateurs)
    if (!isRoot()) {
        showError('userdel: Seul root peut supprimer des utilisateurs du système');
        return;
    }
    
    if (args.length === 0) {
        showError('userdel: nom d\'utilisateur manquant');
        showError('Usage: userdel [options] <nom_utilisateur>');
        showError('Options:');
        showError('  -r         Supprimer le répertoire home et la boîte mail');
        showError('  -f         Forcer la suppression même si l\'utilisateur est connecté');
        return;
    }

    // Parser les options
    let removeHome = false;
    let force = false;
    let username = null;
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg === '-r') {
            removeHome = true;
        } else if (arg === '-f') {
            force = true;
        } else if (arg === '-rf' || arg === '-fr') {
            removeHome = true;
            force = true;
        } else if (arg.startsWith('-')) {
            showError(`userdel: option inconnue '${arg}'`);
            return;
        } else {
            if (username === null) {
                username = arg;
            } else {
                showError('userdel: trop d\'arguments');
                return;
            }
        }
    }
    
    if (!username) {
        showError('userdel: nom d\'utilisateur manquant');
        return;
    }
    
    // Vérifications de sécurité
    if (username === 'root') {
        showError('userdel: impossible de supprimer l\'utilisateur root');
        return;
    }
    
    // Vérifier si l'utilisateur est actuellement connecté
    const currentUser = getCurrentUser();
    if (username === currentUser.username && !force) {
        showError(`userdel: l'utilisateur '${username}' est actuellement connecté`);
        showError('Utilisez -f pour forcer la suppression ou déconnectez-vous d\'abord');
        return;
    }
    
    // Vérifier si l'utilisateur existe
    try {
        removeUser(username, removeHome, fileSystem, saveFileSystem);
        
        showSuccess(`Utilisateur '${username}' supprimé avec succès`);
        
        if (removeHome) {
            showSuccess(`Répertoire home et fichiers de '${username}' supprimés`);
        } else {
            showSuccess(`Répertoire home de '${username}' conservé`);
            showSuccess('Utilisez -r pour supprimer automatiquement le répertoire home');
        }
        
        // Si l'utilisateur supprimé était l'utilisateur courant, revenir à root
        if (username === currentUser.username) {
            showSuccess('');
            showSuccess('⚠️  Utilisateur courant supprimé - retour automatique vers root');
            // Note: dans une vraie implémentation, il faudrait mettre à jour le contexte
        }
        
    } catch (error) {
        showError(error.message);
    }
}