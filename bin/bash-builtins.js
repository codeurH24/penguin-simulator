// bin/bash-builtins.js - Commandes builtin du shell bash
// Commandes intégrées directement dans le shell

import { resolvePath } from '../modules/filesystem.js';
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
    outputFn('  cd [dir]    - Changer de dossier (~ = home, cd = retour home)');
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
    outputFn('  echo "test" > file.txt  - Créer un fichier');
    outputFn('  ls -la      - Listing détaillé avec fichiers cachés');
}

/**
 * Commande cd - Change de répertoire
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, currentPath, setCurrentPath, saveFileSystem)
 */
export function cmdCd(args, context) {
    const { fileSystem, currentPath, setCurrentPath, saveFileSystem } = context;
    
    if (args.length === 0) {
        setCurrentPath('/root');
        saveFileSystem();
        return;
    }

    // Gérer l'alias ~ pour le répertoire home
    let targetArg = args[0];
    if (targetArg === '~') {
        targetArg = '/root';
    } else if (targetArg.startsWith('~/')) {
        targetArg = '/root' + targetArg.substring(1);
    }

    const targetPath = resolvePath(targetArg, currentPath);
    
    if (!fileSystem[targetPath]) {
        showError(`cd: ${args[0]}: Dossier introuvable`);
        return;
    }
    
    if (fileSystem[targetPath].type !== 'dir') {
        showError(`cd: ${args[0]}: N'est pas un dossier`);
        return;
    }

    setCurrentPath(targetPath);
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
    
    // Variables d'environnement
    const envVars = {
        'HOME': '/root',
        'PWD': currentPath,
        'USER': 'root',
        'SHELL': '/bin/bash',
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
    
    // Réinitialiser les variables
    if (variables) {
        Object.keys(variables).forEach(key => delete variables[key]);
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