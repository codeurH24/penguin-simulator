// bin/su.js - Commande su avec authentification (VERSION FINALE CORRIGÉE)
// Équivalent de /bin/su sous Debian avec vérification de mot de passe

import { switchUser, getCurrentUser, getUserInfo } from '../modules/users/user.service.js';
import { pushUser } from '../modules/users/user-stack.js';

/**
 * Calcule le hash d'un mot de passe (identique à passwd.js)
 * @param {string} password - Mot de passe à hasher
 * @returns {string} - Hash du mot de passe
 */
function calculateHash(password) {
    return '$6$rounds=656000$salt$' + btoa(password + 'salt');
}

/**
 * Vérifie si un mot de passe est correct pour un utilisateur
 * @param {string} username - Nom d'utilisateur
 * @param {string} password - Mot de passe à vérifier
 * @param {Object} fileSystem - Système de fichiers
 * @returns {boolean} - true si le mot de passe est correct
 */
function verifyPassword(username, password, fileSystem) {
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

    // Si le hash est !, *, ou vide, le compte est verrouillé/sans mot de passe
    if (!currentHash || currentHash === '!' || currentHash.startsWith('!') ||
        currentHash === '*' || currentHash === '') {
        return false;
    }

    // Vérification normale
    const calculatedHash = calculateHash(password);
    return currentHash === calculatedHash;
}

/**
 * Commande su - Change d'utilisateur avec authentification
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, setCurrentPath, saveFileSystem)
 */
export function cmdSu(args, context) {
    const { fileSystem, setCurrentPath, saveFileSystem } = context;

    // CORRECTION : Accès correct à terminalService
    const term = context.terminal;
    const terminalService = term?.terminalService;
    const showError = context?.showError || (str => { term.write(`${str}\r\n`) });

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

    // Si on change vers le même utilisateur, ne rien faire
    if (targetUsername === currentUser.username) {
        return; // Silencieux comme le vrai bash
    }

    // EXCEPTION DE SÉCURITÉ : root peut su vers n'importe qui sans mot de passe
    if (currentUser.uid === 0) {
        executeSuChange(context, targetUsername, currentUser, loginShell);
        return;
    }

    // COMPORTEMENT LINUX : Si l'utilisateur cible n'a pas de mot de passe, 
    // n'importe qui peut su vers lui sans demande
    if (targetUserHasNoPassword(targetUsername, fileSystem)) {
        executeSuChange(context, targetUsername, currentUser, loginShell);
        return;
    }

    // COMPORTEMENT BASH CORRECT : Toujours demander le mot de passe
    // (sauf pour root), même si le compte est verrouillé avec "!"
    // L'authentification échoue APRÈS la saisie, pas avant

    if (terminalService) {
        // Démarrer l'authentification via la classe Prompt
        startSuAuthentication(
            terminalService,
            targetUsername,
            context,
            // Succès : exécuter le changement d'utilisateur
            () => {
                executeSuChange(context, targetUsername, currentUser, loginShell);
            },
            // Échec : ne rien faire (message déjà affiché)
            () => {
                // L'échec d'authentification a déjà été géré
            }
        );
    }

}

/**
 * Démarre l'authentification via la classe Prompt
 * @param {Object} terminalService - TerminalService
 * @param {string} targetUsername - Utilisateur cible
 * @param {Object} context - Contexte
 * @param {Function} onSuccess - Callback en cas de succès
 * @param {Function} onFailure - Callback en cas d'échec
 */
function startSuAuthentication(terminalService, targetUsername, context, onSuccess, onFailure) {
    // Accès à la classe Prompt
    if (!terminalService || !terminalService.prompt) {
        // Fallback si pas de service prompt
        context.terminal.write('su: Authentication failure\r\n');
        onFailure();
        return;
    }

    let attempts = 0;
    const maxAttempts = 1; // Comportement bash : une seule tentative

    const attemptAuthentication = () => {
        // Utiliser askPassword de la classe Prompt
        terminalService.prompt.askPassword(
            'Password: ',
            (password) => {
                // Vérifier le mot de passe APRÈS la saisie
                if (verifyPassword(targetUsername, password, context.fileSystem)) {
                    // Authentification réussie
                    onSuccess();
                } else {
                    attempts++;
                    if (attempts >= maxAttempts) {
                        // Échec d'authentification après 3 tentatives
                        context.terminal.write('su: Authentication failure\r\n');
                        onFailure();
                        return;
                    }

                    // Nouvelle tentative
                    context.terminal.write('su: Authentication failure\r\n');
                    attemptAuthentication();
                }
            },
            () => {
                // Annulation (Ctrl+C) - silencieuse comme bash
                onFailure();
            }
        );
    };

    // Démarrer la première tentative
    attemptAuthentication();
}

/**
 * Exécute le changement d'utilisateur après authentification réussie
 * @param {Object} context - Contexte
 * @param {string} targetUsername - Utilisateur cible
 * @param {Object} currentUser - Utilisateur courant
 * @param {boolean} loginShell - Si c'est un login shell
 */
function executeSuChange(context, targetUsername, currentUser, loginShell) {
    const { fileSystem, setCurrentPath } = context;

    try {
        // IMPORTANT: Empiler l'utilisateur courant AVANT de changer
        const userToPush = {
            ...currentUser,
            currentPath: context.getCurrentPath() // Sauver aussi le répertoire courant
        };
        pushUser(userToPush);

        // Changer d'utilisateur
        const newUser = switchUser(targetUsername, fileSystem);
        context.currentUser = newUser;

        // CORRECTION : Ne changer de répertoire QUE si c'est un login shell (avec tiret)
        if (loginShell) {
            if (fileSystem[newUser.home]) {
                setCurrentPath(newUser.home);
            }
        }
        // Sans tiret : rester dans le répertoire courant

        // Su est COMPLÈTEMENT SILENCIEUX quand ça réussit (comportement bash)

    } catch (error) {
        const showError = context?.showError || (str => { context.terminal.write(`${str}\r\n`) });
        showError(error.message);
    }
}

/**
 * Vérifie si un utilisateur n'a pas de mot de passe (hash vide)
 */
function targetUserHasNoPassword(username, fileSystem) {
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

    // Pas de mot de passe = hash vide (après passwd -d)
    return !currentHash || currentHash === '';
}

// Export pour les tests
export { verifyPassword, calculateHash };