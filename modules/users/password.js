// modules/users/password.js
// Gestion des mots de passe utilisateur

/**
 * Change le mot de passe d'un utilisateur
 * @param {string} username - Nom d'utilisateur
 * @param {string} newPassword - Nouveau mot de passe (hash)
 * @param {Object} fileSystem - Système de fichiers
 * @param {Function} saveFileSystem - Fonction de sauvegarde
 */
export function changePassword(username, newPassword, fileSystem, saveFileSystem) {
    const shadowFile = fileSystem['/etc/shadow'];
    if (!shadowFile || !shadowFile.content) {
        throw new Error('passwd: fichier /etc/shadow non trouvé');
    }

    const lines = shadowFile.content.split('\n');
    let userFound = false;

    // Créer le hash du nouveau mot de passe
    const passwordHash = newPassword ? `$6$rounds=656000$salt$${btoa(newPassword + 'salt')}` : '!';

    const newLines = lines.map(line => {
        if (line.startsWith(username + ':')) {
            userFound = true;
            const parts = line.split(':');
            parts[1] = passwordHash;
            parts[2] = Math.floor(Date.now() / 86400000).toString(); // Dernière modification
            
            // Déverrouiller le compte si le mot de passe était verrouillé
            if (parts[1].startsWith('!') && newPassword) {
                parts[1] = parts[1].substring(1); // Supprimer le ! préfixe
            }
            return parts.join(':');
        }
        return line;
    });

    if (!userFound) {
        throw new Error(`passwd: l'utilisateur '${username}' n'existe pas`);
    }

    fileSystem['/etc/shadow'].content = newLines.join('\n');
    fileSystem['/etc/shadow'].size = fileSystem['/etc/shadow'].content.length;
    fileSystem['/etc/shadow'].modified = new Date();
}
   
/**
 * Verrouille le compte d'un utilisateur en préfixant le hash avec !
 * @param {string} username - Nom d'utilisateur
 * @param {Object} fileSystem - Système de fichiers
 * @param {Function} saveFileSystem - Fonction de sauvegarde
 */
export function lockUserAccount(username, fileSystem, saveFileSystem) {
    const shadowFile = fileSystem['/etc/shadow'];
    if (!shadowFile || !shadowFile.content) {
        throw new Error('passwd: fichier /etc/shadow non trouvé');
    }

    const lines = shadowFile.content.split('\n');
    let userFound = false;

    const newLines = lines.map(line => {
        if (line.startsWith(username + ':')) {
            userFound = true;
            const parts = line.split(':');
            if (!parts[1].startsWith('!')) {
                parts[1] = '!' + parts[1]; // Préfixer avec ! pour verrouiller
            }
            return parts.join(':');
        }
        return line;
    });

    if (!userFound) {
        throw new Error(`passwd: l'utilisateur '${username}' n'existe pas`);
    }

    fileSystem['/etc/shadow'].content = newLines.join('\n');
    fileSystem['/etc/shadow'].size = fileSystem['/etc/shadow'].content.length;
    fileSystem['/etc/shadow'].modified = new Date();
    
    saveFileSystem();
}

/**
 * Déverrouille le compte d'un utilisateur en supprimant le ! préfixe
 * @param {string} username - Nom d'utilisateur
 * @param {Object} fileSystem - Système de fichiers
 * @param {Function} saveFileSystem - Fonction de sauvegarde
 */
export function unlockUserAccount(username, fileSystem, saveFileSystem) {
    const shadowFile = fileSystem['/etc/shadow'];
    if (!shadowFile || !shadowFile.content) {
        throw new Error('passwd: fichier /etc/shadow non trouvé');
    }

    const lines = shadowFile.content.split('\n');
    let userFound = false;

    const newLines = lines.map(line => {
        if (line.startsWith(username + ':')) {
            userFound = true;
            const parts = line.split(':');
            if (parts[1].startsWith('!')) {
                parts[1] = parts[1].substring(1); // Supprimer le ! préfixe
            }
            return parts.join(':');
        }
        return line;
    });

    if (!userFound) {
        throw new Error(`passwd: l'utilisateur '${username}' n'existe pas`);
    }

    fileSystem['/etc/shadow'].content = newLines.join('\n');
    fileSystem['/etc/shadow'].size = fileSystem['/etc/shadow'].content.length;
    fileSystem['/etc/shadow'].modified = new Date();
    
    saveFileSystem();
}

/**
 * Supprime le mot de passe d'un utilisateur (le rend vide)
 * @param {string} username - Nom d'utilisateur
 * @param {Object} fileSystem - Système de fichiers
 * @param {Function} saveFileSystem - Fonction de sauvegarde
 */
export function deleteUserPassword(username, fileSystem, saveFileSystem) {
    const shadowFile = fileSystem['/etc/shadow'];
    if (!shadowFile || !shadowFile.content) {
        throw new Error('passwd: fichier /etc/shadow non trouvé');
    }

    const lines = shadowFile.content.split('\n');
    let userFound = false;

    const newLines = lines.map(line => {
        if (line.startsWith(username + ':')) {
            userFound = true;
            const parts = line.split(':');
            parts[1] = ''; // Mot de passe vide
            parts[2] = Math.floor(Date.now() / 86400000).toString(); // Dernière modification
            return parts.join(':');
        }
        return line;
    });

    if (!userFound) {
        throw new Error(`passwd: l'utilisateur '${username}' n'existe pas`);
    }

    fileSystem['/etc/shadow'].content = newLines.join('\n');
    fileSystem['/etc/shadow'].size = fileSystem['/etc/shadow'].content.length;
    fileSystem['/etc/shadow'].modified = new Date();
    
    saveFileSystem();
}