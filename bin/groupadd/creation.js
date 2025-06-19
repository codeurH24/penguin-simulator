// bin/groupadd/creation.js - Logique de création de groupes
import { parseGroupFile } from '../../modules/users/user.service.js';

/**
 * Ajoute une ligne à un fichier système en gérant correctement les retours à la ligne
 * @param {Object} file - Objet fichier du système de fichiers
 * @param {string} newLine - Nouvelle ligne à ajouter
 */
function appendLineToSystemFile(file, newLine) {
    let content = file.content || '';
    
    // Si le contenu existe et ne finit pas par \n, ajouter \n
    if (content && !content.endsWith('\n')) {
        content += '\n';
    }
    
    // Ajouter la nouvelle ligne
    content += newLine;
    
    // S'assurer que le fichier finit par \n (standard Debian)
    if (!content.endsWith('\n')) {
        content += '\n';
    }
    
    file.content = content;
    file.size = content.length;
    file.modified = new Date();
}

/**
 * Crée un nouveau groupe dans le système
 * @param {string} groupName - Nom du groupe à créer
 * @param {Object} options - Options de création
 * @param {Object} context - Contexte complet (fileSystem, saveFileSystem)
 */
export function createGroup(groupName, options = {}, context) {
    const { fileSystem, saveFileSystem } = context;
    
    // Si le groupe existe déjà et que --force est utilisé, ne rien faire
    if (options.force && groupExists(groupName, fileSystem)) {
        return; // Succès silencieux
    }

    // Déterminer le GID
    let gid = options.gid;
    if (gid === undefined) {
        gid = findNextAvailableGid(fileSystem, options.system);
    }

    // Créer l'entrée du groupe
    const groupEntry = {
        name: groupName,
        password: 'x',
        gid: gid,
        members: []
    };

    // Ajouter au fichier /etc/group
    addGroupToFile(groupEntry, fileSystem);
    
    // Sauvegarder le système de fichiers
    saveFileSystem();
}

/**
 * Trouve le prochain GID disponible
 * @param {Object} fileSystem - Système de fichiers
 * @param {boolean} isSystem - true pour un groupe système
 * @returns {number} - GID disponible
 */
function findNextAvailableGid(fileSystem, isSystem = false) {
    const groups = parseGroupFile(fileSystem);
    const existingGids = groups.map(g => g.gid).sort((a, b) => a - b);
    
    let startGid, endGid;
    
    if (isSystem) {
        // Groupes système : 100-999 (selon les standards Debian)
        startGid = 100;
        endGid = 999;
    } else {
        // Groupes utilisateur : à partir de 1000
        startGid = 1000;
        endGid = 65534; // Maximum pour éviter les conflits avec nobody
    }
    
    // Trouver le premier GID disponible dans la plage
    for (let gid = startGid; gid <= endGid; gid++) {
        if (!existingGids.includes(gid)) {
            return gid;
        }
    }
    
    throw new Error(`aucun GID disponible dans la plage ${startGid}-${endGid}`);
}

/**
 * Ajoute un groupe au fichier /etc/group
 * @param {Object} groupEntry - Entrée du groupe
 * @param {Object} fileSystem - Système de fichiers
 */
function addGroupToFile(groupEntry, fileSystem) {
    // Vérifier que le fichier /etc/group existe
    if (!fileSystem['/etc/group']) {
        // Créer le fichier s'il n'existe pas
        fileSystem['/etc/group'] = {
            type: 'file',
            content: '',
            permissions: '-rw-r--r--',
            owner: 'root',
            group: 'root',
            size: 0,
            modified: new Date(),
            created: new Date()
        };
    }

    // Format de ligne pour /etc/group : groupname:password:GID:user_list
    const groupLine = `${groupEntry.name}:x:${groupEntry.gid}:${groupEntry.members.join(',')}`;
    
    // Ajouter la ligne au fichier
    appendLineToSystemFile(fileSystem['/etc/group'], groupLine);
}

/**
 * Vérifie si un groupe existe
 * @param {string} groupName - Nom du groupe
 * @param {Object} fileSystem - Système de fichiers
 * @returns {boolean} - true si le groupe existe
 */
function groupExists(groupName, fileSystem) {
    try {
        const groups = parseGroupFile(fileSystem);
        return groups.some(g => g.name === groupName);
    } catch (error) {
        return false;
    }
}

/**
 * Obtient les informations d'un groupe
 * @param {string} groupName - Nom du groupe
 * @param {Object} fileSystem - Système de fichiers
 * @returns {Object|null} - Informations du groupe ou null si non trouvé
 */
export function getGroupInfo(groupName, fileSystem) {
    try {
        const groups = parseGroupFile(fileSystem);
        return groups.find(g => g.name === groupName) || null;
    } catch (error) {
        return null;
    }
}

/**
 * Liste tous les groupes du système
 * @param {Object} fileSystem - Système de fichiers
 * @returns {Array} - Liste des groupes
 */
export function listAllGroups(fileSystem) {
    try {
        return parseGroupFile(fileSystem);
    } catch (error) {
        return [];
    }
}