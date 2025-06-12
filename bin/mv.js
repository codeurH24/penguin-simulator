// bin/mv.js - Commande mv (move) isolée - Version améliorée
// Équivalent de /bin/mv sous Debian

import { resolvePath, getBasename } from '../modules/filesystem.js';

/**
 * Commande mv - Déplace/renomme des fichiers et dossiers
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, currentPath, saveFileSystem)
 */
export function cmdMv(args, context) {
    
    const { fileSystem, getCurrentPath, saveFileSystem } = context;
    const currentPath = getCurrentPath();
    
    const term = context.terminal;
    // Utiliser les fonctions du contexte si disponibles, sinon celles par défaut
    const errorFn = context?.showError || (str => { term.write(`${str}\r\n`) });
    const successFn = context?.showSuccess || (str => { term.write(`${str}\r\n`) });
    
    if (args.length < 2) {
        errorFn('mv: source et destination requises');
        errorFn('Usage: mv <source> <destination>');
        return;
    }

    const sourcePath = resolvePath(args[0], currentPath);
    let destPath = resolvePath(args[1], currentPath);

    if (!fileSystem[sourcePath]) {
        errorFn(`mv: ${args[0]}: Fichier ou dossier introuvable`);
        return;
    }

    // Si la destination est un dossier existant, déplacer DANS ce dossier
    if (fileSystem[destPath] && fileSystem[destPath].type === 'dir') {
        const sourceName = getBasename(sourcePath);
        destPath = destPath === '/' ? '/' + sourceName : destPath + '/' + sourceName;
    }

    if (fileSystem[destPath] && destPath !== sourcePath) {
        errorFn(`mv: ${args[1]}: La destination existe déjà`);
        return;
    }

    if (destPath === sourcePath) {
        errorFn(`mv: '${args[0]}' et '${args[1]}' sont le même fichier`);
        return;
    }

    // Sauvegarder les métadonnées originales pour les préserver
    const originalItem = { ...fileSystem[sourcePath] };
    
    // Déplacer l'élément et préserver les métadonnées importantes
    fileSystem[destPath] = {
        ...originalItem,
        modified: new Date() // Seule la date de modification est mise à jour
    };
    delete fileSystem[sourcePath];

    // Si c'est un dossier, déplacer aussi tout son contenu
    if (fileSystem[destPath].type === 'dir') {
        const sourcePrefix = sourcePath === '/' ? '/' : sourcePath + '/';
        const destPrefix = destPath === '/' ? '/' : destPath + '/';

        const childPaths = Object.keys(fileSystem).filter(path =>
            path.startsWith(sourcePrefix) && path !== sourcePath
        );

        childPaths.forEach(childPath => {
            const relativePath = childPath.substring(sourcePrefix.length);
            const newChildPath = destPrefix + relativePath;
            fileSystem[newChildPath] = fileSystem[childPath];
            delete fileSystem[childPath];
        });
    }
    
    saveFileSystem();
}