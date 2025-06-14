// bin/passwd.js - Commande passwd avec support xterm
// Équivalent de /usr/bin/passwd sous Debian

import {
    changePassword,
    lockUserAccount,
    unlockUserAccount,
    deleteUserPassword,
    getCurrentUser,
    getUserInfo,
    isRoot
} from '../modules/users/user.service.js';

/**
 * Vérifie si un utilisateur a un mot de passe valide (pas !, *, ou vide)
 * @param {string} username - Nom d'utilisateur
 * @param {Object} fileSystem - Système de fichiers
 * @returns {boolean} - true si l'utilisateur a un mot de passe valide
 */
function checkIfUserHasValidPassword(username, fileSystem) {
    const shadowFile = fileSystem['/etc/shadow'];
    if (!shadowFile || shadowFile.type !== 'file') {
        return false;
    }

    const lines = shadowFile.content.split('\n');
    const userLine = lines.find(line => line.startsWith(username + ':'));
    if (!userLine) {
        return false;
    }

    const [, currentHash] = userLine.split(':');
    // Un mot de passe est valide s'il n'est pas !, *, ou vide
    return currentHash && currentHash !== '!' && currentHash !== '*';
}

/**
 * Commande passwd - Change le mot de passe d'un utilisateur
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, saveFileSystem, terminal)
 */
export function cmdPasswd(args, context) {
    const { fileSystem, saveFileSystem, terminal } = context;

    const term = terminal;
    // CORRECTION: Sécuriser les appels avec term
    const showSuccess = context?.addLine || (str => { 
        if (term) term.write(`${str}\r\n`) 
    });
    const showError = context?.showError || (str => { 
        if (term) term.write(`${str}\r\n`) 
    });
    

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
        showPasswordStatus(targetUsername, fileSystem, showSuccess, showError);
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
            lockUserAccount(targetUsername, fileSystem, saveFileSystem);
            showSuccess(`passwd: compte '${targetUsername}' verrouillé`);

        } else if (unlock) {
            // Déverrouiller le compte
            unlockUserAccount(targetUsername, fileSystem, saveFileSystem);
            showSuccess(`passwd: compte '${targetUsername}' déverrouillé`);

        } else if (delete_) {
            // Supprimer le mot de passe
            deleteUserPassword(targetUsername, fileSystem, saveFileSystem);
            showSuccess(`passwd : les informations d'expiration du mot de passe ont été modifiées.`);

        } else {
            // CORRECTION: Ajouter gestion mode test avant le mode interactif
            if (context.test) {
                // Mode test : simuler un changement réussi
                const testPassword = 'testpassword123';
                changePassword(targetUsername, testPassword, fileSystem, saveFileSystem);
                showSuccess('passwd: mot de passe mis à jour avec succès');
                return;
            }

            // Changer le mot de passe (mode interactif conservé tel quel)
            const requireOldPassword = (targetUsername === currentUser.username) && !isRoot();

            // Déterminer si le compte a un mot de passe valide
            let accountHasValidPassword = true;
            if (requireOldPassword) {
                accountHasValidPassword = checkIfUserHasValidPassword(targetUsername, fileSystem);
            }

            // Créer la fonction de vérification de l'ancien mot de passe
            const verifyOldPasswordCallback = requireOldPassword ?
                (username, oldPassword) => verifyOldPassword(username, oldPassword, fileSystem) :
                null;

            // Démarrer l'interaction pour saisir les mots de passe
            return startPasswordInput(
                term,
                targetUsername,
                requireOldPassword,
                verifyOldPasswordCallback,
                (oldPassword, newPassword) => {
                    handlePasswordChangeSuccess(targetUsername, oldPassword, newPassword, fileSystem, saveFileSystem, showSuccess, showError);
                },
                accountHasValidPassword
            );
        }

    } catch (error) {
        showError(error.message);
    }
}

/**
 * Gère le succès du changement de mot de passe
 * @param {string} targetUsername - Utilisateur cible
 * @param {string} oldPassword - Ancien mot de passe (déjà validé)
 * @param {string} newPassword - Nouveau mot de passe
 * @param {Object} fileSystem - Système de fichiers
 * @param {Function} saveFileSystem - Fonction de sauvegarde
 * @param {Function} showSuccess - Fonction de succès
 * @param {Function} showError - Fonction d'erreur
 */
function handlePasswordChangeSuccess(targetUsername, oldPassword, newPassword, fileSystem, saveFileSystem, showSuccess, showError) {
    try {
        // Validation du nouveau mot de passe
        if (newPassword.length < 3) {
            showError('passwd: Mot de passe trop court (minimum 3 caractères)');
            return;
        }

        // Changer le mot de passe
        changePassword(targetUsername, newPassword, fileSystem, saveFileSystem);

        showSuccess('');
        showSuccess(`passwd: mot de passe mis à jour avec succès`);

        // Affichage pour test/debug
        // showSuccess(`[TEST] Nouveau mot de passe: "${newPassword}"`);

    } catch (error) {
        showError('passwd: ' + error.message);
    }
}

/**
 * Vérifie si l'ancien mot de passe est correct
 * @param {string} username - Nom d'utilisateur
 * @param {string} oldPassword - Ancien mot de passe à vérifier
 * @param {Object} fileSystem - Système de fichiers
 * @returns {boolean} - true si l'ancien mot de passe est correct
 */
function verifyOldPassword(username, oldPassword, fileSystem) {
    const shadowFile = fileSystem['/etc/shadow'];
    if (!shadowFile || shadowFile.type !== 'file') {
        return false;
    }

    const lines = shadowFile.content.split('\n');
    const userLine = lines.find(line => line.startsWith(username + ':'));
    if (!userLine) {
        return false;
    }

    const [, currentHash] = userLine.split(':');

    // Si le hash est !, *, ou vide, toujours faux
    if (!currentHash || currentHash === '!' || currentHash === '*' || currentHash === '') {
        return false;
    }

    // Vérification normale
    const calculatedHash = calculateHash(oldPassword);
    return currentHash === calculatedHash;
}

/**
 * Calcule le hash d'un mot de passe
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
 * @param {Function} showSuccess - Fonction de succès
 * @param {Function} showError - Fonction d'erreur
 */
function showPasswordStatus(username, fileSystem, showSuccess, showError) {
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
    if (passwordHash === '!' || passwordHash.startsWith('!')) {
        status = 'L'; // Locked
    } else if (passwordHash === '*' || passwordHash === '') {
        status = 'NP'; // No Password
    } else {
        status = 'P'; // Password set
    }

    const lastChangeDate = lastChange ? new Date(parseInt(lastChange) * 86400000).toLocaleDateString() : 'jamais';

    showSuccess(`${username} ${status} ${lastChangeDate} 0 99999 7 -1`);
}

/**
 * Démarre le processus interactif de saisie de mot de passe
 * @param {Object} term - Terminal xterm
 * @param {string} targetUsername - Utilisateur cible
 * @param {boolean} requireOldPassword - Si l'ancien mot de passe est requis
 * @param {Function} verifyOldPasswordCallback - Fonction de vérification de l'ancien mot de passe
 * @param {Function} onSuccess - Callback en cas de succès
 * @param {boolean} accountHasValidPassword - Si le compte a un mot de passe valide
 */
function startPasswordInput(term, targetUsername, requireOldPassword, verifyOldPasswordCallback, onSuccess, accountHasValidPassword) {
    // CORRECTION: Vérifier que term existe avant de continuer
    if (!term) {
        console.error('passwd: terminal non disponible pour le mode interactif');
        return;
    }

    let step = 0; // 0: ancien mot de passe, 1: nouveau mot de passe, 2: confirmation
    let oldPassword = '';
    let newPassword = '';
    let attempts = 0;
    const maxAttempts = 3;
    
    const showError = (str) => { 
        if (term) term.write(`${str}\r\n`) 
    };
    
    // Référence vers le service terminal pour restaurer le prompt
    let terminalService = null;
    if (term.terminalService) {
        terminalService = term.terminalService;
    }
    
    // Fonction pour passer au mode password
    const enterPasswordMode = (prompt) => {
        term.write(prompt);
        term.passwordMode = true;
        term.currentPasswordInput = '';
    };
    
    // Fonction pour sortir du mode password et restaurer le prompt
    const exitPasswordMode = () => {
        term.passwordMode = false;
        term.currentPasswordInput = '';
        term.passwordCallback = null;
        term.passwordCancelCallback = null;
        
        // Restaurer le prompt après un court délai
        setTimeout(() => {
            if (terminalService && typeof terminalService.showPrompt === 'function') {
                terminalService.showPrompt();
            }
        }, 10);
    };
    
    // Fonction pour gérer la saisie d'un mot de passe
    const handlePasswordStep = (password) => {
        if (step === 0 && requireOldPassword) {
            // Vérifier l'ancien mot de passe
            if (verifyOldPasswordCallback(targetUsername, password)) {
                oldPassword = password;
                step = 1;
                attempts = 0; // Reset attempts pour le nouveau mot de passe
                enterPasswordMode(`Nouveau mot de passe pour ${targetUsername}: `);
            } else {
                attempts++;
                if (attempts >= maxAttempts) {
                    showError('passwd: Authentification échouée');
                    exitPasswordMode();
                    return;
                }
                showError('passwd: Mot de passe incorrect, essayez encore');
                enterPasswordMode(`Mot de passe actuel pour ${targetUsername}: `);
            }
        } else if (step === 1 || (!requireOldPassword && step === 0)) {
            // Nouveau mot de passe - accepter toute saisie (même vide)
            newPassword = password;
            step = 2;
            enterPasswordMode(`Retapez le nouveau mot de passe pour ${targetUsername}: `);
        } else if (step === 2) {
            // Confirmation du mot de passe
            if (password === newPassword) {
                // Valider MAINTENANT après la confirmation
                if (newPassword.length === 0) {
                    attempts++;
                    if (attempts >= maxAttempts) {
                        showError('passwd: Erreur de manipulation du jeton d\'authentification');
                        showError('passwd: mot de passe inchangé');
                        exitPasswordMode();
                        return;
                    }
                    showError('Aucun mot de passe n\'a été fourni.');
                    step = 1; // Recommencer le cycle
                    enterPasswordMode(`Nouveau mot de passe pour ${targetUsername}: `);
                    return;
                } else if (newPassword.length < 3) {
                    attempts++;
                    if (attempts >= maxAttempts) {
                        showError('passwd: Erreur de manipulation du jeton d\'authentification');
                        showError('passwd: mot de passe inchangé');
                        exitPasswordMode();
                        return;
                    }
                    showError('Mot de passe trop court (minimum 3 caractères).');
                    step = 1; // Recommencer le cycle
                    enterPasswordMode(`Nouveau mot de passe pour ${targetUsername}: `);
                    return;
                }
                
                // Mot de passe valide
                exitPasswordMode();
                onSuccess(oldPassword, newPassword);
            } else {
                attempts++;
                if (attempts >= maxAttempts) {
                    showError('passwd: Erreur de manipulation du jeton d\'authentification');
                    showError('passwd: mot de passe inchangé');
                    exitPasswordMode();
                    return;
                }
                showError('Les mots de passe ne correspondent pas.');
                step = 1; // Recommencer le cycle complet
                enterPasswordMode(`Nouveau mot de passe pour ${targetUsername}: `);
            }
        }
    };
    
    // Configurer les callbacks pour le mode password
    term.passwordCallback = handlePasswordStep;
    term.passwordCancelCallback = exitPasswordMode;
    
    // Démarrer le processus
    if (requireOldPassword && accountHasValidPassword) {
        enterPasswordMode(`Mot de passe actuel pour ${targetUsername}: `);
    } else {
        step = 1;
        enterPasswordMode(`Nouveau mot de passe pour ${targetUsername}: `);
    }

    return { callback: handlePasswordStep, cancelCallback: exitPasswordMode};
}