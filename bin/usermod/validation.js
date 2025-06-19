// bin/usermod/validation.js - Validation des arguments et paramètres usermod

/**
 * Parse et valide les arguments de la commande usermod
 * @param {Array} args - Arguments de la ligne de commande
 * @param {Function} errorFn - Fonction d'affichage des erreurs
 * @returns {Object|null} - Object {options, username} ou null en cas d'erreur
 */
export function validateUsermodArgs(args, errorFn) {
    const options = {};
    let username = null;
    let i = 0;

    while (i < args.length) {
        const arg = args[i];

        // Options avec valeur
        if (['-c', '--comment'].includes(arg)) {
            if (i + 1 >= args.length) {
                errorFn(`usermod: l'option « ${arg} » requiert un argument`);
                return null;
            }
            options.comment = args[++i];
        }
        else if (['-d', '--home'].includes(arg)) {
            if (i + 1 >= args.length) {
                errorFn(`usermod: l'option « ${arg} » requiert un argument`);
                return null;
            }
            options.home = args[++i];
        }
        else if (['-e', '--expiredate'].includes(arg)) {
            if (i + 1 >= args.length) {
                errorFn(`usermod: l'option « ${arg} » requiert un argument`);
                return null;
            }
            if (!validateExpirationDate(args[i + 1])) {
                errorFn(`usermod: date invalide « ${args[i + 1]} »`);
                return null;
            }
            options.expiredate = args[++i];
        }
        else if (['-g', '--gid'].includes(arg)) {
            if (i + 1 >= args.length) {
                errorFn(`usermod: l'option « ${arg} » requiert un argument`);
                return null;
            }
            const gid = parseGroupIdentifier(args[i + 1]);
            if (gid === null) {
                errorFn(`usermod: groupe invalide « ${args[i + 1]} »`);
                return null;
            }
            options.gid = gid;
            i++;
        }
        else if (['-G', '--groups'].includes(arg)) {
            if (i + 1 >= args.length) {
                errorFn(`usermod: l'option « ${arg} » requiert un argument`);
                return null;
            }
            options.groups = args[++i];
        }
        else if (['-l', '--login'].includes(arg)) {
            if (i + 1 >= args.length) {
                errorFn(`usermod: l'option « ${arg} » requiert un argument`);
                return null;
            }
            if (!validateUsername(args[i + 1])) {
                errorFn(`usermod: nom d'utilisateur invalide « ${args[i + 1]} »`);
                return null;
            }
            options.login = args[++i];
        }
        else if (['-s', '--shell'].includes(arg)) {
            if (i + 1 >= args.length) {
                errorFn(`usermod: l'option « ${arg} » requiert un argument`);
                return null;
            }
            options.shell = args[++i];
        }
        else if (['-u', '--uid'].includes(arg)) {
            if (i + 1 >= args.length) {
                errorFn(`usermod: l'option « ${arg} » requiert un argument`);
                return null;
            }
            const uid = parseInt(args[i + 1]);
            if (isNaN(uid) || uid < 0) {
                errorFn(`usermod: UID invalide « ${args[i + 1]} »`);
                return null;
            }
            options.uid = uid;
            i++;
        }
        // Options sans valeur (flags)
        else if (['-a', '--append'].includes(arg)) {
            options.append = true;
        }
        else if (['-L', '--lock'].includes(arg)) {
            options.lock = true;
        }
        else if (['-m', '--move-home'].includes(arg)) {
            options.moveHome = true;
        }
        else if (['-U', '--unlock'].includes(arg)) {
            options.unlock = true;
        }
        else if (['-h', '--help'].includes(arg)) {
            return { showHelp: true };
        }
        // Argument sans option = nom d'utilisateur
        else if (!arg.startsWith('-')) {
            if (username !== null) {
                errorFn('usermod: plusieurs noms d\'utilisateur spécifiés');
                return null;
            }
            username = arg;
        }
        else {
            errorFn(`usermod: option invalide -- « ${arg} »`);
            return null;
        }

        i++;
    }

    // Vérifier qu'un nom d'utilisateur a été fourni
    if (!username) {
        errorFn('usermod: aucun nom d\'utilisateur spécifié');
        return null;
    }

    // Validation de cohérence des options
    if (options.moveHome && !options.home) {
        errorFn('usermod: l\'option -m requiert l\'option -d');
        return null;
    }

    if (options.append && !options.groups) {
        errorFn('usermod: l\'option -a requiert l\'option -G');
        return null;
    }

    if (options.lock && options.unlock) {
        errorFn('usermod: impossible de verrouiller et déverrouiller le compte en même temps');
        return null;
    }

    return { options, username };
}

/**
 * Vérifie qu'un utilisateur existe
 * @param {string} username - Nom d'utilisateur à vérifier
 * @param {Object} context - Contexte d'exécution
 * @param {Function} errorFn - Fonction d'affichage des erreurs
 * @returns {boolean} - true si l'utilisateur existe
 */
export function validateUserExists(username, context, errorFn) {
    const { fileSystem } = context;
    
    // Lire le fichier /etc/passwd
    if (!fileSystem['/etc/passwd']) {
        errorFn('usermod: /etc/passwd introuvable');
        return false;
    }

    const passwdContent = fileSystem['/etc/passwd'].content;
    const lines = passwdContent.split('\n').filter(line => line.trim());
    
    // Chercher l'utilisateur
    const userExists = lines.some(line => {
        const fields = line.split(':');
        return fields[0] === username;
    });

    if (!userExists) {
        errorFn(`usermod: l'utilisateur « ${username} » n'existe pas`);
        return false;
    }

    return true;
}

/**
 * Valide un nom d'utilisateur selon les règles Unix
 * @param {string} username - Nom d'utilisateur à valider
 * @returns {boolean} - true si valide
 */
function validateUsername(username) {
    // Les règles Unix standard:
    // - Commencer par une lettre ou underscore
    // - Contenir seulement lettres, chiffres, underscore, tiret
    // - Maximum 32 caractères
    const regex = /^[a-zA-Z_][a-zA-Z0-9_-]{0,31}$/;
    return regex.test(username);
}

/**
 * Valide une date d'expiration (format YYYY-MM-DD)
 * @param {string} dateStr - Date à valider
 * @returns {boolean} - true si valide
 */
function validateExpirationDate(dateStr) {
    // Format YYYY-MM-DD
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) {
        return false;
    }

    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date) && 
           date.toISOString().substr(0, 10) === dateStr;
}

/**
 * Parse un identifiant de groupe (nom ou GID)
 * @param {string} groupIdentifier - Nom de groupe ou GID
 * @returns {string|number|null} - GID numérique, nom de groupe ou null si invalide
 */
function parseGroupIdentifier(groupIdentifier) {
    // Si c'est un nombre, c'est un GID
    const gid = parseInt(groupIdentifier);
    if (!isNaN(gid) && gid >= 0) {
        return gid;
    }

    // Sinon, c'est un nom de groupe - validation basique
    if (/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(groupIdentifier)) {
        return groupIdentifier;
    }

    return null;
}