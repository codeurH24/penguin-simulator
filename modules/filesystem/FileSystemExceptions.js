// modules/filesystem/FileSystemExceptions.js
// Classes d'exceptions pour le système de fichiers

/**
 * Exception de base pour le système de fichiers
 */
export class FileSystemError extends Error {
    constructor(message, path = null, operation = null) {
        super(message);
        this.name = 'FileSystemError';
        this.path = path;
        this.operation = operation;
    }
}

/**
 * Exception pour permissions insuffisantes
 */
export class PermissionDeniedError extends FileSystemError {
    constructor(path, operation = 'access') {
        const message = `Permission denied: cannot ${operation} '${path}'`;
        super(message, path, operation);
        this.name = 'PermissionDeniedError';
    }
}

/**
 * Exception pour fichier/répertoire non trouvé
 */
export class FileNotFoundError extends FileSystemError {
    constructor(path) {
        const message = `No such file or directory: '${path}'`;
        super(message, path, 'access');
        this.name = 'FileNotFoundError';
    }
}

/**
 * Exception pour fichier/répertoire déjà existant
 */
export class FileExistsError extends FileSystemError {
    constructor(path) {
        const message = `File exists: '${path}'`;
        super(message, path, 'create');
        this.name = 'FileExistsError';
    }
}

/**
 * Exception pour incompatibilité de type
 */
export class TypeMismatchError extends FileSystemError {
    constructor(path, expectedType, actualType) {
        const message = `Type mismatch: '${path}' is ${actualType}, expected ${expectedType}`;
        super(message, path, 'modify');
        this.name = 'TypeMismatchError';
        this.expectedType = expectedType;
        this.actualType = actualType;
    }
}

/**
 * Exception pour opération sur un répertoire quand on attend un fichier
 */
export class IsDirectoryError extends FileSystemError {
    constructor(path) {
        const message = `Is a directory: '${path}'`;
        super(message, path, 'file_operation');
        this.name = 'IsDirectoryError';
    }
}

/**
 * Exception pour opération sur un fichier quand on attend un répertoire
 */
export class NotDirectoryError extends FileSystemError {
    constructor(path) {
        const message = `Not a directory: '${path}'`;
        super(message, path, 'directory_operation');
        this.name = 'NotDirectoryError';
    }
}