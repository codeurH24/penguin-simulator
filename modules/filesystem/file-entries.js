/**
 * Crée une entrée de fichier avec métadonnées
 * @param {string} content - Contenu du fichier
 * @returns {Object} - Objet fichier avec métadonnées
 */
export function createFileEntry(content = '') {
    const now = new Date();
    return {
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

/**
 * Crée une entrée de répertoire avec métadonnées
 * @param {string} owner - Propriétaire
 * @param {string} group - Groupe  
 * @param {string} permissions - Permissions
 * @returns {Object} - Objet répertoire avec métadonnées
 */
export function createDirEntry(owner = 'root', group = 'root', permissions = 'drwxr-xr-x') {
    const now = new Date();
    return {
        type: 'dir',
        size: 4096,
        created: now,
        modified: now,
        accessed: now,
        permissions: permissions,
        owner: owner,
        group: group,
        links: 2
    };
}