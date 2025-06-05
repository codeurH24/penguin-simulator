// bin/bash-builtins.js - Commandes builtin du shell bash
// Commandes intégrées directement dans le shell

import { resolvePath } from '../modules/filesystem.js';
import { getCurrentUser, initUserSystem } from '../modules/users.js';
import { addLine, showError, showSuccess, clearTerminal } from '../modules/terminal.js';

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
    outputFn('  cat < file  - Lire depuis un fichier');
    outputFn('');
    outputFn('Variables:');
    outputFn('  var=value   - Définir une variable');
    outputFn('  $var        - Utiliser une variable');
    outputFn('  $HOME $PWD  - Variables d\'environnement');
    outputFn('');
    outputFn('Exemples:');
    outputFn('  cd ~        - Aller au répertoire home');
    outputFn('  cd -        - Retourner au répertoire précédent');
    outputFn('  echo "test" > file.txt  - Créer un fichier');
    outputFn('  ls -la      - Listing détaillé avec fichiers cachés');
    outputFn('  useradd alice && passwd alice - Créer un utilisateur');
}

/**
 * Commande cd - Change de répertoire avec support de cd - (MISE À JOUR pour nouvelle architecture)
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, getCurrentPath, setCurrentPath, saveFileSystem, variables)
 */
export function cmdCd(args, context) {
    const { fileSystem, getCurrentPath, setCurrentPath, saveFileSystem, variables } = context;
    const currentUser = getCurrentUser();
    
    // Utiliser les fonctions du contexte si disponibles, sinon celles par défaut
    const errorFn = context?.showError || showError;
    const outputFn = context?.addLine || addLine;
    
    // Obtenir le chemin courant via la méthode
    const currentPath = getCurrentPath();
    
    // Initialiser OLDPWD si n'existe pas
    if (!variables) {
        context.variables = {};
    }
    if (!variables.OLDPWD) {
        variables.OLDPWD = currentPath;
    }
    
    if (args.length === 0) {
        // cd sans argument -> aller au home
        const oldPath = currentPath;
        setCurrentPath(currentUser.home);
        variables.OLDPWD = oldPath;
        saveFileSystem();
        return;
    }

    const arg = args[0];
    
    if (arg === '-') {
        // cd - -> aller au répertoire précédent
        const previousPath = variables.OLDPWD || currentUser.home;
        
        // Vérifier que le répertoire précédent existe encore
        if (!fileSystem[previousPath]) {
            errorFn(`cd: ${previousPath}: Dossier introuvable`);
            return;
        }
        
        if (fileSystem[previousPath].type !== 'dir') {
            errorFn(`cd: ${previousPath}: N'est pas un dossier`);
            return;
        }
        
        // Échanger les répertoires courant et précédent
        const oldPath = currentPath;
        setCurrentPath(previousPath);
        variables.OLDPWD = oldPath;
        
        // Afficher le nouveau répertoire (comme le fait le vrai bash)
        outputFn(previousPath);
        
        saveFileSystem();
        return;
    }

    // Gérer l'alias ~ pour le répertoire home
    let targetArg = arg;
    if (targetArg === '~') {
        targetArg = currentUser.home;
    } else if (targetArg.startsWith('~/')) {
        targetArg = currentUser.home + targetArg.substring(1);
    }

    const targetPath = resolvePath(targetArg, currentPath);
    
    if (!fileSystem[targetPath]) {
        errorFn(`cd: ${args[0]}: Dossier introuvable`);
        return;
    }
    
    if (fileSystem[targetPath].type !== 'dir') {
        errorFn(`cd: ${args[0]}: N'est pas un dossier`);
        return;
    }

    // Sauvegarder le répertoire courant comme précédent
    const oldPath = currentPath;
    setCurrentPath(targetPath);
    variables.OLDPWD = oldPath;
    
    saveFileSystem();
}
/**
 * Commande pwd - Affiche le répertoire courant
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (currentPath)
 */
export function cmdPwd(args, context) {
    const { currentPath } = context;
    const outputFn = context?.addLine || addLine;
    outputFn(currentPath);
}

/**
 * Commande set - Affiche les variables définies
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (variables)
 */
export function cmdSet(args, context) {
    const { variables = {}, currentPath } = context;
    const outputFn = context?.addLine || addLine;
    const currentUser = getCurrentUser();
    
    // Variables d'environnement
    const envVars = {
        'HOME': currentUser.home,
        'PWD': currentPath,
        'OLDPWD': variables.OLDPWD || currentPath,
        'USER': currentUser.username,
        'SHELL': currentUser.shell,
        'UID': currentUser.uid.toString(),
        'GID': currentUser.gid.toString(),
        'PATH': '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
    };
    
    // Afficher les variables d'environnement
    outputFn('Variables d\'environnement:');
    Object.entries(envVars).forEach(([name, value]) => {
        outputFn(`${name}=${value}`);
    });
    
    // Afficher les variables utilisateur
    if (Object.keys(variables).length > 0) {
        outputFn('');
        outputFn('Variables utilisateur:');
        Object.entries(variables).forEach(([name, value]) => {
            outputFn(`${name}=${value}`);
        });
    }
}

/**
 * Commande clear - Efface le terminal
 */
export function cmdClear() {
    clearTerminal();
}

/**
 * Commande reset - Réinitialise le système de fichiers
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, setCurrentPath, saveFileSystem, variables)
 */
export function cmdReset(args, context) {
    const { fileSystem, setCurrentPath, saveFileSystem, variables } = context;
    
    // Réinitialiser le système de fichiers avec vraies métadonnées
    Object.keys(fileSystem).forEach(key => delete fileSystem[key]);
    
    const now = new Date();
    const createDir = () => ({
        type: 'dir',
        size: 4096,
        created: now,
        modified: now,
        accessed: now,
        permissions: 'drwxr-xr-x',
        owner: 'root',
        group: 'root',
        links: 2
    });
    
    fileSystem['/'] = createDir();
    fileSystem['/home'] = createDir();
    fileSystem['/root'] = createDir();
    
    // Initialiser les fichiers système
    initUserSystem(fileSystem);
    
    // Réinitialiser les variables
    if (variables) {
        Object.keys(variables).forEach(key => delete variables[key]);
        variables.OLDPWD = '/root'; // Initialiser OLDPWD
    }
    
    setCurrentPath('/root');
    saveFileSystem();
    showSuccess('🔄 Système de fichiers et variables réinitialisés');
}

/**
 * Obtient la liste de toutes les commandes builtin
 * @returns {Array} - Liste des commandes builtin
 */
export function getBuiltinCommands() {
    return ['help', 'cd', 'pwd', 'set', 'clear', 'reset'];
}

/**
 * Vérifie si une commande est un builtin
 * @param {string} command - Nom de la commande
 * @returns {boolean} - true si la commande est un builtin
 */
export function isBuiltinCommand(command) {
    return getBuiltinCommands().includes(command);
}

/**
 * Exécute une commande builtin
 * @param {string} cmd - Nom de la commande
 * @param {Array} args - Arguments
 * @param {Object} context - Contexte d'exécution
 * @returns {boolean} - true si la commande a été exécutée
 */
export function executeBuiltin(cmd, args, context) {
    switch (cmd) {
        case 'help':
            cmdHelp(args, context);
            return true;
        case 'cd':
            cmdCd(args, context);
            return true;
        case 'pwd':
            cmdPwd(args, context);
            return true;
        case 'set':
            cmdSet(args, context);
            return true;
        case 'clear':
            cmdClear();
            return true;
        case 'reset':
            cmdReset(args, context);
            return true;
        default:
            return false;
    }
}