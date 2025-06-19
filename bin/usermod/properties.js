// bin/usermod/properties.js - Gestion des propriétés utilisateur pour usermod

/**
 * Modifie les propriétés d'un utilisateur
 * @param {string} username - Nom d'utilisateur
 * @param {Object} options - Options de usermod
 * @param {Object} context - Contexte d'exécution
 * @param {Function} errorFn - Fonction d'affichage des erreurs
 * @returns {Object|null} - Objet de modifications des propriétés ou null en cas d'erreur
 */
export function modifyUserProperties(username, options, context, errorFn) {
    const modifications = {};

    // Nouveau nom d'utilisateur (-l)
    if (options.login !== undefined) {
        if (!validateNewUsername(options.login, username, context, errorFn)) {
            return null;
        }
        modifications.newUsername = options.login;
    }

    // Nouveau répertoire home (-d)
    if (options.home !== undefined) {
        if (!validateHomeDirectory(options.home, errorFn)) {
            return null;
        }
        modifications.homeDirectory = options.home;
    }

    // Nouveau shell (-s)
    if (options.shell !== undefined) {
        if (!validateShell(options.shell, context, errorFn)) {
            return null;
        }
        modifications.shell = options.shell;
    }

    // Nouveau commentaire/GECOS (-c)
    if (options.comment !== undefined) {
        modifications.comment = options.comment;
    }

    // Nouveau UID (-u)
    if (options.uid !== undefined) {
        if (!validateNewUid(options.uid, username, context, errorFn)) {
            return null;
        }
        modifications.uid = options.uid;
    }

    // Date d'expiration (-e)
    if (options.expiredate !== undefined) {
        modifications.expireDate = options.expiredate;
    }

    // Verrouillage/déverrouillage du compte (-L/-U)
    if (options.lock) {
        modifications.lockAccount = true;
    }
    if (options.unlock) {
        modifications.unlockAccount = true;
    }

    return modifications;
}

/**
 * Valide un nouveau nom d'utilisateur
 * @param {string} newUsername - Nouveau nom d'utilisateur
 * @param {string} currentUsername - Nom d'utilisateur actuel
 * @param {Object} context - Contexte d'exécution
 * @param {Function} errorFn - Fonction d'affichage des erreurs
 * @returns {boolean} - true si valide
 */
function validateNewUsername(newUsername, currentUsername, context, errorFn) {
    const { fileSystem } = context;
    
    // Vérifier que le nouveau nom n'existe pas déjà
    if (!fileSystem['/etc/passwd']) {
        errorFn('usermod: /etc/passwd introuvable');
        return false;
    }

    const passwdContent = fileSystem['/etc/passwd'].content;
    const lines = passwdContent.split('\n').filter(line => line.trim());
    
    const existingUser = lines.find(line => {
        const fields = line.split(':');
        return fields[0] === newUsername && fields[0] !== currentUsername;
    });

    if (existingUser) {
        errorFn(`usermod: l'utilisateur « ${newUsername} » existe déjà`);
        return false;
    }

    return true;
}

/**
 * Valide un répertoire home
 * @param {string} homeDir - Répertoire home
 * @param {Function} errorFn - Fonction d'affichage des erreurs
 * @returns {boolean} - true si valide
 */
function validateHomeDirectory(homeDir, errorFn) {
    // Vérifier que c'est un chemin absolu
    if (!homeDir.startsWith('/')) {
        errorFn(`usermod: répertoire personnel invalide « ${homeDir} » (doit être un chemin absolu)`);
        return false;
    }

    // Vérifications basiques du chemin
    if (homeDir.includes('..') || homeDir.includes('//')) {
        errorFn(`usermod: répertoire personnel invalide « ${homeDir} »`);
        return false;
    }

    return true;
}

/**
 * Valide un shell
 * @param {string} shell - Shell à valider
 * @param {Object} context - Contexte d'exécution
 * @param {Function} errorFn - Fonction d'affichage des erreurs
 * @returns {boolean} - true si valide
 */
function validateShell(shell, context, errorFn) {
    const { fileSystem } = context;
    
    // Vérifier que c'est un chemin absolu
    if (!shell.startsWith('/')) {
        errorFn(`usermod: shell invalide « ${shell} » (doit être un chemin absolu)`);
        return false;
    }

    // Vérifier que le shell existe dans /etc/shells s'il existe
    if (fileSystem['/etc/shells']) {
        const shellsContent = fileSystem['/etc/shells'].content;
        const validShells = shellsContent.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));
        
        if (!validShells.includes(shell)) {
            errorFn(`usermod: Avertissement: « ${shell} » n'est pas listé dans /etc/shells`);
            // Ce n'est qu'un avertissement, pas une erreur bloquante
        }
    }

    return true;
}

/**
 * Valide un nouvel UID
 * @param {number} newUid - Nouvel UID
 * @param {string} currentUsername - Nom d'utilisateur actuel
 * @param {Object} context - Contexte d'exécution
 * @param {Function} errorFn - Fonction d'affichage des erreurs
 * @returns {boolean} - true si valide
 */
function validateNewUid(newUid, currentUsername, context, errorFn) {
    const { fileSystem } = context;
    
    if (!fileSystem['/etc/passwd']) {
        errorFn('usermod: /etc/passwd introuvable');
        return false;
    }

    const passwdContent = fileSystem['/etc/passwd'].content;
    const lines = passwdContent.split('\n').filter(line => line.trim());
    
    // Vérifier que l'UID n'est pas déjà utilisé par un autre utilisateur
    const existingUser = lines.find(line => {
        const fields = line.split(':');
        return parseInt(fields[2]) === newUid && fields[0] !== currentUsername;
    });

    if (existingUser) {
        errorFn(`usermod: l'UID « ${newUid} » existe déjà`);
        return false;
    }

    return true;
}

/**
 * Applique les modifications de propriétés dans /etc/passwd et /etc/shadow
 * @param {string} username - Nom d'utilisateur
 * @param {Object} propertyModifications - Modifications des propriétés
 * @param {Object} context - Contexte d'exécution
 * @param {Function} errorFn - Fonction d'affichage des erreurs
 * @returns {boolean} - true si succès
 */
export function applyPropertyModifications(username, propertyModifications, context, errorFn) {
    const { fileSystem } = context;
    
    try {
        // Appliquer les modifications dans /etc/passwd
        if (!updatePasswdEntry(username, propertyModifications, context)) {
            errorFn('usermod: échec de mise à jour de /etc/passwd');
            return false;
        }

        // Appliquer les modifications de mot de passe dans /etc/shadow si nécessaire
        if (propertyModifications.lockAccount || propertyModifications.unlockAccount) {
            if (!updateShadowEntry(username, propertyModifications, context)) {
                errorFn('usermod: échec de mise à jour de /etc/shadow');
                return false;
            }
        }

        // Gérer le changement de nom d'utilisateur dans tous les fichiers
        if (propertyModifications.newUsername) {
            if (!updateUsernameInAllFiles(username, propertyModifications.newUsername, context)) {
                errorFn('usermod: échec de mise à jour du nom d\'utilisateur dans les fichiers système');
                return false;
            }
        }

        return true;
    } catch (error) {
        errorFn(`usermod: erreur lors de la mise à jour des propriétés: ${error.message}`);
        return false;
    }
}

/**
 * Met à jour l'entrée dans /etc/passwd
 * @param {string} username - Nom d'utilisateur
 * @param {Object} modifications - Modifications à appliquer
 * @param {Object} context - Contexte d'exécution
 * @returns {boolean} - true si succès
 */
function updatePasswdEntry(username, modifications, context) {
    const { fileSystem } = context;
    
    const passwdContent = fileSystem['/etc/passwd'].content;
    const lines = passwdContent.split('\n');
    let updated = false;

    for (let i = 0; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const fields = lines[i].split(':');
        if (fields[0] === username) {
            // Modifier les champs appropriés
            if (modifications.newUsername) {
                fields[0] = modifications.newUsername;
            }
            if (modifications.uid !== undefined) {
                fields[2] = modifications.uid.toString();
            }
            if (modifications.comment !== undefined) {
                fields[4] = modifications.comment;
            }
            if (modifications.homeDirectory) {
                fields[5] = modifications.homeDirectory;
            }
            if (modifications.shell) {
                fields[6] = modifications.shell;
            }
            
            lines[i] = fields.join(':');
            updated = true;
            break;
        }
    }

    if (updated) {
        fileSystem['/etc/passwd'].content = lines.join('\n');
    }

    return updated;
}

/**
 * Met à jour l'entrée dans /etc/shadow pour le verrouillage/déverrouillage
 * @param {string} username - Nom d'utilisateur
 * @param {Object} modifications - Modifications à appliquer
 * @param {Object} context - Contexte d'exécution
 * @returns {boolean} - true si succès
 */
function updateShadowEntry(username, modifications, context) {
    const { fileSystem } = context;
    
    // Créer /etc/shadow s'il n'existe pas
    if (!fileSystem['/etc/shadow']) {
        fileSystem['/etc/shadow'] = {
            type: 'file',
            content: '',
            permissions: '640',
            owner: 'root',
            group: 'shadow'
        };
    }

    const shadowContent = fileSystem['/etc/shadow'].content;
    const lines = shadowContent.split('\n').filter(line => line.trim());
    let updated = false;
    let userLineIndex = -1;

    // Chercher l'entrée de l'utilisateur
    for (let i = 0; i < lines.length; i++) {
        const fields = lines[i].split(':');
        if (fields[0] === username) {
            userLineIndex = i;
            break;
        }
    }

    // Si l'utilisateur n'a pas d'entrée shadow, créer une entrée basique
    if (userLineIndex === -1) {
        lines.push(`${username}:*:${Math.floor(Date.now() / 86400000)}:0:99999:7:::`);
        userLineIndex = lines.length - 1;
    }

    const fields = lines[userLineIndex].split(':');
    
    // Appliquer les modifications
    if (modifications.lockAccount) {
        // Préfixer le hash du mot de passe avec ! pour le verrouiller
        if (fields[1] && !fields[1].startsWith('!')) {
            fields[1] = '!' + fields[1];
            updated = true;
        }
    }
    
    if (modifications.unlockAccount) {
        // Retirer le ! du début du hash pour déverrouiller
        if (fields[1] && fields[1].startsWith('!')) {
            fields[1] = fields[1].substring(1);
            updated = true;
        }
    }

    if (modifications.expireDate) {
        // Convertir la date en jours depuis epoch
        const expireDate = new Date(modifications.expireDate);
        const daysSinceEpoch = Math.floor(expireDate.getTime() / 86400000);
        fields[7] = daysSinceEpoch.toString();
        updated = true;
    }

    if (updated || userLineIndex === lines.length - 1) {
        lines[userLineIndex] = fields.join(':');
        fileSystem['/etc/shadow'].content = lines.join('\n');
    }

    return true;
}

/**
 * Met à jour le nom d'utilisateur dans tous les fichiers système
 * @param {string} oldUsername - Ancien nom d'utilisateur
 * @param {string} newUsername - Nouveau nom d'utilisateur
 * @param {Object} context - Contexte d'exécution
 * @returns {boolean} - true si succès
 */
function updateUsernameInAllFiles(oldUsername, newUsername, context) {
    const { fileSystem } = context;
    
    // Mettre à jour /etc/group
    if (fileSystem['/etc/group']) {
        const groupContent = fileSystem['/etc/group'].content;
        const groupLines = groupContent.split('\n');
        
        for (let i = 0; i < groupLines.length; i++) {
            if (!groupLines[i].trim()) continue;
            
            const [groupName, password, gid, members] = groupLines[i].split(':');
            if (members) {
                const membersList = members.split(',');
                const updatedMembers = membersList.map(member => 
                    member === oldUsername ? newUsername : member
                );
                if (membersList.join(',') !== updatedMembers.join(',')) {
                    groupLines[i] = `${groupName}:${password}:${gid}:${updatedMembers.join(',')}`;
                }
            }
        }
        
        fileSystem['/etc/group'].content = groupLines.join('\n');
    }

    // Mettre à jour /etc/shadow
    if (fileSystem['/etc/shadow']) {
        const shadowContent = fileSystem['/etc/shadow'].content;
        const shadowLines = shadowContent.split('\n');
        
        for (let i = 0; i < shadowLines.length; i++) {
            if (!shadowLines[i].trim()) continue;
            
            const fields = shadowLines[i].split(':');
            if (fields[0] === oldUsername) {
                fields[0] = newUsername;
                shadowLines[i] = fields.join(':');
                break;
            }
        }
        
        fileSystem['/etc/shadow'].content = shadowLines.join('\n');
    }

    return true;
}