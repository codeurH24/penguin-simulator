// test-cases/lib/helpers.js - Utilitaires et assertions pour les tests
import { getCaptures } from './context.js';

/**
 * Vérifie si le système de fichiers est correctement initialisé
 * @param {Object} context - Contexte à vérifier
 * @returns {Object} - {success: boolean, errors: Array}
 */
export function validateFileSystem(context) {
    const errors = [];

    if (!context.fileSystem['/']) {
        errors.push('Dossier racine / manquant');
    }

    if (!context.fileSystem['/home']) {
        errors.push('Dossier /home manquant');
    }

    if (!context.fileSystem['/root']) {
        errors.push('Dossier /root manquant');
    }

    // CORRECTION: Utiliser getCurrentPath() au lieu de currentPath
    const currentPath = context.getCurrentPath();
    if (currentPath !== '/root') {
        errors.push(`currentPath devrait être /root, mais c'est ${currentPath}`);
    }

    // Vérifier les types
    if (context.fileSystem['/']?.type !== 'dir') {
        errors.push('/ n\'est pas un dossier');
    }

    if (context.fileSystem['/home']?.type !== 'dir') {
        errors.push('/home n\'est pas un dossier');
    }

    if (context.fileSystem['/root']?.type !== 'dir') {
        errors.push('/root n\'est pas un dossier');
    }

    return {
        success: errors.length === 0,
        errors
    };
}

/**
 * Assertions pour les tests - lancent des erreurs si les conditions ne sont pas remplies
 */
export const assert = {
    /**
     * Vérifie qu'une condition est vraie
     */
    isTrue(condition, message) {
        if (!condition) {
            throw new Error(`Assertion échouée: ${message}`);
        }
    },

    /**
     * Vérifie qu'une condition est fausse
     */
    isFalse(condition, message) {
        if (condition) {
            throw new Error(`Assertion échouée: ${message}`);
        }
    },

    /**
     * Vérifie l'égalité de deux valeurs
     */
    equals(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(`Assertion échouée: ${message}. Attendu: ${JSON.stringify(expected)}, Reçu: ${JSON.stringify(actual)}`);
        }
    },

    isNotNull(value, message) {
        if (value === null || value === undefined) {
            throw new Error(`Assertion échouée: ${message}`);
        }
    },

    /**
     * Vérifie que deux valeurs sont différentes
     */
    notEquals(actual, expected, message) {
        if (actual === expected) {
            throw new Error(`Assertion échouée: ${message}. Les valeurs ne devraient pas être égales: ${JSON.stringify(actual)}`);
        }
    },

    /**
     * Vérifie qu'un fichier/dossier existe
     */
    fileExists(context, path, message = `Le fichier ${path} devrait exister`) {
        this.isTrue(context.fileSystem[path] !== undefined, message);
    },

    /**
     * Vérifie qu'un fichier/dossier n'existe pas
     */
    fileNotExists(context, path, message = `Le fichier ${path} ne devrait pas exister`) {
        this.isTrue(context.fileSystem[path] === undefined, message);
    },

    /**
     * Vérifie qu'un élément est un dossier
     */
    isDirectory(context, path, message = `${path} devrait être un dossier`) {
        this.fileExists(context, path);
        this.isTrue(context.fileSystem[path].type === 'dir', message);
    },

    /**
     * Vérifie qu'un élément est un fichier
     */
    isFile(context, path, message = `${path} devrait être un fichier`) {
        this.fileExists(context, path);
        this.isTrue(context.fileSystem[path].type === 'file', message);
    },

    /**
     * Vérifie qu'une sortie contient un texte
     */
    captureContains(text, message = `La capture devrait contenir "${text}"`) {
        const captures = getCaptures();
        const found = captures.some(capture => capture.text.includes(text));
        this.isTrue(found, message);
    },

    /**
     * Vérifie qu'une sortie a une classe CSS spécifique
     */
    captureHasClass(className, message = `La capture devrait avoir la classe "${className}"`) {
        const captures = getCaptures();
        const found = captures.some(capture => capture.className === className);
        this.isTrue(found, message);
    },

    /**
     * Vérifie le nombre de captures
     */
    captureCount(expectedCount, message = `Devrait avoir ${expectedCount} capture(s)`) {
        const captures = getCaptures();
        this.equals(captures.length, expectedCount, message);
    },

    /**
     * Vérifie qu'il n'y a aucune capture (mode silencieux Unix)
     */
    noCaptureOutput(message = 'Aucune sortie attendue (mode silencieux Unix)') {
        this.captureCount(0, message);
    }
};

/**
 * Fonctions utilitaires pour les tests
 */
export const testUtils = {
    /**
     * Affiche l'état du système de fichiers pour debug
     */
    debugFileSystem(context, label = 'Système de fichiers') {
        console.log(`DEBUG - ${label}:`, Object.keys(context.fileSystem));
    },

    /**
     * Affiche les captures actuelles pour debug
     */
    debugCaptures() {
        const captures = getCaptures();
        console.log('DEBUG - Captures:', captures.map(c => c.text));
    },

    /**
     * Crée un dossier de test dans le contexte
     */
    createTestDirectory(context, path) {
        const now = new Date();
        context.fileSystem[path] = {
            type: 'dir',
            size: 4096,
            created: now,
            modified: now,
            accessed: now,
            permissions: 'drwxr-xr-x',
            owner: 'root',
            group: 'root',
            links: 2
        };
    },

    /**
     * Crée un fichier de test dans le contexte
     */
    createTestFile(context, path, content = '') {
        const now = new Date();
        context.fileSystem[path] = {
            type: 'file',
            size: content.length,
            content: content,
            created: now,
            modified: now,
            accessed: now,
            permissions: '-rw-r--r--',
            owner: 'root',
            group: 'root',
            links: 1
        };
    }
};