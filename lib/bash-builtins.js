// lib/bash-builtins.js - Commandes builtin du shell bash
// Commandes intégrées directement dans le shell

import { resolvePath, getNode } from '../modules/filesystem.js';
import { switchUser, getCurrentUser, initUserSystem } from '../modules/users/user.service.js';
import { substituteVariables } from './bash-variables.js';
import { popUser, isUserStackEmpty } from '../modules/users/user-stack.js';
import { 
    FileSystemService,
    PermissionDeniedError,
    FileNotFoundError,
    NotDirectoryError
} from '../modules/filesystem/index.js';

/**
 * Commande help - Affiche l'aide
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte
 */
export function cmdHelp(args, context) {
    const outputFn = context?.addLine || ((str) => { term.write(`${str}\r\n`) });
    
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
    outputFn('  export [var[=value]] - Exporter des variables vers la session');
}


/**
 * Commande export - Exporte des variables vers l'environnement de session
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte
 */
export function cmdExport(args, context) {
    const term = context.terminal;
    const outputFn = context?.addLine || (str => { term.write(`${str}\r\n`) });
    const errorFn = context?.showError || (str => { term.write(`${str}\r\n`) });

    // Initialiser sessionVariables s'il n'existe pas
    if (!context.sessionVariables) {
        context.sessionVariables = {};
    }

    // Si aucun argument, afficher toutes les variables exportées
    if (args.length === 0) {
        const sessionVars = Object.keys(context.sessionVariables);
        if (sessionVars.length === 0) {
            outputFn('Aucune variable exportée');
            return;
        }
        
        sessionVars.sort().forEach(varName => {
            outputFn(`declare -x ${varName}="${context.sessionVariables[varName]}"`);
        });
        return;
    }

    // Traiter chaque argument
    args.forEach(arg => {
        // Cas 1: export VAR=value
        if (arg.includes('=')) {
            const equalIndex = arg.indexOf('=');
            const varName = arg.substring(0, equalIndex);
            const value = arg.substring(equalIndex + 1);

            // Valider le nom de variable
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
                errorFn(`bash: export: '${varName}': nom de variable invalide`);
                return;
            }

            // Substituer les variables dans la valeur
            const resolvedValue = substituteVariables(value, context);

            // Exporter la variable
            context.sessionVariables[varName] = resolvedValue;

            // Si la variable existe aussi en local, la copier vers session
            if (context.localVariables && context.localVariables[varName]) {
                delete context.localVariables[varName];
            }
        }
        // Cas 2: export VAR (exporter une variable locale existante)
        else {
            const varName = arg;

            // Valider le nom de variable
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
                errorFn(`bash: export: '${varName}': nom de variable invalide`);
                return;
            }

            // Vérifier si la variable existe en local
            const localValue = context.localVariables?.[varName];
            const sessionValue = context.sessionVariables?.[varName];
            const envValue = context.variables?.[varName];

            if (localValue !== undefined) {
                // Exporter depuis les variables locales
                context.sessionVariables[varName] = localValue;
                delete context.localVariables[varName];
            } else if (sessionValue !== undefined) {
                // Déjà exportée, ne rien faire
                outputFn(`Variable '${varName}' déjà exportée`);
            } else if (envValue !== undefined) {
                // Exporter depuis les variables d'environnement
                context.sessionVariables[varName] = envValue;
            } else {
                // Variable inexistante, créer vide
                context.sessionVariables[varName] = '';
            }
        }
    });
}

/**
 * Commande pwd - Affiche le répertoire courant
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte
 */
export function cmdPwd(args, context) {
    const term = context.terminal;
    const outputFn = context?.addLine || (str => { term.write(`${str}\r\n`) });
    const currentPath = context.getCurrentPath();
    outputFn(currentPath);
}

/**
 * Commande cd - Change de répertoire avec vérification des permissions
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte
 */
export function cmdCd(args, context) {
    const fs = new FileSystemService(context);
    const term = context.terminal;
    const outputFn = context?.addLine || (str => { term.write(`${str}\r\n`) });
    const errorFn = context?.showError || (str => { term.write(`${str}\r\n`) });
    
    const currentPath = context.getCurrentPath();
    const currentUser = context.currentUser;
    const homePath = currentUser.username === 'root' ? 
        '/root' : `/home/${currentUser.username}`;
    
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
        outputFn(targetPath); // Afficher le nouveau répertoire (comportement bash)
    } else {
        // Gérer le tilde
        let path = args[0];
        if (path === '~') {
            path = homePath;
        } else if (path.startsWith('~/')) {
            path = homePath + path.substring(1);
        }
        
        // Résoudre le chemin (fonction existante)
        targetPath = resolvePath(path, currentPath);
    }
    
    try {
        // ✅ Le FileSystemService vérifie automatiquement :
        // - Existence du répertoire
        // - Permissions de traverse (x) sur le répertoire cible
        // - Permissions de traverse (x) sur tout le chemin d'accès
        const dirEntry = fs.getFile(targetPath, 'traverse');
        
        // Vérifier que c'est bien un répertoire
        if (dirEntry.type !== 'dir') {
            throw new NotDirectoryError(args[0] || targetPath);
        }
        
        // ✅ Permissions OK, on peut changer de répertoire
        
        // Sauvegarder l'ancien répertoire pour cd -
        context.shellVariables.OLDPWD = currentPath;
        
        // Mettre à jour les variables d'environnement
        if (context.variables) {
            context.variables.OLDPWD = currentPath;
            context.variables.PWD = targetPath;
        }
        
        // Changer de répertoire
        context.setCurrentPath(targetPath);
        
    } catch (error) {
        // ✅ Gestion moderne des erreurs avec types spécifiques
        if (error instanceof FileNotFoundError) {
            errorFn(`cd: ${args[0] || targetPath}: Dossier introuvable`);
        } else if (error instanceof NotDirectoryError) {
            errorFn(`cd: ${args[0] || targetPath}: N'est pas un dossier`);
        } else if (error instanceof PermissionDeniedError) {
            errorFn(`cd: ${args[0] || targetPath}: Permission refusée`);
        } else {
            // Erreur inattendue
            errorFn(`cd: ${args[0] || targetPath}: ${error.message}`);
        }
    }
}


/**
 * Commande set - Affiche les variables d'environnement
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte
 */
export function cmdSet(args, context) {
    const { variables } = context;
    const outputFn = context?.addLine || ((str) => { term.write(`${str}\r\n`) });
    
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
 * Commande exit - Quitte la session utilisateur courante ou le terminal
 * @param {Array} args - Arguments de la commande (code de sortie optionnel)
 * @param {Object} context - Contexte
 */
export function cmdExit(args, context) {
    const term = context.terminal;
    const outputFn = context?.addLine || (str => { term.write(`${str}\r\n`) });
    const errorFn = context?.showError || (str => { term.write(`${str}\r\n`) });
    
    // Parser le code de sortie optionnel
    let exitCode = 0;
    if (args.length > 0) {
        const code = parseInt(args[0], 10);
        if (isNaN(code)) {
            errorFn(`exit: ${args[0]}: argument numérique requis`);
            exitCode = 2; // Erreur bash standard
        } else {
            exitCode = code;
        }
    }
    
    // Vérifier s'il y a un utilisateur précédent dans la pile
    if (!isUserStackEmpty()) {
        // Dépiler l'utilisateur précédent
        const previousUser = popUser();
        
        if (previousUser) {
            try {
                // Restaurer l'utilisateur précédent
                const restoredUser = switchUser(previousUser.username, context.fileSystem);
                context.currentUser = restoredUser;
                
                // Restaurer le répertoire courant si sauvegardé
                if (previousUser.currentPath && context.fileSystem[previousUser.currentPath]) {
                    context.setCurrentPath(previousUser.currentPath);
                }
                
                // Exit est silencieux lors du retour à l'utilisateur précédent
                // (comportement bash standard)
                return;
                
            } catch (error) {
                errorFn(`exit: erreur lors de la restauration de l'utilisateur: ${error.message}`);
                return;
            }
        }
    }
    
    // Si pas d'utilisateur dans la pile, c'est vraiment un exit final
    // Dans un vrai terminal, ça fermerait la session
    // Ici on simule juste avec des messages
    
    if (exitCode === 0) {
        outputFn('exit');
        // Dans une vraie implémentation, on fermerait le terminal ici
        // Pour la simulation, on peut juste l'indiquer
    } else {
        outputFn(`exit ${exitCode}`);
    }
    
    // Optionnel: signaler au contexte qu'on veut vraiment quitter
    // context.shouldExit = true;
    // context.exitCode = exitCode;
}

/**
 * Vérifie si une commande est un builtin
 * @param {string} cmd - Nom de la commande
 * @returns {boolean}
 */
export function isBuiltinCommand(cmd) {
    const builtins = ['help', 'pwd', 'cd', 'clear', 'reset', 'set', 'export', 'exit'];
    return builtins.includes(cmd);
}

/**
 * Récupère la liste des commandes builtin
 * @returns {Array}
 */
export function getBuiltinCommands() {
    return ['help', 'pwd', 'cd', 'clear', 'reset', 'set', 'export', 'exit'];
}