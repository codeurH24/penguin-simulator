// modules/users/user-stack.js

let userStack = [];

/**
 * Empile l'utilisateur courant (avant un su)
 * @param {Object} user - Utilisateur à empiler
 */
export function pushUser(user) {
    userStack.push({
        username: user.username,
        uid: user.uid,
        gid: user.gid,
        home: user.home,
        shell: user.shell,
        groups: user.groups,
        currentPath: user.currentPath || null // Optionnel: sauver le répertoire courant
    });
}

/**
 * Dépile le dernier utilisateur (pour exit)
 * @returns {Object|null} - Utilisateur précédent ou null si pile vide
 */
export function popUser() {
    return userStack.pop() || null;
}

/**
 * Vérifie si la pile d'utilisateurs est vide
 * @returns {boolean}
 */
export function isUserStackEmpty() {
    return userStack.length === 0;
}

/**
 * Obtient la taille de la pile
 * @returns {number}
 */
export function getUserStackSize() {
    return userStack.length;
}

/**
 * Vide complètement la pile (pour reset)
 */
export function clearUserStack() {
    userStack = [];
}