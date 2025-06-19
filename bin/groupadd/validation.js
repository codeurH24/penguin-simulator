// bin/groupadd/validation.js - Validation des arguments et options
import { parseGroupFile } from '../../modules/users/user.service.js';

/**
 * Valide les arguments de la commande groupadd
 * @param {Array} args - Arguments de la commande
 * @param {Object} fileSystem - Système de fichiers
 * @returns {Object} - Résultat de validation
 */
export function validateGroupAddArgs(args, fileSystem) {
    const result = {
        isValid: false,
        error: '',
        showUsage: false,
        groupName: '',
        options: {}
    };

    if (args.length === 0) {
        result.error = 'nom de groupe manquant';
        result.showUsage = true;
        return result;
    }

    // Parser les options
    const options = {};
    let groupName = null;
    let i = 0;

    while (i < args.length) {
        const arg = args[i];

        if (arg === '-g' || arg === '--gid') {
            if (i + 1 >= args.length) {
                result.error = 'option --gid nécessite un argument';
                result.showUsage = true;
                return result;
            }
            
            const gidStr = args[++i];
            const gid = parseInt(gidStr);
            
            if (isNaN(gid) || gid < 0) {
                result.error = `GID invalide: '${gidStr}'`;
                return result;
            }
            
            if (gid > 65535) {
                result.error = `GID trop grand: ${gid} (maximum: 65535)`;
                return result;
            }
            
            options.gid = gid;
            
        } else if (arg === '-r' || arg === '--system') {
            options.system = true;
            
        } else if (arg === '-f' || arg === '--force') {
            options.force = true;
            
        } else if (arg.startsWith('-')) {
            result.error = `option inconnue: '${arg}'`;
            result.showUsage = true;
            return result;
            
        } else {
            // C'est le nom du groupe
            if (groupName !== null) {
                result.error = 'trop d\'arguments';
                result.showUsage = true;
                return result;
            }
            groupName = arg;
        }
        
        i++;
    }

    if (!groupName) {
        result.error = 'nom de groupe manquant';
        result.showUsage = true;
        return result;
    }

    // Valider le nom du groupe
    const nameValidation = validateGroupName(groupName);
    if (!nameValidation.isValid) {
        result.error = nameValidation.error;
        return result;
    }

    // Vérifier que le groupe n'existe pas déjà
    const groupExists = checkGroupExists(groupName, fileSystem);
    if (groupExists && !options.force) {
        result.error = `le groupe '${groupName}' existe déjà`;
        return result;
    }

    // Vérifier que le GID n'est pas déjà utilisé
    if (options.gid !== undefined) {
        const gidExists = checkGidExists(options.gid, fileSystem);
        if (gidExists && !options.force) {
            result.error = `le GID '${options.gid}' est déjà utilisé`;
            return result;
        }
    }

    result.isValid = true;
    result.groupName = groupName;
    result.options = options;
    return result;
}

/**
 * Valide le nom d'un groupe selon les règles Debian
 * @param {string} groupName - Nom du groupe à valider
 * @returns {Object} - Résultat de validation
 */
export function validateGroupName(groupName) {
    const result = { isValid: false, error: '' };

    // Vérifier la longueur
    if (groupName.length === 0) {
        result.error = 'nom de groupe vide';
        return result;
    }

    if (groupName.length > 32) {
        result.error = `nom de groupe trop long: '${groupName}' (maximum: 32 caractères)`;
        return result;
    }

    // Vérifier le premier caractère
    if (!/^[a-z_]/.test(groupName)) {
        result.error = `nom de groupe invalide: '${groupName}' (doit commencer par une lettre ou _)`;
        return result;
    }

    // Vérifier les caractères autorisés
    if (!/^[a-z_][a-z0-9_-]*$/.test(groupName)) {
        result.error = `nom de groupe invalide: '${groupName}' (caractères autorisés: a-z, 0-9, _, -)`;
        return result;
    }

    // Vérifier que ça ne finit pas par un tiret
    if (groupName.endsWith('-')) {
        result.error = `nom de groupe invalide: '${groupName}' (ne peut pas finir par -)`;
        return result;
    }

    // Noms réservés
    const reservedNames = ['root', 'daemon', 'bin', 'sys', 'adm', 'tty', 'disk', 'lp', 'mail', 'news'];
    if (reservedNames.includes(groupName)) {
        result.error = `nom de groupe réservé: '${groupName}'`;
        return result;
    }

    result.isValid = true;
    return result;
}

/**
 * Vérifie si un groupe existe déjà
 * @param {string} groupName - Nom du groupe
 * @param {Object} fileSystem - Système de fichiers
 * @returns {boolean} - true si le groupe existe
 */
function checkGroupExists(groupName, fileSystem) {
    try {
        const groups = parseGroupFile(fileSystem);
        return groups.some(g => g.name === groupName);
    } catch (error) {
        return false;
    }
}

/**
 * Vérifie si un GID existe déjà
 * @param {number} gid - GID à vérifier
 * @param {Object} fileSystem - Système de fichiers
 * @returns {boolean} - true si le GID existe
 */
function checkGidExists(gid, fileSystem) {
    try {
        const groups = parseGroupFile(fileSystem);
        return groups.some(g => g.gid === gid);
    } catch (error) {
        return false;
    }
}