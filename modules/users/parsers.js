// modules/users/parsers.js
// Parsing des fichiers système /etc/passwd et /etc/group

/**
 * Parse le fichier /etc/passwd
 * @param {Object} fileSystem - Système de fichiers
 * @returns {Array} - Liste des utilisateurs
 */
export function parsePasswdFile(fileSystem) {
    const passwdFile = fileSystem['/etc/passwd'];
    if (!passwdFile || !passwdFile.content) return [];
    
    return passwdFile.content.split('\n')
        .filter(line => line.trim())
        .map(line => {
            const [username, password, uid, gid, gecos, home, shell] = line.split(':');
            return {
                username,
                password,
                uid: parseInt(uid),
                gid: parseInt(gid),
                gecos: gecos || '',
                home,
                shell
            };
        });
}

/**
 * Parse le fichier /etc/group
 * @param {Object} fileSystem - Système de fichiers
 * @returns {Array} - Liste des groupes
 */
export function parseGroupFile(fileSystem) {
    const groupFile = fileSystem['/etc/group'];
    if (!groupFile || !groupFile.content) return [];
    
    return groupFile.content.split('\n')
        .filter(line => line.trim())
        .map(line => {
            const [name, password, gid, members] = line.split(':');
            return {
                name,
                password,
                gid: parseInt(gid),
                members: members ? members.split(',').filter(m => m) : []
            };
        });
}