// bin/mv/operations.js - Logique principale des opérations de déplacement mv

import { getBasename, getDirname } from '../../modules/filesystem.js';
import { FileSystemService } from '../../modules/filesystem/index.js';
import { preserveMetadata, cloneFileMetadata } from './metadata.js';

/**
 * Effectue l'opération de déplacement complète
 * Cette fonction orchestre toute la logique de déplacement en suivant la sémantique Unix :
 * 1. Analyse de la destination (fichier vs répertoire)
 * 2. Résolution du chemin final de destination
 * 3. Déplacement atomique des données
 * 4. Préservation des métadonnées
 * 5. Nettoyage des anciens emplacements
 * 
 * @param {string} sourcePath - Chemin absolu du fichier source
 * @param {string} destPath - Chemin absolu de la destination
 * @param {Object} sourceFile - Métadonnées du fichier source
 * @param {Object} context - Contexte d'exécution
 * @returns {boolean} - true si l'opération a réussi
 */
export function performMove(sourcePath, destPath, sourceFile, context) {
    const fileSystemService = new FileSystemService(context);
    
    try {
        // ÉTAPE 1: Déterminer le chemin final de destination
        // Cette étape gère la complexité des règles Unix pour mv
        const finalDestPath = resolveFinalDestination(sourcePath, destPath, fileSystemService);
        
        // ÉTAPE 2: Effectuer le déplacement selon le type de fichier
        if (sourceFile.type === 'dir') {
            return moveDirectory(sourcePath, finalDestPath, sourceFile, context);
        } else {
            return moveFile(sourcePath, finalDestPath, sourceFile, context);
        }
    } catch (error) {
        // En cas d'erreur, s'assurer que le système reste dans un état cohérent
        console.error('Erreur lors du déplacement:', error);
        return false;
    }
}

/**
 * Résout le chemin final de destination selon les règles Unix
 * Cette fonction implémente la logique complexe de mv concernant les destinations :
 * - Si destination est un répertoire existant : fichier va DANS ce répertoire
 * - Si destination n'existe pas : renommage du fichier vers ce nom
 * - Si destination est un fichier existant : écrasement (avec préservation)
 * 
 * @param {string} sourcePath - Chemin du fichier source
 * @param {string} destPath - Chemin de destination demandé
 * @param {FileSystemService} fileSystemService - Service de système de fichiers
 * @returns {string} - Chemin final où le fichier sera placé
 */
function resolveFinalDestination(sourcePath, destPath, fileSystemService) {
    try {
        // Tentative de lecture de la destination pour voir si elle existe
        const destFile = fileSystemService.getFile(destPath, 'read');
        
        if (destFile.type === 'dir') {
            // CAS 1: Destination est un répertoire existant
            // Le fichier source va DANS ce répertoire en gardant son nom original
            const sourceName = getBasename(sourcePath);
            return destPath === '/' ? '/' + sourceName : destPath + '/' + sourceName;
        } else {
            // CAS 2: Destination est un fichier existant
            // Écrasement du fichier de destination (comportement Unix standard)
            return destPath;
        }
    } catch (error) {
        // CAS 3: Destination n'existe pas
        // Renommage du fichier source vers le nouveau nom
        return destPath;
    }
}

/**
 * Déplace un fichier simple avec préservation des métadonnées
 * Cette fonction gère le cas le plus commun de mv : déplacer un fichier unique
 * 
 * @param {string} sourcePath - Chemin du fichier source
 * @param {string} destPath - Chemin de destination final
 * @param {Object} sourceFile - Métadonnées du fichier source
 * @param {Object} context - Contexte d'exécution
 * @returns {boolean} - true si succès
 */
function moveFile(sourcePath, destPath, sourceFile, context) {
    const { fileSystem, saveFileSystem } = context;
    
    try {
        // ÉTAPE 1: Créer le nouveau fichier avec métadonnées préservées
        const preservedFile = preserveMetadata(sourceFile);
        
        // ÉTAPE 2: Écrire le fichier à la nouvelle destination
        fileSystem[destPath] = preservedFile;
        
        // ÉTAPE 3: Supprimer l'ancien emplacement
        delete fileSystem[sourcePath];
        
        // ÉTAPE 4: Sauvegarder les changements de manière atomique
        saveFileSystem();
        
        return true;
    } catch (error) {
        console.error('Erreur lors du déplacement du fichier:', error);
        return false;
    }
}

/**
 * Déplace un répertoire complet avec tout son contenu
 * Cette fonction gère la complexité du déplacement récursif de répertoires
 * 
 * @param {string} sourcePath - Chemin du répertoire source
 * @param {string} destPath - Chemin de destination final
 * @param {Object} sourceDir - Métadonnées du répertoire source
 * @param {Object} context - Contexte d'exécution
 * @returns {boolean} - true si succès
 */
function moveDirectory(sourcePath, destPath, sourceDir, context) {
    const { fileSystem, saveFileSystem } = context;
    
    try {
        // ÉTAPE 1: Identifier tous les fichiers et sous-répertoires à déplacer
        const itemsToMove = collectDirectoryContents(sourcePath, fileSystem);
        
        // ÉTAPE 2: Créer le répertoire de destination avec métadonnées préservées
        const preservedDir = preserveMetadata(sourceDir);
        fileSystem[destPath] = preservedDir;
        
        // ÉTAPE 3: Déplacer récursivement tout le contenu
        const moveSuccess = moveDirectoryContents(itemsToMove, sourcePath, destPath, fileSystem);
        
        if (!moveSuccess) {
            // En cas d'échec, nettoyer les changements partiels
            cleanupPartialMove(destPath, fileSystem);
            return false;
        }
        
        // ÉTAPE 4: Supprimer l'ancien répertoire et son contenu
        cleanupOldDirectory(sourcePath, itemsToMove, fileSystem);
        
        // ÉTAPE 5: Sauvegarder tous les changements
        saveFileSystem();
        
        return true;
    } catch (error) {
        console.error('Erreur lors du déplacement du répertoire:', error);
        return false;
    }
}

/**
 * Collecte tous les fichiers et sous-répertoires d'un répertoire
 * Cette fonction parcourt récursivement l'arborescence pour identifier tous les éléments
 * 
 * @param {string} dirPath - Chemin du répertoire à analyser
 * @param {Object} fileSystem - Système de fichiers
 * @returns {Array} - Liste des éléments à déplacer
 */
function collectDirectoryContents(dirPath, fileSystem) {
    const items = [];
    const dirPrefix = dirPath === '/' ? '/' : dirPath + '/';
    
    // Parcours de tous les chemins du système de fichiers
    Object.keys(fileSystem).forEach(path => {
        if (path.startsWith(dirPrefix) && path !== dirPath) {
            // Calcul du chemin relatif par rapport au répertoire source
            const relativePath = path.substring(dirPrefix.length);
            
            items.push({
                oldPath: path,
                relativePath: relativePath,
                file: cloneFileMetadata(fileSystem[path])
            });
        }
    });
    
    // Tri par profondeur pour traiter les fichiers avant leurs répertoires parents
    return items.sort((a, b) => {
        const depthA = a.relativePath.split('/').length;
        const depthB = b.relativePath.split('/').length;
        return depthB - depthA; // Ordre décroissant de profondeur
    });
}

/**
 * Déplace le contenu d'un répertoire vers la nouvelle destination
 * Cette fonction recréé l'arborescence complète à la destination
 * 
 * @param {Array} items - Liste des éléments à déplacer
 * @param {string} sourcePath - Chemin source du répertoire
 * @param {string} destPath - Chemin de destination du répertoire
 * @param {Object} fileSystem - Système de fichiers
 * @returns {boolean} - true si succès
 */
function moveDirectoryContents(items, sourcePath, destPath, fileSystem) {
    try {
        items.forEach(item => {
            // Calcul du nouveau chemin pour chaque élément
            const newPath = destPath === '/' ? '/' + item.relativePath : destPath + '/' + item.relativePath;
            
            // Préservation des métadonnées lors du déplacement
            const preservedFile = preserveMetadata(item.file);
            
            // Création du fichier/répertoire à la nouvelle destination
            fileSystem[newPath] = preservedFile;
        });
        
        return true;
    } catch (error) {
        console.error('Erreur lors du déplacement du contenu:', error);
        return false;
    }
}

/**
 * Nettoie un déplacement partiel en cas d'erreur
 * Cette fonction maintient la cohérence du système de fichiers
 * 
 * @param {string} destPath - Chemin de destination à nettoyer
 * @param {Object} fileSystem - Système de fichiers
 */
function cleanupPartialMove(destPath, fileSystem) {
    // Suppression du répertoire de destination et de tout son contenu créé
    const destPrefix = destPath === '/' ? '/' : destPath + '/';
    
    Object.keys(fileSystem).forEach(path => {
        if (path === destPath || path.startsWith(destPrefix)) {
            delete fileSystem[path];
        }
    });
}

/**
 * Supprime l'ancien répertoire et son contenu après un déplacement réussi
 * Cette fonction complète l'opération de déplacement
 * 
 * @param {string} sourcePath - Chemin du répertoire source
 * @param {Array} items - Liste des éléments qui ont été déplacés
 * @param {Object} fileSystem - Système de fichiers
 */
function cleanupOldDirectory(sourcePath, items, fileSystem) {
    // Suppression de tous les éléments qui ont été déplacés
    items.forEach(item => {
        delete fileSystem[item.oldPath];
    });
    
    // Suppression du répertoire source lui-même
    delete fileSystem[sourcePath];
}