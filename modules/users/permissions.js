// modules/users/permissions.js
// Gestion des permissions et sudo

import { getCurrentUser, isRoot } from './current-user.js';

/**
 * Vérifie si l'utilisateur courant peut utiliser sudo
 * @param {Object} fileSystem - Système de fichiers
 * @returns {boolean} - true si peut utiliser sudo
 */
export function canUseSudo(fileSystem) {
    if (isRoot()) return true;

    const sudoersFile = fileSystem['/etc/sudoers'];
    if (!sudoersFile || !sudoersFile.content) return false;

    // Vérification basique - dans un vrai système ce serait plus complexe
    const content = sudoersFile.content;
    const currentUser = getCurrentUser();
    
    // Vérifier si l'utilisateur est explicitement dans sudoers
    if (content.includes(`${currentUser.username}\t`)) return true;
    
    // Vérifier si l'utilisateur fait partie d'un groupe autorisé
    return currentUser.groups.some(group => 
        content.includes(`%${group}`) && 
        (content.includes(`%${group}\tALL=`) || content.includes(`%${group} ALL=`))
    );
}