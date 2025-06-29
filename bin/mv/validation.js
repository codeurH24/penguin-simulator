// bin/mv/validation.js - Validation des arguments de la commande mv

import { resolvePath } from '../../modules/filesystem.js';

/**
 * Valide les arguments de la commande mv
 * Cette fonction centralise toutes les vérifications de base nécessaires
 * avant d'effectuer un déplacement ou renommage.
 * 
 * mv supporte deux modes :
 * 1. Mode simple : mv source destination (2 arguments)
 * 2. Mode multiple : mv source1 source2... destination (N arguments, N ≥ 3)
 * 
 * @param {Array} args - Arguments passés à la commande mv
 * @param {string} currentPath - Répertoire de travail actuel
 * @param {Function} errorFn - Fonction pour afficher les erreurs
 * @returns {Object} - {valid: boolean, mode: string, sources?: Array, destPath?: string}
 */
export function validateArguments(args, currentPath, errorFn) {
    // Vérification du nombre minimum d'arguments
    if (args.length < 2) {
        errorFn('mv: source et destination requises');
        errorFn('Usage: mv <source> <destination>');
        return { valid: false };
    }

    // Déterminer le mode de fonctionnement
    if (args.length === 2) {
        // MODE SIMPLE : mv source destination
        return validateSimpleMode(args, currentPath, errorFn);
    } else {
        // MODE MULTIPLE : mv source1 source2... destination
        return validateMultipleMode(args, currentPath, errorFn);
    }
}

/**
 * Valide le mode simple (2 arguments)
 * @param {Array} args - Arguments [source, destination]
 * @param {string} currentPath - Répertoire courant
 * @param {Function} errorFn - Fonction d'erreur
 * @returns {Object} - Résultat de validation pour mode simple
 */
function validateSimpleMode(args, currentPath, errorFn) {
    // Résolution des chemins source et destination
    const sourcePath = resolvePath(args[0], currentPath);
    const destPath = resolvePath(args[1], currentPath);

    // Validation de la cohérence des chemins
    const pathValidation = validatePaths(sourcePath, destPath, args[0], args[1], errorFn);
    if (!pathValidation.valid) {
        return { valid: false };
    }

    return {
        valid: true,
        mode: 'simple',
        sourcePath,
        destPath,
        sourceArg: args[0],
        destArg: args[1]
    };
}

/**
 * Valide le mode multiple (N arguments, N ≥ 3)
 * Dans ce mode, tous les arguments sauf le dernier sont des sources,
 * et le dernier argument est forcément un répertoire de destination
 * 
 * @param {Array} args - Arguments [source1, source2, ..., destination]
 * @param {string} currentPath - Répertoire courant
 * @param {Function} errorFn - Fonction d'erreur
 * @returns {Object} - Résultat de validation pour mode multiple
 */
function validateMultipleMode(args, currentPath, errorFn) {
    // En mode multiple, le dernier argument est la destination
    const destArg = args[args.length - 1];
    const sourceArgs = args.slice(0, -1);
    
    // Résoudre tous les chemins
    const destPath = resolvePath(destArg, currentPath);
    const sources = sourceArgs.map(sourceArg => ({
        arg: sourceArg,
        path: resolvePath(sourceArg, currentPath)
    }));

    // Validation spécifique au mode multiple
    const multiValidation = validateMultipleModePaths(sources, destPath, destArg, errorFn);
    if (!multiValidation.valid) {
        return { valid: false };
    }

    return {
        valid: true,
        mode: 'multiple',
        sources,
        destPath,
        destArg
    };
}

/**
 * Valide la cohérence des chemins source et destination
 * Cette fonction vérifie que les chemins respectent la logique Unix
 * 
 * @param {string} sourcePath - Chemin absolu du fichier source
 * @param {string} destPath - Chemin absolu de la destination
 * @param {string} sourceArg - Argument source original (pour les erreurs)
 * @param {string} destArg - Argument destination original (pour les erreurs)
 * @param {Function} errorFn - Fonction pour afficher les erreurs
 * @returns {Object} - {valid: boolean}
 */
function validatePaths(sourcePath, destPath, sourceArg, destArg, errorFn) {
    // Vérification critique : source et destination ne peuvent pas être identiques
    // Cette vérification empêche les opérations destructrices accidentelles
    if (sourcePath === destPath) {
        errorFn(`mv: '${sourceArg}' et '${destArg}' sont le même fichier`);
        return { valid: false };
    }

    // Vérification que la destination n'est pas un sous-répertoire du source
    // Cette protection empêche les boucles infinies lors du déplacement de répertoires
    if (isSubdirectory(destPath, sourcePath)) {
        errorFn(`mv: impossible de déplacer '${sourceArg}' vers '${destArg}': le répertoire de destination est contenu dans le répertoire source`);
        return { valid: false };
    }

    return { valid: true };
}

/**
 * Vérifie si un chemin est un sous-répertoire d'un autre
 * Cette fonction est cruciale pour éviter les déplacements récursifs dangereux
 * 
 * @param {string} possibleChild - Chemin potentiellement enfant
 * @param {string} possibleParent - Chemin potentiellement parent
 * @returns {boolean} - true si possibleChild est dans possibleParent
 */
function isSubdirectory(possibleChild, possibleParent) {
    // Normalisation des chemins pour la comparaison
    const normalizedChild = possibleChild.endsWith('/') ? possibleChild : possibleChild + '/';
    const normalizedParent = possibleParent.endsWith('/') ? possibleParent : possibleParent + '/';
    
    // Un répertoire est un sous-répertoire si son chemin commence par le chemin parent
    return normalizedChild.startsWith(normalizedParent) && normalizedChild !== normalizedParent;
}

/**
 * Valide les chemins pour le mode multiple
 * En mode multiple, des règles spéciales s'appliquent :
 * 1. Aucune source ne peut être identique à la destination
 * 2. Les sources ne peuvent pas contenir la destination (éviter les boucles)
 * 3. Toutes les sources doivent être des chemins valides
 * 
 * @param {Array} sources - Tableau d'objets {arg, path}
 * @param {string} destPath - Chemin de destination
 * @param {string} destArg - Argument de destination original
 * @param {Function} errorFn - Fonction d'erreur
 * @returns {Object} - {valid: boolean}
 */
function validateMultipleModePaths(sources, destPath, destArg, errorFn) {
    // Vérifier que chaque source est différente de la destination
    for (const source of sources) {
        if (source.path === destPath) {
            errorFn(`mv: '${source.arg}' et '${destArg}' sont le même fichier`);
            return { valid: false };
        }

        // Vérifier les boucles de répertoires (source contient destination)
        if (isSubdirectory(destPath, source.path)) {
            errorFn(`mv: impossible de déplacer '${source.arg}' vers '${destArg}': le répertoire de destination est contenu dans le répertoire source`);
            return { valid: false };
        }
    }

    // Vérifier qu'il n'y a pas de doublons dans les sources
    const uniquePaths = new Set(sources.map(s => s.path));
    if (uniquePaths.size !== sources.length) {
        errorFn(`mv: sources dupliquées détectées`);
        return { valid: false };
    }

    return { valid: true };
}