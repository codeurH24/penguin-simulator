// bin/passwd.js - Commande passwd avec vérification immédiate de l'ancien mot de passe (3 tentatives)
// Équivalent de /usr/bin/passwd sous Debian

import { changePassword, getCurrentUser, getUserInfo, isRoot } from '../modules/users.js';
import { showError, showSuccess, addLine, startPasswordInput } from '../modules/terminal.js';

/**
 * Commande passwd - Change le mot de passe d'un utilisateur
 * Comme dans un vrai système Unix/Linux, l'utilisateur a 3 tentatives pour saisir l'ancien mot de passe
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, saveFileSystem)
 */
export function cmdPasswd(args, context) {
    const { fileSystem, saveFileSystem } = context;
    
    const currentUser = getCurrentUser();
    let targetUsername = currentUser.username; // Par défaut, changer son propre mot de passe
    let lock = false;
    let unlock = false;
    let delete_ = false;
    let showStatus = false;
    
    // Parser les options
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg === '-l' || arg === '--lock') {
            lock = true;
        } else if (arg === '-u' || arg === '--unlock') {
            unlock = true;
        } else if (arg === '-d' || arg === '--delete') {
            delete_ = true;
        } else if (arg === '-S' || arg === '--status') {
            showStatus = true;
        } else if (arg.startsWith('-')) {
            showError(`passwd: option inconnue '${arg}'`);
            showError('Usage: passwd [options] [utilisateur]');
            showError('Options:');
            showError('  -l, --lock     Verrouiller le mot de passe');
            showError('  -u, --unlock   Déverrouiller le mot de passe');
            showError('  -d, --delete   Supprimer le mot de passe');
            showError('  -S, --status   Afficher le statut du mot de passe');
            return;
        } else {
            targetUsername = arg;
        }
    }
    
    // Vérifier si l'utilisateur cible existe
    const targetUser = getUserInfo(targetUsername, fileSystem);
    if (!targetUser) {
        showError(`passwd: l'utilisateur '${targetUsername}' n'existe pas`);
        return;
    }
    
    // Vérifier les permissions
    if (targetUsername !== currentUser.username && !isRoot()) {
        showError(`passwd: Seul root peut changer le mot de passe d'autres utilisateurs`);
        return;
    }
    
    // Afficher le statut si demandé
    if (showStatus) {
        showPasswordStatus(targetUsername, fileSystem);
        return;
    }
    
    // Opérations nécessitant les privilèges root
    if ((lock || unlock || delete_) && !isRoot()) {
        showError('passwd: Seul root peut verrouiller/déverrouiller/supprimer des mots de passe');
        return;
    }
    
    try {
        if (lock) {
            // Verrouiller le compte
            lockAccount(targetUsername, fileSystem, saveFileSystem);
            showSuccess(`Mot de passe verrouillé pour '${targetUsername}'`);
            
        } else if (unlock) {
            // Déverrouiller le compte
            unlockAccount(targetUsername, fileSystem, saveFileSystem);
            showSuccess(`Mot de passe déverrouillé pour '${targetUsername}'`);
            
        } else if (delete_) {
            // Supprimer le mot de passe
            deletePassword(targetUsername, fileSystem, saveFileSystem);
            showSuccess(`Mot de passe supprimé pour '${targetUsername}'`);
            showSuccess('⚠️  Attention: connexion sans mot de passe possible');
            
        } else {
            // Changer le mot de passe - ici la magie des 3 tentatives opère via terminal.js
            const requireOldPassword = (targetUsername === currentUser.username) && !isRoot();
            
            // Créer la fonction de vérification de l'ancien mot de passe
            // Cette fonction sera appelée jusqu'à 3 fois par terminal.js en cas d'échec
            const verifyOldPasswordCallback = requireOldPassword ? 
                (username, oldPassword) => verifyOldPassword(username, oldPassword, fileSystem) : 
                null;
            
            startPasswordInput(
                targetUsername, 
                requireOldPassword, 
                verifyOldPasswordCallback,
                (oldPassword, newPassword) => {
                    // Cette fonction sera appelée SEULEMENT si tout est validé (3 tentatives max)
                    handlePasswordChangeSuccess(targetUsername, oldPassword, newPassword, fileSystem, saveFileSystem);
                }
            );
        }
        
    } catch (error) {
        showError(error.message);
    }
}

/**
 * Gère le succès du changement de mot de passe (appelé seulement si validé)
 * @param {string} targetUsername - Utilisateur cible
 * @param {string} oldPassword - Ancien mot de passe (déjà validé)
 * @param {string} newPassword - Nouveau mot de passe
 * @param {Object} fileSystem - Système de fichiers
 * @param {Function} saveFileSystem - Fonction de sauvegarde
 */
function handlePasswordChangeSuccess(targetUsername, oldPassword, newPassword, fileSystem, saveFileSystem) {
    try {
        // Validation du nouveau mot de passe
        if (newPassword.length < 3) {
            showError('passwd: Mot de passe trop court (minimum 3 caractères)');
            return;
        }
        
        // À ce stade, l'ancien mot de passe a déjà été vérifié par le terminal (jusqu'à 3 fois)
        addLine(`[DEBUG] Changement du mot de passe validé après vérification`, 'info');
        
        // Changer le mot de passe
        changePassword(targetUsername, newPassword, fileSystem, saveFileSystem);
        
        addLine('', '');
        showSuccess(`passwd: mot de passe mis à jour avec succès`);
        
        // Affichage pour test/debug
        addLine(`[TEST] Nouveau mot de passe: "${newPassword}"`, 'info');
        
    } catch (error) {
        showError('passwd: ' + error.message);
    }
}

/**
 * Vérifie si l'ancien mot de passe est correct
 * Cette fonction sera appelée jusqu'à 3 fois par terminal.js
 * @param {string} username - Nom d'utilisateur
 * @param {string} oldPassword - Ancien mot de passe à vérifier
 * @param {Object} fileSystem - Système de fichiers
 * @returns {boolean} - true si l'ancien mot de passe est correct
 */
function verifyOldPassword(username, oldPassword, fileSystem) {
    addLine(`[DEBUG] === VÉRIFICATION MOT DE PASSE ===`, 'info');
    addLine(`[DEBUG] Username: "${username}"`, 'info');
    addLine(`[DEBUG] Password saisi: "${oldPassword}" (longueur: ${oldPassword.length})`, 'info');
    
    // Récupérer le hash actuel du mot de passe depuis /etc/shadow
    const shadowFile = fileSystem['/etc/shadow'];
    if (!shadowFile || shadowFile.type !== 'file') {
        addLine(`[DEBUG] ERREUR: Fichier /etc/shadow introuvable`, 'error');
        return false;
    }
    
    const lines = shadowFile.content.split('\n');
    const userLine = lines.find(line => line.startsWith(username + ':'));
    if (!userLine) {
        addLine(`[DEBUG] ERREUR: Utilisateur "${username}" introuvable dans /etc/shadow`, 'error');
        return false;
    }
    
    const [, currentHash] = userLine.split(':');
    addLine(`[DEBUG] Hash stocké: "${currentHash}"`, 'info');
    
    // Vérifier que l'utilisateur a un mot de passe valide
    if (!currentHash || currentHash === '!' || currentHash === '*' || currentHash === '') {
        addLine(`[DEBUG] ERREUR: Pas de mot de passe valide (hash: "${currentHash}")`, 'error');
        return false;
    }
    
    // Calculer le hash du mot de passe saisi
    const calculatedHash = calculateHash(oldPassword);
    addLine(`[DEBUG] Hash calculé: "${calculatedHash}"`, 'info');
    
    // Comparer les hashs
    const match = currentHash === calculatedHash;
    addLine(`[DEBUG] Les hashs correspondent: ${match}`, 'info');
    
    if (!match) {
        addLine(`[DEBUG] ÉCHEC - Hashes différents:`, 'error');
        addLine(`[DEBUG] - Stocké  : "${currentHash}"`, 'error');
        addLine(`[DEBUG] - Calculé : "${calculatedHash}"`, 'error');
    } else {
        addLine(`[DEBUG] SUCCÈS - Ancien mot de passe validé!`, 'info');
    }
    
    return match;
}

/**
 * Calcule le hash d'un mot de passe (même algorithme que changePassword)
 * @param {string} password - Mot de passe à hasher
 * @returns {string} - Hash du mot de passe
 */
function calculateHash(password) {
    const hash = '$6$rounds=656000$salt$' + btoa(password + 'salt');
    return hash;
}

/**
 * Affiche le statut du mot de passe
 * @param {string} username - Nom d'utilisateur
 * @param {Object} fileSystem - Système de fichiers
 */
function showPasswordStatus(username, fileSystem) {
    const shadowFile = fileSystem['/etc/shadow'];
    if (!shadowFile || shadowFile.type !== 'file') {
        showError('passwd: impossible de lire /etc/shadow');
        return;
    }
    
    const lines = shadowFile.content.split('\n');
    const userLine = lines.find(line => line.startsWith(username + ':'));
    
    if (!userLine) {
        showError(`passwd: utilisateur '${username}' introuvable dans /etc/shadow`);
        return;
    }
    
    const [, passwordHash, lastChange] = userLine.split(':');
    
    let status;
    if (passwordHash === '!') {
        status = 'L'; // Locked
    } else if (passwordHash === '*' || passwordHash === '') {
        status = 'NP'; // No Password
    } else {
        status = 'P'; // Password set
    }
    
    const lastChangeDate = lastChange ? new Date(parseInt(lastChange) * 86400000).toLocaleDateString() : 'jamais';
    
    addLine(`${username} ${status} ${lastChangeDate} 0 99999 7 -1`, 'info');
    addLine('', '');
    addLine('Légende du statut:', 'info');
    addLine('  P  - Mot de passe défini', 'info');
    addLine('  L  - Mot de passe verrouillé', 'info');
    addLine('  NP - Aucun mot de passe', 'info');
}

/**
 * Verrouille le compte d'un utilisateur
 * @param {string} username - Nom d'utilisateur
 * @param {Object} fileSystem - Système de fichiers
 * @param {Function} saveFileSystem - Fonction de sauvegarde
 */
function lockAccount(username, fileSystem, saveFileSystem) {
    const shadowFile = fileSystem['/etc/shadow'];
    const lines = shadowFile.content.split('\n');
    
    const newLines = lines.map(line => {
        if (line.startsWith(username + ':')) {
            const parts = line.split(':');
            if (!parts[1].startsWith('!')) {
                parts[1] = '!' + parts[1]; // Préfixer avec ! pour verrouiller
            }
            return parts.join(':');
        }
        return line;
    });
    
    shadowFile.content = newLines.join('\n');
    shadowFile.size = shadowFile.content.length;
    shadowFile.modified = new Date();
    saveFileSystem();
}

/**
 * Déverrouille le compte d'un utilisateur
 * @param {string} username - Nom d'utilisateur
 * @param {Object} fileSystem - Système de fichiers
 * @param {Function} saveFileSystem - Fonction de sauvegarde
 */
function unlockAccount(username, fileSystem, saveFileSystem) {
    const shadowFile = fileSystem['/etc/shadow'];
    const lines = shadowFile.content.split('\n');
    
    const newLines = lines.map(line => {
        if (line.startsWith(username + ':')) {
            const parts = line.split(':');
            if (parts[1].startsWith('!')) {
                parts[1] = parts[1].substring(1); // Retirer le ! pour déverrouiller
            }
            return parts.join(':');
        }
        return line;
    });
    
    shadowFile.content = newLines.join('\n');
    shadowFile.size = shadowFile.content.length;
    shadowFile.modified = new Date();
    saveFileSystem();
}

/**
 * Supprime le mot de passe d'un utilisateur
 * @param {string} username - Nom d'utilisateur
 * @param {Object} fileSystem - Système de fichiers
 * @param {Function} saveFileSystem - Fonction de sauvegarde
 */
function deletePassword(username, fileSystem, saveFileSystem) {
    const shadowFile = fileSystem['/etc/shadow'];
    const lines = shadowFile.content.split('\n');
    
    const newLines = lines.map(line => {
        if (line.startsWith(username + ':')) {
            const parts = line.split(':');
            parts[1] = ''; // Mot de passe vide
            return parts.join(':');
        }
        return line;
    });
    
    shadowFile.content = newLines.join('\n');
    shadowFile.size = shadowFile.content.length;
    shadowFile.modified = new Date();
    saveFileSystem();
}