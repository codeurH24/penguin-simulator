// bin/usermod/groups.js - Gestion des groupes pour usermod

/**
 * Modifie les groupes d'un utilisateur
 * @param {string} username - Nom d'utilisateur
 * @param {Object} options - Options de usermod
 * @param {Object} context - Contexte d'exécution
 * @param {Function} errorFn - Fonction d'affichage des erreurs
 * @returns {Object|null} - Objet de modifications des groupes ou null en cas d'erreur
 */
export function modifyUserGroups(username, options, context, errorFn) {
    const { fileSystem } = context;
    const modifications = {
        primaryGroup: null,
        supplementaryGroups: null,
        appendMode: options.append || false
    };

    // Modification du groupe principal (-g)
    if (options.gid !== undefined) {
        const primaryGroupResult = validateAndGetPrimaryGroup(options.gid, context, errorFn);
        if (primaryGroupResult === null) {
            return null;
        }
        modifications.primaryGroup = primaryGroupResult;
    }

    // Modification des groupes supplémentaires (-G)
    if (options.groups !== undefined) {
        const supplementaryGroupsResult = validateAndGetSupplementaryGroups(
            options.groups, username, context, errorFn
        );
        if (supplementaryGroupsResult === null) {
            return null;
        }
        modifications.supplementaryGroups = supplementaryGroupsResult;
    }

    return modifications;
}

/**
 * Valide et récupère les informations du groupe principal
 * @param {string|number} gidOrName - GID numérique ou nom de groupe
 * @param {Object} context - Contexte d'exécution
 * @param {Function} errorFn - Fonction d'affichage des erreurs
 * @returns {Object|null} - Informations du groupe ou null en cas d'erreur
 */
function validateAndGetPrimaryGroup(gidOrName, context, errorFn) {
    const { fileSystem } = context;
    
    if (!fileSystem['/etc/group']) {
        errorFn('usermod: /etc/group introuvable');
        return null;
    }

    const groupContent = fileSystem['/etc/group'].content;
    const lines = groupContent.split('\n').filter(line => line.trim());
    
    // Chercher le groupe par GID ou nom
    for (const line of lines) {
        const [groupName, , gid, ] = line.split(':');
        const groupGid = parseInt(gid);
        
        if ((typeof gidOrName === 'number' && groupGid === gidOrName) ||
            (typeof gidOrName === 'string' && groupName === gidOrName)) {
            return {
                name: groupName,
                gid: groupGid
            };
        }
    }

    errorFn(`usermod: le groupe « ${gidOrName} » n'existe pas`);
    return null;
}

/**
 * Valide et récupère les informations des groupes supplémentaires
 * @param {string} groupsString - Liste des groupes séparés par des virgules
 * @param {string} username - Nom d'utilisateur
 * @param {Object} context - Contexte d'exécution
 * @param {Function} errorFn - Fonction d'affichage des erreurs
 * @returns {Array|null} - Tableau des groupes ou null en cas d'erreur
 */
function validateAndGetSupplementaryGroups(groupsString, username, context, errorFn) {
    const { fileSystem } = context;
    
    if (!fileSystem['/etc/group']) {
        errorFn('usermod: /etc/group introuvable');
        return null;
    }

    // Analyser la liste des groupes
    const requestedGroups = groupsString.split(',').map(g => g.trim()).filter(g => g);
    if (requestedGroups.length === 0) {
        return []; // Liste vide = supprimer de tous les groupes supplémentaires
    }

    const groupContent = fileSystem['/etc/group'].content;
    const lines = groupContent.split('\n').filter(line => line.trim());
    const availableGroups = new Map();
    
    // Construire la map des groupes disponibles
    for (const line of lines) {
        const [groupName, , gid, members] = line.split(':');
        availableGroups.set(groupName, {
            name: groupName,
            gid: parseInt(gid),
            members: members ? members.split(',').filter(m => m.trim()) : []
        });
        availableGroups.set(parseInt(gid), {
            name: groupName,
            gid: parseInt(gid),
            members: members ? members.split(',').filter(m => m.trim()) : []
        });
    }

    // Valider chaque groupe demandé
    const validatedGroups = [];
    for (const groupIdentifier of requestedGroups) {
        const gid = parseInt(groupIdentifier);
        const key = isNaN(gid) ? groupIdentifier : gid;
        
        if (!availableGroups.has(key)) {
            errorFn(`usermod: le groupe « ${groupIdentifier} » n'existe pas`);
            return null;
        }
        
        const groupInfo = availableGroups.get(key);
        validatedGroups.push(groupInfo);
    }

    return validatedGroups;
}

/**
 * Applique les modifications de groupes dans /etc/passwd et /etc/group
 * @param {string} username - Nom d'utilisateur
 * @param {Object} groupModifications - Modifications des groupes
 * @param {Object} context - Contexte d'exécution
 * @param {Function} errorFn - Fonction d'affichage des erreurs
 * @returns {boolean} - true si succès
 */
export function applyGroupModifications(username, groupModifications, context, errorFn) {
    const { fileSystem } = context;
    
    try {
        // Modifier le groupe principal dans /etc/passwd si nécessaire
        if (groupModifications.primaryGroup) {
            if (!updatePrimaryGroupInPasswd(username, groupModifications.primaryGroup.gid, context)) {
                errorFn('usermod: échec de mise à jour du groupe principal dans /etc/passwd');
                return false;
            }
        }

        // Modifier les groupes supplémentaires dans /etc/group si nécessaire
        if (groupModifications.supplementaryGroups !== null) {
            if (!updateSupplementaryGroupsInGroup(
                username, 
                groupModifications.supplementaryGroups, 
                groupModifications.appendMode,
                context
            )) {
                errorFn('usermod: échec de mise à jour des groupes supplémentaires dans /etc/group');
                return false;
            }
        }

        return true;
    } catch (error) {
        errorFn(`usermod: erreur lors de la mise à jour des groupes: ${error.message}`);
        return false;
    }
}

/**
 * Met à jour le groupe principal dans /etc/passwd
 * @param {string} username - Nom d'utilisateur
 * @param {number} newGid - Nouveau GID principal
 * @param {Object} context - Contexte d'exécution
 * @returns {boolean} - true si succès
 */
function updatePrimaryGroupInPasswd(username, newGid, context) {
    const { fileSystem } = context;
    
    const passwdContent = fileSystem['/etc/passwd'].content;
    const lines = passwdContent.split('\n');
    let updated = false;

    for (let i = 0; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const fields = lines[i].split(':');
        if (fields[0] === username) {
            fields[3] = newGid.toString(); // Champ GID
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
 * Met à jour les groupes supplémentaires dans /etc/group
 * @param {string} username - Nom d'utilisateur
 * @param {Array} supplementaryGroups - Nouveaux groupes supplémentaires
 * @param {boolean} appendMode - Mode ajout (true) ou remplacement (false)
 * @param {Object} context - Contexte d'exécution
 * @returns {boolean} - true si succès
 */
function updateSupplementaryGroupsInGroup(username, supplementaryGroups, appendMode, context) {
    const { fileSystem } = context;
    
    const groupContent = fileSystem['/etc/group'].content;
    const lines = groupContent.split('\n');
    
    // Si ce n'est pas en mode append, retirer l'utilisateur de tous les groupes d'abord
    if (!appendMode) {
        for (let i = 0; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const [groupName, password, gid, members] = lines[i].split(':');
            const membersList = members ? members.split(',').filter(m => m.trim()) : [];
            
            // Retirer l'utilisateur s'il est présent
            const filteredMembers = membersList.filter(member => member !== username);
            
            if (filteredMembers.length !== membersList.length) {
                lines[i] = `${groupName}:${password}:${gid}:${filteredMembers.join(',')}`;
            }
        }
    }

    // Ajouter l'utilisateur aux nouveaux groupes
    for (const group of supplementaryGroups) {
        for (let i = 0; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const [groupName, password, gid, members] = lines[i].split(':');
            
            if (groupName === group.name) {
                const membersList = members ? members.split(',').filter(m => m.trim()) : [];
                
                // Ajouter l'utilisateur s'il n'y est pas déjà
                if (!membersList.includes(username)) {
                    membersList.push(username);
                    lines[i] = `${groupName}:${password}:${gid}:${membersList.join(',')}`;
                }
                break;
            }
        }
    }

    fileSystem['/etc/group'].content = lines.join('\n');
    return true;
}