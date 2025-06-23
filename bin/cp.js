// bin/cp.js - Commande cp modernisée avec FileSystemService
// Équivalent de /bin/cp sous Debian avec gestion des permissions

import { resolvePath, getBasename, getDirname } from '../modules/filesystem.js';
import { 
    FileSystemService,
    PermissionDeniedError,
    FileNotFoundError,
    FileExistsError,
    IsDirectoryError
} from '../modules/filesystem/index.js';

/**
 * Commande cp - Copie des fichiers et dossiers
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, currentPath, terminal, etc.)
 */
export function cmdCp(args, context) {
    const fs = new FileSystemService(context);
    const currentPath = context.getCurrentPath();
    const term = context.terminal;
    
    const errorFn = context?.showError || (str => { term.write(`${str}\r\n`) });
    const outputFn = context?.addLine || (str => { term.write(`${str}\r\n`) });
    
    if (args.length === 0) {
        errorFn('cp: opérande manquant');
        errorFn('Essayez « cp --help » pour plus d\'informations.');
        return;
    }
    
    // Parser les options
    let recursive = false;
    let force = false;
    let interactive = false;
    let verbose = false;
    let preserve = false;
    let targetIsDir = false;
    
    const parsedArgs = [];
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg.startsWith('-') && arg !== '-') {
            if (arg === '--help') {
                showHelp(outputFn);
                return;
            } else if (arg === '-r' || arg === '-R' || arg === '--recursive') {
                recursive = true;
            } else if (arg === '-f' || arg === '--force') {
                force = true;
            } else if (arg === '-i' || arg === '--interactive') {
                interactive = true;
            } else if (arg === '-v' || arg === '--verbose') {
                verbose = true;
            } else if (arg === '-p' || arg === '--preserve') {
                preserve = true;
            } else if (arg === '-t' || arg === '--target-directory') {
                if (i + 1 >= args.length) {
                    errorFn('cp: option « -t » requiert un argument');
                    return;
                }
                targetIsDir = true;
                parsedArgs.push(args[++i]); // directory target
            } else if (arg.startsWith('-')) {
                // Gestion des options combinées comme -rf
                for (let j = 1; j < arg.length; j++) {
                    const opt = arg[j];
                    if (opt === 'r' || opt === 'R') recursive = true;
                    else if (opt === 'f') force = true;
                    else if (opt === 'i') interactive = true;
                    else if (opt === 'v') verbose = true;
                    else if (opt === 'p') preserve = true;
                    else {
                        errorFn(`cp: option invalide -- '${opt}'`);
                        return;
                    }
                }
            } else {
                errorFn(`cp: option invalide -- '${arg}'`);
                return;
            }
        } else {
            parsedArgs.push(arg);
        }
    }
    
    if (parsedArgs.length < 2) {
        errorFn('cp: il manque un opérande fichier de destination');
        errorFn('Essayez « cp --help » pour plus d\'informations.');
        return;
    }
    
    const sources = parsedArgs.slice(0, -1);
    const destination = parsedArgs[parsedArgs.length - 1];
    
    // Résoudre le chemin de destination
    const destPath = resolvePath(destination, currentPath);
    
    try {
        // Vérifier si la destination existe et est un répertoire
        const destExists = fs.exists(destPath);
        const destIsDirectory = destExists && fs.isDirectory(destPath);
        
        // Si plusieurs sources, la destination doit être un répertoire
        if (sources.length > 1 && !destIsDirectory) {
            if (!destExists) {
                errorFn(`cp: impossible de copier plusieurs fichiers vers '${destination}': N'est pas un répertoire`);
            } else {
                errorFn(`cp: la cible '${destination}' n'est pas un répertoire`);
            }
            return;
        }
        
        // Copier chaque source
        for (const source of sources) {
            const sourcePath = resolvePath(source, currentPath);
            
            try {
                if (!fs.exists(sourcePath)) {
                    errorFn(`cp: impossible d'évaluer '${source}': Aucun fichier ou dossier de ce type`);
                    continue;
                }
                
                // Déterminer le chemin de destination final
                let finalDestPath;
                if (destIsDirectory) {
                    const basename = getBasename(sourcePath);
                    finalDestPath = destPath + (destPath === '/' ? '' : '/') + basename;
                } else {
                    finalDestPath = destPath;
                }
                
                // Vérifier si source et destination sont identiques
                if (sourcePath === finalDestPath) {
                    errorFn(`cp: '${source}' et '${destination}' sont le même fichier`);
                    continue;
                }
                
                // Copier le fichier ou répertoire
                if (fs.isDirectory(sourcePath)) {
                    if (!recursive) {
                        errorFn(`cp: -r non spécifié; '${source}' est un répertoire`);
                        continue;
                    }
                    copyDirectory(fs, sourcePath, finalDestPath, {
                        force, interactive, verbose, preserve, context
                    });
                } else {
                    copyFile(fs, sourcePath, finalDestPath, {
                        force, interactive, verbose, preserve, context
                    });
                }
                
            } catch (error) {
                if (error instanceof PermissionDeniedError) {
                    errorFn(`cp: ${source}: Permission refusée`);
                } else if (error instanceof FileNotFoundError) {
                    errorFn(`cp: ${source}: Fichier introuvable`);
                } else {
                    errorFn(`cp: ${source}: ${error.message}`);
                }
            }
        }
        
    } catch (error) {
        if (error instanceof PermissionDeniedError) {
            errorFn(`cp: ${destination}: Permission refusée`);
        } else {
            errorFn(`cp: ${destination}: ${error.message}`);
        }
    }
}

/**
 * Copie un fichier
 * @param {FileSystemService} fs - Service de système de fichiers
 * @param {string} sourcePath - Chemin source
 * @param {string} destPath - Chemin destination
 * @param {Object} options - Options de copie
 */
function copyFile(fs, sourcePath, destPath, options) {
    const { force, interactive, verbose, preserve, context } = options;
    const term = context.terminal;
    const errorFn = context?.showError || (str => { term.write(`${str}\r\n`) });
    const outputFn = context?.addLine || (str => { term.write(`${str}\r\n`) });
    
    try {
        // Vérifier si le fichier de destination existe
        if (fs.exists(destPath) && !force) {
            if (interactive) {
                // Pour l'instant, on procède sans demander
                // TODO: Implémenter la confirmation interactive avec la classe Prompt
                // context.terminal.terminalService.prompt.askQuestion(
                //     `cp: remplacer '${destPath}' ? `,
                //     (response) => {
                //         if (response.toLowerCase().startsWith('y')) {
                //             performCopy();
                //         }
                //     }
                // );
                // return; // Sortir car la copie sera gérée par le callback
            } else {
                errorFn(`cp: '${destPath}' existe déjà`);
                return;
            }
        }
        
        performCopy();
        
        function performCopy() {
            // Lire le fichier source avec l'API correcte
            const sourceFileEntry = fs.getFile(sourcePath, 'read');
            const content = sourceFileEntry.content || '';
            
            // Créer l'entrée pour le fichier de destination
            const destFileEntry = {
                type: 'file',
                content: content,
                size: content.length,
                created: preserve ? sourceFileEntry.created : new Date(),
                modified: preserve ? sourceFileEntry.modified : new Date(),
                accessed: new Date(),
                owner: preserve ? sourceFileEntry.owner : context.currentUser.username,
                group: preserve ? sourceFileEntry.group : context.currentUser.username,
                permissions: preserve ? sourceFileEntry.permissions : '-rw-r--r--',
                links: 1
            };
            
            // Écrire le fichier de destination
            fs.setFile(destPath, destFileEntry);
            
            if (verbose) {
                outputFn(`'${sourcePath}' -> '${destPath}'`);
            }
        }
        
    } catch (error) {
        throw error;
    }
}

/**
 * Copie un répertoire récursivement
 * @param {FileSystemService} fs - Service de système de fichiers
 * @param {string} sourcePath - Chemin source
 * @param {string} destPath - Chemin destination
 * @param {Object} options - Options de copie
 */
function copyDirectory(fs, sourcePath, destPath, options) {
    const { force, interactive, verbose, preserve, context } = options;
    const term = context.terminal;
    const errorFn = context?.showError || (str => { term.write(`${str}\r\n`) });
    const outputFn = context?.addLine || (str => { term.write(`${str}\r\n`) });
    
    try {
        // Créer le répertoire de destination s'il n'existe pas
        if (!fs.exists(destPath)) {
            // Créer une entrée de répertoire
            const dirEntry = {
                type: 'dir',
                size: 4096,
                created: new Date(),
                modified: new Date(),
                accessed: new Date(),
                owner: context.currentUser.username,
                group: context.currentUser.username,
                permissions: 'drwxr-xr-x',
                links: 2
            };
            
            fs.setFile(destPath, dirEntry);
            
            if (verbose) {
                outputFn(`répertoire créé: '${destPath}'`);
            }
        } else if (!fs.isDirectory(destPath)) {
            errorFn(`cp: '${destPath}' existe et n'est pas un répertoire`);
            return;
        }
        
        // Obtenir la liste des fichiers dans le répertoire source
        const entries = fs.listDirectory(sourcePath);
        
        // Copier chaque entrée
        for (const entry of entries) {
            if (entry.name === '.' || entry.name === '..') continue;
            
            const sourceEntryPath = sourcePath + (sourcePath === '/' ? '' : '/') + entry.name;
            const destEntryPath = destPath + (destPath === '/' ? '' : '/') + entry.name;
            
            if (fs.isDirectory(sourceEntryPath)) {
                // Copie récursive du sous-répertoire
                copyDirectory(fs, sourceEntryPath, destEntryPath, options);
            } else {
                // Copie du fichier
                copyFile(fs, sourceEntryPath, destEntryPath, options);
            }
        }
        
        // Préserver les métadonnées du répertoire si demandé
        if (preserve) {
            const sourceDir = fs.getFile(sourcePath, 'read');
            const destDir = fs.getFile(destPath, 'read');
            destDir.owner = sourceDir.owner;
            destDir.group = sourceDir.group;
            destDir.permissions = sourceDir.permissions;
            destDir.created = sourceDir.created;
            destDir.modified = sourceDir.modified;
        }
        
    } catch (error) {
        throw error;
    }
}

/**
 * Affiche l'aide de la commande cp
 * @param {Function} outputFn - Fonction d'affichage
 */
function showHelp(outputFn) {
    outputFn('Usage: cp [OPTION]... SOURCE DEST');
    outputFn('   ou: cp [OPTION]... SOURCE... RÉPERTOIRE');
    outputFn('');
    outputFn('Copie SOURCE vers DEST, ou plusieurs SOURCE(s) vers RÉPERTOIRE.');
    outputFn('');
    outputFn('Options obligatoires pour les options longues le sont aussi pour les courtes.');
    outputFn('  -f, --force                 ne pas demander avant d\'écraser');
    outputFn('  -i, --interactive           demander avant d\'écraser (priorité sur -f)');
    outputFn('  -p, --preserve              préserver les attributs du fichier si possible');
    outputFn('  -r, -R, --recursive         copier les répertoires récursivement');
    outputFn('  -t, --target-directory=RÉP  copier tous les SOURCEs vers le RÉPertoire');
    outputFn('  -v, --verbose               expliquer ce qui est fait');
    outputFn('      --help                  afficher cette aide et quitter');
    outputFn('');
    outputFn('Signaler les bogues à <https://github.com/codeurH24/penguin-simulator/issues>');
}