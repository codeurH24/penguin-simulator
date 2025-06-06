// bin/touch.js - Commande touch isolée
// Équivalent de /usr/bin/touch sous Debian

import { resolvePath, getDirname } from '../modules/filesystem.js';
import { showError, showSuccess } from '../modules/terminal.js';

/**
 * Commande touch - Crée des fichiers vides ou met à jour les dates
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, currentPath, saveFileSystem)
 */
export function cmdTouch(args, context) {
    
    const { fileSystem, getCurrentPath, saveFileSystem } = context;
    const currentPath = getCurrentPath();
    
    // Utiliser les fonctions du contexte si disponibles, sinon celles par défaut
    const errorFn = context?.showError || showError;
    const successFn = context?.showSuccess || showSuccess;
    
    if (args.length === 0) {
        errorFn('touch: opérande manquant');
        errorFn('Usage: touch [options] <fichier1> [fichier2] ...');
        return;
    }

    // Gérer les options
    let noCreate = false;
    let accessOnly = false;
    let modifyOnly = false;
    let referenceFile = null;
    let fileArgs = [...args];

    // Parser les options - approche simplifiée
    let i = 0;
    while (i < fileArgs.length) {
        const arg = fileArgs[i];
        
        if (arg === '-c' || arg === '--no-create') {
            noCreate = true;
            fileArgs.splice(i, 1);
        } else if (arg === '-a') {
            accessOnly = true;
            fileArgs.splice(i, 1);
        } else if (arg === '-m') {
            modifyOnly = true;
            fileArgs.splice(i, 1);
        } else if (arg === '-r') {
            if (i + 1 < fileArgs.length) {
                referenceFile = fileArgs[i + 1];
                fileArgs.splice(i, 2); // Retirer -r et le fichier de référence
            } else {
                errorFn('touch: option -r nécessite un argument');
                return;
            }
        } else if (arg.startsWith('-r=')) {
            referenceFile = arg.substring(3);
            fileArgs.splice(i, 1);
        } else if (arg.startsWith('-') && arg.length > 1) {
            // Options combinées comme -am, -ac, etc.
            for (let j = 1; j < arg.length; j++) {
                const char = arg[j];
                if (char === 'c') noCreate = true;
                else if (char === 'a') accessOnly = true;
                else if (char === 'm') modifyOnly = true;
            }
            fileArgs.splice(i, 1);
        } else {
            i++; // Garder cet argument, passer au suivant
        }
    }

    if (fileArgs.length === 0) {
        errorFn('touch: aucun fichier spécifié');
        return;
    }

    // Vérifier le fichier de référence AVANT de traiter les fichiers
    let referenceTime = null;
    if (referenceFile) {
        
        const refPath = resolvePath(referenceFile, currentPath);
        
        
        if (!fileSystem[refPath]) {
            
            errorFn(`touch: ${referenceFile}: Fichier de référence introuvable`);
            return; // Arrêter complètement si le fichier de référence n'existe pas
        }
        const refFile = fileSystem[refPath];
        referenceTime = {
            accessed: new Date(refFile.accessed),
            modified: new Date(refFile.modified)
        };
        
    }
    

    let touchedCount = 0;
    let hasErrors = false;

    // Traiter chaque fichier
    for (const fileName of fileArgs) {
        const filePath = resolvePath(fileName, currentPath);
        

        if (fileSystem[filePath]) {
            // Le fichier existe - mettre à jour les dates
            const file = fileSystem[filePath];
            
            
            if (file.type === 'dir') {
                errorFn(`touch: ${fileName}: Est un dossier`);
                hasErrors = true;
                continue;
            }

            // Déterminer quelles dates mettre à jour
            // Comportement touch standard :
            // - Aucune option : les deux dates
            // - Seulement -a : access time seulement  
            // - Seulement -m : modify time seulement
            // - -a ET -m : les deux dates
            const shouldUpdateAccess = (!accessOnly && !modifyOnly) || accessOnly;
            const shouldUpdateModify = (!accessOnly && !modifyOnly) || modifyOnly;
            
            const oldAccess = new Date(file.accessed);
            const oldModify = new Date(file.modified);
            
            if (referenceTime) {
                // Utiliser les dates du fichier de référence
                if (shouldUpdateAccess) {
                    file.accessed = new Date(referenceTime.accessed);
                    
                }
                if (shouldUpdateModify) {
                    file.modified = new Date(referenceTime.modified);
                    
                }
            } else {
                // Utiliser la date actuelle
                const now = new Date();
                if (shouldUpdateAccess) {
                    file.accessed = new Date(now);
                    
                }
                if (shouldUpdateModify) {
                    file.modified = new Date(now);
                    
                }
            }
            
            touchedCount++;
        } else {
            
            // Le fichier n'existe pas
            if (noCreate) {
                // Option -c : ne pas créer
                continue;
            }

            // Vérifier que le répertoire parent existe
            const parentPath = getDirname(filePath);
            if (!fileSystem[parentPath]) {
                errorFn(`touch: ${fileName}: Le répertoire parent n'existe pas`);
                hasErrors = true;
                continue;
            }

            if (fileSystem[parentPath].type !== 'dir') {
                errorFn(`touch: ${fileName}: Le parent n'est pas un dossier`);
                hasErrors = true;
                continue;
            }
            
            
            // Créer le fichier avec les bonnes dates
            const now = new Date();
            
            // Même logique que pour les fichiers existants
            const shouldUpdateAccess = (!accessOnly && !modifyOnly) || accessOnly;
            const shouldUpdateModify = (!accessOnly && !modifyOnly) || modifyOnly;
            
            let createTime, accessTime;
            
            if (referenceTime) {
                // Pour un nouveau fichier, created = now, mais access/modify selon les options
                accessTime = shouldUpdateAccess ? new Date(referenceTime.accessed) : new Date(now);
                createTime = shouldUpdateModify ? new Date(referenceTime.modified) : new Date(now);
            } else {
                createTime = new Date(now);
                accessTime = new Date(now);
            }
            
            fileSystem[filePath] = createFileEntry('', createTime, accessTime);
            touchedCount++;
        }
    }

    // Sauvegarder seulement si quelque chose a été modifié
    if (touchedCount > 0) {
        saveFileSystem();
        
        // Touch est généralement silencieux en cas de succès (comme le vrai touch)
        // Mais on peut optionnellement afficher un message en mode debug
        if (context.debug) {
            if (touchedCount === 1) {
                successFn(`Fichier traité: ${fileArgs[0]}`);
            } else {
                successFn(`${touchedCount} fichiers traités`);
            }
        }
    }
}

/**
 * Crée une entrée de fichier avec métadonnées personnalisées
 * @param {string} content - Contenu du fichier
 * @param {Date} modifiedTime - Date de modification (optionnelle)
 * @param {Date} accessedTime - Date d'accès (optionnelle)
 * @returns {Object} - Objet fichier avec métadonnées
 */
function createFileEntry(content = '', modifiedTime = null, accessedTime = null) {
    const now = new Date();
    const modTime = modifiedTime || now;
    const accTime = accessedTime || now;
    
    return {
        type: 'file',
        size: content.length,
        content: content,
        created: now,
        modified: modTime,
        accessed: accTime,
        permissions: '-rw-r--r--',
        owner: 'root',
        group: 'root',
        links: 1
    };
}

/**
 * Vérifie si un timestamp est valide
 * @param {string} timestamp - Timestamp au format [[CC]YY]MMDDhhmm[.ss]
 * @returns {Date|null} - Date valide ou null si invalide
 */
function parseTimestamp(timestamp) {
    // Implémentation simplifiée pour les formats courants
    // Format: YYYYMMDDHHMM ou MMDDHHMM
    
    if (!/^\d{8,12}(\.\d{2})?$/.test(timestamp)) {
        return null;
    }

    try {
        let year, month, day, hour, minute, second = 0;
        
        if (timestamp.length >= 12) {
            // Format YYYYMMDDHHMM
            year = parseInt(timestamp.substr(0, 4));
            month = parseInt(timestamp.substr(4, 2)) - 1; // JS months are 0-based
            day = parseInt(timestamp.substr(6, 2));
            hour = parseInt(timestamp.substr(8, 2));
            minute = parseInt(timestamp.substr(10, 2));
        } else {
            // Format MMDDHHMM (année courante)
            const currentYear = new Date().getFullYear();
            year = currentYear;
            month = parseInt(timestamp.substr(0, 2)) - 1;
            day = parseInt(timestamp.substr(2, 2));
            hour = parseInt(timestamp.substr(4, 2));
            minute = parseInt(timestamp.substr(6, 2));
        }
        
        // Gérer les secondes si présentes
        if (timestamp.includes('.')) {
            second = parseInt(timestamp.split('.')[1]);
        }
        
        const date = new Date(year, month, day, hour, minute, second);
        
        // Vérifier que la date est valide
        if (isNaN(date.getTime())) {
            return null;
        }
        
        return date;
    } catch (error) {
        return null;
    }
}