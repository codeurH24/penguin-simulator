// lib/bash-builtins.js - Commandes builtin du shell bash
// Commandes intégrées directement dans le shell

import { resolvePath, getNode } from '../modules/filesystem.js';
import { getCurrentUser, initUserSystem } from '../modules/users/user.service.js';
import { addLine, showError, showSuccess, clearTerminal } from '../modules/terminal/terminal.js';

/**
 * Commande help - Affiche l'aide
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte
 */
export function cmdHelp(args, context) {
    const outputFn = context?.addLine || addLine;
    
    outputFn('Commandes disponibles:');
    outputFn('  ls          - Lister le contenu');
    outputFn('  cd [dir]    - Changer de dossier (~ = home, cd = retour home, cd - = répertoire précédent)');
    outputFn('  mkdir [-p] <dir> - Créer un dossier (-p: créer parents)');
    outputFn('  mv <src> <dest> - Déplacer/renommer');
    outputFn('  rm [-r] [-f] <files> - Supprimer (-r: récursif, -f: forcer)');
    outputFn('  echo <text> - Afficher du texte');
    outputFn('  pwd         - Afficher le chemin');
    outputFn('  set         - Afficher les variables');
    outputFn('  clear       - Vider le terminal');
    outputFn('  reset       - Réinitialiser');
    outputFn('  cat <file>  - Afficher le contenu d\'un fichier');
    outputFn('');
    outputFn('Gestion des utilisateurs:');
    outputFn('  useradd <user> - Ajouter un utilisateur');
    outputFn('  userdel <user> - Supprimer un utilisateur');
    outputFn('  su [user]   - Changer d\'utilisateur');
    outputFn('  passwd [user] - Changer le mot de passe');
    outputFn('  whoami      - Afficher l\'utilisateur courant');
    outputFn('  id [user]   - Afficher les informations d\'identité');
    outputFn('  groups [user] - Afficher les groupes');
    outputFn('');
    outputFn('Redirections:');
    outputFn('  cmd > file  - Rediriger la sortie vers un fichier');
    outputFn('  cmd >> file - Ajouter la sortie à un fichier');
    outputFn('');
    outputFn('Variables:');
    outputFn('  VAR=value   - Définir une variable');
    outputFn('  $VAR        - Utiliser une variable');
    outputFn('  set         - Afficher toutes les variables');
    outputFn('');
    outputFn('Navigation:');
    outputFn('  TAB         - Autocomplétion');
    outputFn('  ↑/↓         - Historique des commandes');
}

/**
 * Commande pwd - Affiche le répertoire courant
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte
 */
export function cmdPwd(args, context) {
    const outputFn = context?.addLine || addLine;
    const currentPath = context.getCurrentPath();
    outputFn(currentPath);
}

/**
 * Commande cd - Change de répertoire
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte
 */
export function cmdCd(args, context) {
    const outputFn = context?.addLine || addLine;
    const errorFn = context?.showError || showError;
    const fs = context?.fileSystem || context?.fs;
    
    const currentPath = context.getCurrentPath();
    const currentUser = getCurrentUser();
    const homePath = currentUser.username === 'root' ? '/root' : `/home/${currentUser.username}`;
    
    // Initialiser shellVariables si nécessaire
    if (!context.shellVariables) {
        context.shellVariables = {};
    }
    
    let targetPath;
    
    if (args.length === 0) {
        // cd sans argument → home
        targetPath = homePath;
    } else if (args[0] === '-') {
        // cd - → répertoire précédent
        targetPath = context.shellVariables.OLDPWD || currentPath;
        outputFn(targetPath); // Afficher le nouveau répertoire
    } else {
        // Gérer le tilde
        let path = args[0];
        if (path === '~') {
            path = homePath;
        } else if (path.startsWith('~/')) {
            path = homePath + path.substring(1);
        }
        
        targetPath = resolvePath(path, currentPath);
    }
    
    // Vérifier existence
    if (!fs[targetPath]) {
        errorFn(`cd: ${args[0]}: Dossier introuvable`);
        return;
    }
    
    // Vérifier type
    if (fs[targetPath].type !== 'dir') {
        errorFn(`cd: ${args[0]}: N'est pas un dossier`);
        return;
    }
    
    // Sauvegarder l'ancien répertoire
    context.shellVariables.OLDPWD = currentPath;
    
    // Changer de répertoire
    context.setCurrentPath(targetPath);
}

/**
 * Commande clear - Vide le terminal
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte
 */
export function cmdClear(args, context) {
    clearTerminal();
}

/**
 * Commande reset - Réinitialise le terminal
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte
 */
export function cmdReset(args, context) {
    clearTerminal();
    showSuccess('Terminal réinitialisé');
}

/**
 * Commande set - Affiche les variables d'environnement
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte
 */
export function cmdSet(args, context) {
    const { variables } = context;
    const outputFn = context?.addLine || addLine;
    
    // Ajouter les variables système
    const currentUser = getCurrentUser();
    const allVariables = {
        ...variables,
        HOME: currentUser.home,
        USER: currentUser.username,
        PWD: context.getCurrentPath(),
        SHELL: currentUser.shell,
        PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
    };
    
    // Afficher toutes les variables triées
    Object.keys(allVariables)
        .sort()
        .forEach(key => {
            outputFn(`${key}=${allVariables[key]}`);
        });
}

/**
 * Commande exit - Quitte le terminal (simulation)
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte
 */
export function cmdExit(args, context) {
    const outputFn = context?.addLine || addLine;
    outputFn('logout');
    outputFn('Session fermée.');
}

/**
 * Vérifie si une commande est un builtin
 * @param {string} cmd - Nom de la commande
 * @returns {boolean}
 */
export function isBuiltinCommand(cmd) {
    const builtins = ['help', 'pwd', 'cd', 'clear', 'reset', 'set', 'exit'];
    return builtins.includes(cmd);
}

/**
 * Exécute une commande builtin
 * @param {string} cmd - Nom de la commande
 * @param {Array} args - Arguments
 * @param {Object} context - Contexte
 */
export function executeBuiltin(cmd, args, context) {
    switch (cmd) {
        case 'help':
            cmdHelp(args, context);
            break;
        case 'pwd':
            cmdPwd(args, context);
            break;
        case 'cd':
            cmdCd(args, context);
            break;
        case 'clear':
            cmdClear(args, context);
            break;
        case 'reset':
            cmdReset(args, context);
            break;
        case 'set':
            cmdSet(args, context);
            break;
        case 'exit':
            cmdExit(args, context);
            break;
        default:
            showError(`bash: builtin ${cmd} non implémenté`);
    }
}

/**
 * Récupère la liste des commandes builtin
 * @returns {Array}
 */
export function getBuiltinCommands() {
    return ['help', 'pwd', 'cd', 'clear', 'reset', 'set', 'exit'];
}