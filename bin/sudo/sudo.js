// bin/sudo/sudo.js - Point d'entrée principal pour la commande sudo
// Équivalent de /usr/bin/sudo sous Debian

import { verifyPasswordWithContext, authenticate, hasEmptyPassword } from './auth.js';
import { checkSudoTimestamp, updateSudoTimestamp, clearSudoTimestamp, validateTimestamp } from './timestamp.js';
import { canUseSudoWithContext, showSudoPrivileges } from './permissions.js';
import { executeSudoCommand } from './execution.js';
import { getUserFromContext } from './utils.js';

/**
 * Commande sudo - Exécute une commande avec privilèges élevés
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, saveFileSystem, terminal, currentUser)
 * @param {Object} options - Options supplémentaires
 * @returns {Function|undefined} - Fonction pour fournir le mot de passe si demandé, sinon undefined
 */
export function cmdSudo(args, context, options = {}) {
    const { fileSystem, saveFileSystem, terminal } = context;
    const { programmatic = false } = options;
    
    const term = terminal;
    const errorFn = context?.showError || ((str) => { term.write(`${str}\r\n`) });
    const outputFn = context?.addLine || ((str) => { term.write(`${str}\r\n`) });

    // Utiliser context.currentUser comme source de vérité
    const currentUser = context.currentUser;

    if (!currentUser) {
        errorFn('sudo: aucun utilisateur connecté');
        return;
    }

    // Si c'est déjà root, pas besoin de sudo
    if (currentUser.uid === 0) {
        if (args.length === 0) {
            outputFn('root@bash:' + context.getCurrentPath() + '# ');
            return;
        }
        // Exécuter directement la commande en tant que root
        executeSudoCommand(args, context);
        return;
    }

    // Vérifier sudo avec context
    if (!canUseSudoWithContext(context)) {
        errorFn(`${currentUser.username} is not in the sudoers file. This incident will be reported.`);
        return;
    }

    // Vérifier les arguments
    if (args.length === 0) {
        errorFn('usage: sudo [-u user] [-l] [-k] [-v] command');
        errorFn('       sudo -l                 # lister les privilèges');
        errorFn('       sudo -k                 # effacer le timestamp');
        errorFn('       sudo -v                 # valider le timestamp');
        return;
    }

    // Parser les options
    let targetUser = 'root';
    let commandArgs = [];
    let listPrivileges = false;
    let killTimestamp = false;       // sudo -k
    let validateTimestampFlag = false;   // sudo -v

    let i = 0;
    while (i < args.length) {
        const arg = args[i];

        if (arg === '-u' && i + 1 < args.length) {
            targetUser = args[++i];
        } else if (arg === '-l' || arg === '--list') {
            listPrivileges = true;
        } else if (arg === '-k' || arg === '--kill') {
            killTimestamp = true;
        } else if (arg === '-v' || arg === '--validate') {
            validateTimestampFlag = true;
        } else if (arg.startsWith('-')) {
            errorFn(`sudo: option inconnue '${arg}'`);
            errorFn('usage: sudo [-u user] [-l] [-k] [-v] command');
            return;
        } else {
            // Le reste sont les arguments de la commande
            commandArgs = args.slice(i);
            break;
        }
        i++;
    }

    // Gérer sudo -k (effacer timestamp)
    if (killTimestamp) {
        clearSudoTimestamp(context);
        // outputFn('Timestamp sudo effacé.');
        return;
    }

    // Gérer sudo -v (valider/renouveler timestamp)
    if (validateTimestampFlag) {
        validateTimestamp(context, outputFn, errorFn);
        return;
    }

    // Afficher les privilèges si demandé
    if (listPrivileges) {
        showSudoPrivileges(context, outputFn);
        return;
    }

    // Vérifier qu'une commande a été spécifiée
    if (commandArgs.length === 0) {
        errorFn('sudo: une commande est requise');
        return;
    }

    // Mode test : pas de demande de mot de passe
    if (context.test) {
        executeSudoCommand(commandArgs, context, targetUser);
        return;
    }

    // Vérifier si l'utilisateur a un mot de passe vide
    if (hasEmptyPassword(currentUser.username, context)) {
        updateSudoTimestamp(context);
        executeSudoCommand(commandArgs, context, targetUser);
        return;
    }

    // Vérifier le timestamp sudo avant de demander le mot de passe
    if (checkSudoTimestamp(context)) {
        // Timestamp valide : mettre à jour et exécuter sans demander le mot de passe
        updateSudoTimestamp(context);
        executeSudoCommand(commandArgs, context, targetUser);
        return;
    }

    // À ce stade, nous devons demander un mot de passe
    
    // Si l'appel est programmatique, retourner une fonction pour fournir le mot de passe
    if (programmatic) {
        // Afficher le prompt dans le terminal pour que l'utilisateur sache qu'un mot de passe est attendu
        term.write(`[sudo] password for ${currentUser.username}: `);
        
        // Retourner une fonction que l'utilisateur peut appeler avec le mot de passe
        return function(password) {
            // Effacer le mot de passe affiché (sécurité)
            term.write('\r\n');
            
            // Vérifier le mot de passe
            if (!verifyPasswordWithContext(currentUser.username, password, context)) {
                errorFn('Sorry, try again.');
                return false;
            }
            
            // Mettre à jour le timestamp
            updateSudoTimestamp(context);
            
            // Exécuter la commande
            executeSudoCommand(commandArgs, context, targetUser);
            return true;
        };
    }
    
    // Sinon, utiliser le système de prompt interactif (comportement standard)
    authenticate(context, (isValid) => {
        if (!isValid) {
            errorFn('Sorry, try again.');
            return;
        }

        // Créer/mettre à jour le timestamp après authentification réussie
        updateSudoTimestamp(context);

        // Exécuter la commande avec privilèges élevés
        executeSudoCommand(commandArgs, context, targetUser);
    }, () => {
        // Annulation (Ctrl+C)
        outputFn('');
    });
}