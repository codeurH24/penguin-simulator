// bin/sudo/auth.js - Gestion de l'authentification pour sudo

/**
 * Authentifie un utilisateur pour sudo
 * @param {Object} context - Contexte complet
 * @param {Function} callback - Fonction appelée avec le résultat (true/false)
 * @param {Function} cancelCallback - Fonction appelée en cas d'annulation
 */
export function authenticate(context, callback, cancelCallback) {
    const { terminal, currentUser } = context;
    
    if (!currentUser) {
        callback(false);
        return;
    }
    
    // Vérifier si l'utilisateur a un mot de passe vide
    if (hasEmptyPassword(currentUser.username, context)) {
        // Authentification réussie sans demander de mot de passe
        callback(true);
        return;
    }
    
    // Demander le mot de passe
    const prompt = terminal.terminalService.prompt;
    prompt.askPassword(`[sudo] password for ${currentUser.username}: `, (password) => {
        // Vérifier le mot de passe
        const isValid = verifyPasswordWithContext(currentUser.username, password, context);
        callback(isValid);
    }, cancelCallback);
}

/**
 * Vérifie si un utilisateur a un mot de passe vide
 * @param {string} username - Nom d'utilisateur
 * @param {Object} context - Contexte complet
 * @returns {boolean} - true si l'utilisateur a un mot de passe vide
 */
export function hasEmptyPassword(username, context) {
    const { fileSystem } = context;
    
    const shadowFile = fileSystem['/etc/shadow'];
    if (!shadowFile || shadowFile.type !== 'file') {
        return false;
    }

    const lines = shadowFile.content.split('\n');
    const userLine = lines.find(line => line.startsWith(username + ':'));
    if (!userLine) {
        return false;
    }

    const [, storedHash] = userLine.split(':');
    
    // '' indique un mot de passe vide (passwd -d)
    return storedHash === '';
}
export function verifyPasswordWithContext(username, password, context) {
    const { fileSystem } = context;
    
    const shadowFile = fileSystem['/etc/shadow'];
    if (!shadowFile || shadowFile.type !== 'file') {
        return false;
    }

    const lines = shadowFile.content.split('\n');
    const userLine = lines.find(line => line.startsWith(username + ':'));
    if (!userLine) {
        return false;
    }

    const [, storedHash] = userLine.split(':');
    
    // Comptes verrouillés avec ! ou *
    if (storedHash === '!' || storedHash === '*' || storedHash === '') {
        return false;
    }
    
    // En mode test, accepter n'importe quel mot de passe
    if (context.test) {
        return true;
    }
    
    // Utiliser le même système de hash que passwd
    const calculatedHash = calculatePasswordHash(password);
    return storedHash === calculatedHash;
}

/**
 * Calcule le hash d'un mot de passe (même logique que passwd)
 * @param {string} password - Mot de passe à hasher
 * @returns {string} - Hash du mot de passe
 */
export function calculatePasswordHash(password) {
    // Utiliser la même logique que dans modules/users/password.js
    return '$6$rounds=656000$salt$' + btoa(password + 'salt');
}