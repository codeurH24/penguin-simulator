// bin/touch.js - Commande touch avec FileSystemService
// Équivalent de /usr/bin/touch sous Debian

import { FileSystemService } from '../modules/filesystem/index.js';
import { createFileEntry } from '../modules/filesystem/file-entries.js';
import { resolvePath, getDirname } from '../modules/filesystem.js';

/**
 * Commande touch - Crée des fichiers vides ou met à jour les dates
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, currentPath, saveFileSystem)
 */
export function cmdTouch(args, context) {
    
    const fs = new FileSystemService(context);
    const currentPath = context.getCurrentPath();
    
    // Récupérer l'utilisateur courant
    const currentUser = context.currentUser || { username: 'root', gid: 0, groups: ['root'] };

    const term = context.terminal;
    const errorFn = context?.showError || (str => { term.write(`${str}\r\n`) });
    const successFn = context?.showSuccess || (str => { term.write(`${str}\r\n`) });
    
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
                fileArgs.splice(i, 2);
            } else {
                errorFn('touch: option -r nécessite un argument');
                return;
            }
        } else if (arg.startsWith('-r=')) {
            referenceFile = arg.substring(3);
            fileArgs.splice(i, 1);
        } else if (arg.startsWith('-') && arg.length > 1) {
            for (let j = 1; j < arg.length; j++) {
                const char = arg[j];
                if (char === 'c') noCreate = true;
                else if (char === 'a') accessOnly = true;
                else if (char === 'm') modifyOnly = true;
            }
            fileArgs.splice(i, 1);
        } else {
            i++;
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
        
        if (!fs.exists(refPath)) {
            errorFn(`touch: ${referenceFile}: Fichier de référence introuvable`);
            return;
        }
        
        try {
            const refFile = fs.getFile(refPath, 'read');
            referenceTime = {
                accessed: new Date(refFile.accessed),
                modified: new Date(refFile.modified)
            };
        } catch (error) {
            if (error.name === 'PermissionDeniedError') {
                errorFn(`touch: ${referenceFile}: Fichier de référence introuvable`);
            } else if (error.name === 'FileNotFoundError') {
                errorFn(`touch: ${referenceFile}: Fichier de référence introuvable`);
            } else {
                errorFn(`touch: ${referenceFile}: ${error.message}`);
            }
            return;
        }
    }

    let touchedCount = 0;
    let hasErrors = false;

    // Traiter chaque fichier
    for (const fileName of fileArgs) {
        const filePath = resolvePath(fileName, currentPath);

        if (fs.exists(filePath)) {
            // Le fichier existe - mettre à jour les dates
            try {
                const file = fs.getFile(filePath, 'write');
                
                if (file.type === 'dir') {
                    errorFn(`touch: ${fileName}: Est un dossier`);
                    hasErrors = true;
                    continue;
                }

                const shouldUpdateAccess = (!accessOnly && !modifyOnly) || accessOnly;
                const shouldUpdateModify = (!accessOnly && !modifyOnly) || modifyOnly;
                
                if (referenceTime) {
                    if (shouldUpdateAccess) {
                        file.accessed = new Date(referenceTime.accessed);
                    }
                    if (shouldUpdateModify) {
                        file.modified = new Date(referenceTime.modified);
                    }
                } else {
                    const now = new Date();
                    if (shouldUpdateAccess) {
                        file.accessed = new Date(now);
                    }
                    if (shouldUpdateModify) {
                        file.modified = new Date(now);
                    }
                }
                
                touchedCount++;
            } catch (error) {
                if (error.name === 'PermissionDeniedError') {
                    errorFn(`touch: ${fileName}: Permission refusée`);
                } else if (error.name === 'FileNotFoundError') {
                    errorFn(`touch: ${fileName}: Fichier introuvable`);
                } else {
                    errorFn(`touch: ${fileName}: ${error.message}`);
                }
                hasErrors = true;
            }
        } else {
            // Le fichier n'existe pas
            if (noCreate) {
                continue;
            }

            // Vérifier que le répertoire parent existe
            const parentPath = getDirname(filePath);
            if (!fs.exists(parentPath)) {
                errorFn(`touch: ${fileName}: Le répertoire parent n'existe pas`);
                hasErrors = true;
                continue;
            }

            if (!fs.isDirectory(parentPath)) {
                errorFn(`touch: ${fileName}: Le parent n'est pas un dossier`);
                hasErrors = true;
                continue;
            }
            
            try {
                const now = new Date();
                const shouldUpdateAccess = (!accessOnly && !modifyOnly) || accessOnly;
                const shouldUpdateModify = (!accessOnly && !modifyOnly) || modifyOnly;
                
                let createTime, accessTime;
                
                if (referenceTime) {
                    accessTime = shouldUpdateAccess ? new Date(referenceTime.accessed) : new Date(now);
                    createTime = shouldUpdateModify ? new Date(referenceTime.modified) : new Date(now);
                } else {
                    createTime = new Date(now);
                    accessTime = new Date(now);
                }
                
                // ✅ Utiliser createFileEntry de file-entries.js
                const fileEntry = createFileEntry('');
                
                // ✅ Adapter avec l'utilisateur courant et les bonnes dates
                fileEntry.owner = currentUser.username;
                fileEntry.group = (currentUser.groups && currentUser.groups[0]) || currentUser.username;
                fileEntry.created = now;
                fileEntry.modified = createTime;
                fileEntry.accessed = accessTime;
                
                fs.setFile(filePath, fileEntry);
                touchedCount++;
            } catch (error) {
                if (error.name === 'PermissionDeniedError') {
                    errorFn(`touch: ${fileName}: Permission refusée`);
                } else if (error.name === 'FileNotFoundError') {
                    errorFn(`touch: ${fileName}: Le répertoire parent n'existe pas`);
                } else {
                    errorFn(`touch: ${fileName}: ${error.message}`);
                }
                hasErrors = true;
            }
        }
    }

    // Sauvegarder seulement si quelque chose a été modifié
    if (touchedCount > 0) {
        context.saveFileSystem();
        
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
 * Vérifie si un timestamp est valide
 * @param {string} timestamp - Timestamp au format [[CC]YY]MMDDhhmm[.ss]
 * @returns {Date|null} - Date valide ou null si invalide
 */
function parseTimestamp(timestamp) {
    if (!/^\d{8,12}(\.\d{2})?$/.test(timestamp)) {
        return null;
    }

    try {
        let year, month, day, hour, minute, second = 0;
        
        if (timestamp.length >= 12) {
            year = parseInt(timestamp.substr(0, 4));
            month = parseInt(timestamp.substr(4, 2)) - 1;
            day = parseInt(timestamp.substr(6, 2));
            hour = parseInt(timestamp.substr(8, 2));
            minute = parseInt(timestamp.substr(10, 2));
        } else {
            const currentYear = new Date().getFullYear();
            year = currentYear;
            month = parseInt(timestamp.substr(0, 2)) - 1;
            day = parseInt(timestamp.substr(2, 2));
            hour = parseInt(timestamp.substr(4, 2));
            minute = parseInt(timestamp.substr(6, 2));
        }
        
        if (timestamp.includes('.')) {
            const parts = timestamp.split('.');
            second = parseInt(parts[1]);
        }
        
        const date = new Date(year, month, day, hour, minute, second);
        
        if (isNaN(date.getTime())) {
            return null;
        }
        
        return date;
    } catch (error) {
        return null;
    }
}