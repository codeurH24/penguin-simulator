// bin/mv.js - Commande mv (move) isolée
// Équivalent de /bin/mv sous Debian

import { resolvePath, getBasename } from '../modules/filesystem.js';
import { showError, showSuccess } from '../modules/terminal.js';

/**
 * Commande mv - Déplace/renomme des fichiers et dossiers
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, currentPath, saveFileSystem)
 */
export function cmdMv(args, context) {
    const { fileSystem, currentPath, saveFileSystem } = context;
    
    if (args.length < 2) {
        showError('mv: source et destination requises');
        showError('Usage: mv <source> <destination>');
        return;
    }

    const sourcePath = resolvePath(args[0], currentPath);
    let destPath = resolvePath(args[1], currentPath);

    if (!fileSystem[sourcePath]) {
        showError(`mv: ${args[0]}: Fichier ou dossier introuvable`);
        return;
    }

    // Si la destination est un dossier existant, déplacer DANS ce dossier
    if (fileSystem[destPath] && fileSystem[destPath].type === 'dir') {
        const sourceName = getBasename(sourcePath);
        destPath = destPath === '/' ? '/' + sourceName : destPath + '/' + sourceName;
    }

    if (fileSystem[destPath] && destPath !== sourcePath) {
        showError(`mv: ${args[1]}: La destination existe déjà`);
        return;
    }

    if (destPath === sourcePath) {
        showError(`mv: '${args[0]}' et '${args[1]}' sont le même fichier`);
        return;
    }

    // Déplacer l'élément et mettre à jour les métadonnées
    fileSystem[destPath] = { ...fileSystem[sourcePath] };
    fileSystem[destPath].modified = new Date(); // Mise à jour date modification
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

    showSuccess(`'${args[0]}' déplacé vers '${getBasename(destPath)}'`);
    saveFileSystem();
}