// bin/sudo.js - Commande sudo pour exécuter des commandes avec privilèges élevés
// Équivalent de /usr/bin/sudo sous Debian

/**
 * Commande sudo - Exécute une commande avec privilèges élevés
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, saveFileSystem, terminal, currentUser)
 */
export function cmdSudo(args, context) {
    const { fileSystem, saveFileSystem, terminal } = context;
    
    const term = terminal;
    const errorFn = context?.showError || ((str) => { term.write(`${str}\r\n`) });
    const outputFn = context?.addLine || ((str) => { term.write(`${str}\r\n`) });

    // Utiliser context.currentUser comme source de vérité
    const currentUser = context.currentUser;

    if (!currentUser) {
        errorFn('sudo: aucun utilisateur connecté');
        return;
    }

    // Si c'est déjà root, pas besoin de sudo
    if (currentUser.uid === 0) {
        if (args.length === 0) {
            outputFn('root@bash:' + context.getCurrentPath() + '# ');
            return;
        }
        // Exécuter directement la commande en tant que root
        executeSudoCommand(args, context);
        return;
    }

    // Vérifier sudo avec context
    if (!canUseSudoWithContext(context)) {
        errorFn(`${currentUser.username} is not in the sudoers file. This incident will be reported.`);
        return;
    }

    // Vérifier les arguments
    if (args.length === 0) {
        errorFn('usage: sudo [-u user] [-l] [-k] [-v] command');
        errorFn('       sudo -l                 # lister les privilèges');
        errorFn('       sudo -k                 # effacer le timestamp');
        errorFn('       sudo -v                 # valider le timestamp');
        return;
    }

    // Parser les options
    let targetUser = 'root';
    let commandArgs = [];
    let listPrivileges = false;
    let killTimestamp = false;       // ✅ NOUVEAU : sudo -k
    let validateTimestamp = false;   // ✅ NOUVEAU : sudo -v

    let i = 0;
    while (i < args.length) {
        const arg = args[i];

        if (arg === '-u' && i + 1 < args.length) {
            targetUser = args[++i];
        } else if (arg === '-l' || arg === '--list') {
            listPrivileges = true;
        } else if (arg === '-k' || arg === '--kill') {
            killTimestamp = true;
        } else if (arg === '-v' || arg === '--validate') {
            validateTimestamp = true;
        } else if (arg.startsWith('-')) {
            errorFn(`sudo: option inconnue '${arg}'`);
            errorFn('usage: sudo [-u user] [-l] [-k] [-v] command');
            return;
        } else {
            // Le reste sont les arguments de la commande
            commandArgs = args.slice(i);
            break;
        }
        i++;
    }

    // ✅ NOUVEAU : Gérer sudo -k (effacer timestamp)
    if (killTimestamp) {
        clearSudoTimestamp(context);
        outputFn('Timestamp sudo effacé.');
        return;
    }

    // ✅ NOUVEAU : Gérer sudo -v (valider/renouveler timestamp)
    if (validateTimestamp) {
        if (checkSudoTimestamp(context)) {
            // Timestamp valide : le renouveler
            updateSudoTimestamp(context);
            // Pas de message de sortie (comportement standard)
        } else {
            // Timestamp expiré : demander le mot de passe pour le renouveler
            const prompt = terminal.terminalService.prompt;
            prompt.askPassword(`[sudo] password for ${currentUser.username}: `, (password) => {
                if (!verifyPasswordWithContext(currentUser.username, password, context)) {
                    errorFn('Sorry, try again.');
                    return;
                }
                updateSudoTimestamp(context);
                // Pas de message de sortie si succès
            }, () => {
                outputFn('');
            });
        }
        return;
    }

    // Afficher les privilèges si demandé
    if (listPrivileges) {
        showSudoPrivileges(context, outputFn);
        return;
    }

    // Vérifier qu'une commande a été spécifiée
    if (commandArgs.length === 0) {
        errorFn('sudo: une commande est requise');
        return;
    }

    // Mode test : pas de demande de mot de passe
    if (context.test) {
        executeSudoCommand(commandArgs, context, targetUser);
        return;
    }

    // ✅ NOUVEAU : Vérifier le timestamp sudo avant de demander le mot de passe
    if (checkSudoTimestamp(context)) {
        // Timestamp valide : mettre à jour et exécuter sans demander le mot de passe
        updateSudoTimestamp(context);
        executeSudoCommand(commandArgs, context, targetUser);
        return;
    }

    // Demander le mot de passe de l'utilisateur courant
    const prompt = terminal.terminalService.prompt;
    prompt.askPassword(`[sudo] password for ${currentUser.username}: `, (password) => {
        // Vérifier le mot de passe avec context
        if (!verifyPasswordWithContext(currentUser.username, password, context)) {
            errorFn('Sorry, try again.');
            return;
        }

        // ✅ NOUVEAU : Créer/mettre à jour le timestamp après authentification réussie
        updateSudoTimestamp(context);

        // Exécuter la commande avec privilèges élevés
        executeSudoCommand(commandArgs, context, targetUser);
    }, () => {
        // Annulation (Ctrl+C)
        outputFn('');
    });
}

/**
 * Exécute une commande avec privilèges sudo
 * @param {Array} commandArgs - Arguments de la commande à exécuter
 * @param {Object} context - Contexte complet
 * @param {string} targetUser - Utilisateur cible (par défaut root)
 */
function executeSudoCommand(commandArgs, context, targetUser = 'root') {
    const { fileSystem } = context;
    const errorFn = context?.showError || ((str) => { context.terminal.write(`${str}\r\n`) });

    // Sauvegarder le contexte utilisateur actuel
    const originalUser = { ...context.currentUser };
    const originalVariables = { ...context.variables };

    try {
        // Changer temporairement vers l'utilisateur cible
        if (targetUser === 'root') {
            context.currentUser = {
                username: 'root',
                uid: 0,
                gid: 0,
                home: '/root',
                shell: '/bin/bash',
                groups: ['root']
            };
        } else {
            // Charger utilisateur depuis context/filesystem
            const userInfo = getUserFromContext(targetUser, context);
            if (!userInfo) {
                errorFn(`sudo: utilisateur '${targetUser}' non trouvé`);
                return;
            }
            context.currentUser = userInfo;
        }

        // Mettre à jour les variables d'environnement pour la commande sudo
        if (targetUser === 'root') {
            context.variables.USER = 'root';
            context.variables.HOME = '/root';
            context.variables.SUDO_USER = originalUser.username;
            context.variables.SUDO_UID = originalUser.uid.toString();
            context.variables.SUDO_GID = originalUser.gid.toString();
        }

        // Exécuter la commande avec le nouveau contexte
        const [command, ...args] = commandArgs;
        const terminalService = context.terminal.terminalService;
        
        // Utiliser le système de commandes existant
        terminalService.cmd(command, args);

    } finally {
        // Restaurer le contexte utilisateur original
        context.currentUser = originalUser;
        context.variables = originalVariables;
    }
}

/**
 * Vérifie si l'utilisateur peut utiliser sudo (avec context)
 * @param {Object} context - Contexte complet
 * @returns {boolean} - true si peut utiliser sudo
 */
function canUseSudoWithContext(context) {
    const { fileSystem, currentUser } = context;
    
    if (!currentUser) return false;
    if (currentUser.uid === 0) return true; // root peut toujours sudo

    const sudoersFile = fileSystem['/etc/sudoers'];
    if (!sudoersFile || !sudoersFile.content) return false;

    const content = sudoersFile.content;
    
    // Vérifier si l'utilisateur est explicitement dans sudoers
    if (content.includes(`${currentUser.username}\t`)) return true;
    
    // Vérifier si l'utilisateur fait partie d'un groupe autorisé
    return currentUser.groups.some(group => 
        content.includes(`%${group}`) && 
        (content.includes(`%${group}\tALL=`) || content.includes(`%${group} ALL=`))
    );
}

/**
 * Vérifie un mot de passe (avec context)
 * @param {string} username - Nom d'utilisateur
 * @param {string} password - Mot de passe à vérifier
 * @param {Object} context - Contexte complet
 * @returns {boolean} - true si mot de passe correct
 */
function verifyPasswordWithContext(username, password, context) {
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
function calculatePasswordHash(password) {
    // Utiliser la même logique que dans modules/users/password.js
    return '$6$rounds=656000$salt$' + btoa(password + 'salt');
}

/**
 * Récupère un utilisateur depuis le context/filesystem
 * @param {string} username - Nom d'utilisateur
 * @param {Object} context - Contexte complet
 * @returns {Object|null} - Informations utilisateur ou null
 */
function getUserFromContext(username, context) {
    const { fileSystem } = context;
    
    const passwdFile = fileSystem['/etc/passwd'];
    if (!passwdFile || passwdFile.type !== 'file') {
        return null;
    }

    const lines = passwdFile.content.split('\n');
    const userLine = lines.find(line => line.startsWith(username + ':'));
    if (!userLine) {
        return null;
    }

    const [user, , uid, gid, , home, shell] = userLine.split(':');
    
    // Récupérer les groupes depuis /etc/group
    const groups = getUserGroupsFromContext(username, context);
    
    return {
        username: user,
        uid: parseInt(uid),
        gid: parseInt(gid),
        home,
        shell,
        groups
    };
}

/**
 * Récupère les groupes d'un utilisateur depuis le context
 * @param {string} username - Nom d'utilisateur
 * @param {Object} context - Contexte complet
 * @returns {Array} - Liste des groupes
 */
function getUserGroupsFromContext(username, context) {
    const { fileSystem } = context;
    const groups = [username]; // Groupe principal = nom utilisateur
    
    const groupFile = fileSystem['/etc/group'];
    if (!groupFile || groupFile.type !== 'file') {
        return groups;
    }

    const lines = groupFile.content.split('\n');
    lines.forEach(line => {
        const [groupName, , , members] = line.split(':');
        if (members && members.split(',').includes(username)) {
            groups.push(groupName);
        }
    });

    return groups;
}

/**
 * Affiche les privilèges sudo (avec context)
 * @param {Object} context - Contexte complet
 * @param {Function} outputFn - Fonction d'affichage
 */
function showSudoPrivileges(context, outputFn) {
    const { fileSystem, currentUser } = context;

    if (!currentUser) {
        outputFn('Aucun utilisateur connecté.');
        return;
    }

    const sudoersFile = fileSystem['/etc/sudoers'];
    if (!sudoersFile || !sudoersFile.content) {
        outputFn('User ' + currentUser.username + ' may not run sudo on this host.');
        return;
    }

    const content = sudoersFile.content;
    const hostname = context.variables?.HOSTNAME || 'bash';

    outputFn(`Matching Defaults entries for ${currentUser.username} on ${hostname}:`);
    outputFn('    env_reset, mail_badpass, secure_path=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin');
    outputFn('');

    // Vérifier les privilèges directs
    if (content.includes(`${currentUser.username}\t`)) {
        outputFn(`User ${currentUser.username} may run the following commands on ${hostname}:`);
        outputFn('    (ALL : ALL) ALL');
        return;
    }

    // Vérifier les privilèges de groupe
    const userGroups = currentUser.groups || [];
    const hasGroupPrivileges = userGroups.some(group => {
        return content.includes(`%${group}`) && 
               (content.includes(`%${group}\tALL=`) || content.includes(`%${group} ALL=`));
    });

    if (hasGroupPrivileges) {
        outputFn(`User ${currentUser.username} may run the following commands on ${hostname}:`);
        userGroups.forEach(group => {
            if (content.includes(`%${group}`) && 
                (content.includes(`%${group}\tALL=`) || content.includes(`%${group} ALL=`))) {
                outputFn(`    (ALL : ALL) ALL`);
            }
        });
    } else {
        outputFn(`User ${currentUser.username} may not run sudo on ${hostname}.`);
    }
}

/**
 * ✅ NOUVEAU : Vérifie si le timestamp sudo est valide (moins de 15 minutes)
 * @param {Object} context - Contexte complet
 * @returns {boolean} - true si le timestamp est valide
 */
function checkSudoTimestamp(context) {
    const { fileSystem, currentUser } = context;
    
    if (!currentUser) return false;
    
    const timestampPath = getSudoTimestampPath(currentUser.uid);
    const timestampFile = fileSystem[timestampPath];
    
    if (!timestampFile || timestampFile.type !== 'file') {
        return false; // Pas de timestamp = pas d'authentification récente
    }
    
    try {
        const lastAuthTime = parseInt(timestampFile.content);
        const currentTime = Date.now();
        const timeDiff = currentTime - lastAuthTime;
        
        // 15 minutes = 15 * 60 * 1000 = 900000 millisecondes
        const SUDO_TIMEOUT = 15 * 60 * 1000;
        
        if (timeDiff >= SUDO_TIMEOUT) {
            // Timestamp expiré : le supprimer automatiquement
            delete fileSystem[timestampPath];
            if (context.saveFileSystem) {
                context.saveFileSystem();
            }
            return false;
        }
        
        return true; // Timestamp valide
    } catch (error) {
        // Fichier corrompu : le supprimer et retourner false
        delete fileSystem[timestampPath];
        if (context.saveFileSystem) {
            context.saveFileSystem();
        }
        return false;
    }
}

/**
 * ✅ NOUVEAU : Met à jour ou crée le timestamp sudo
 * @param {Object} context - Contexte complet
 */
function updateSudoTimestamp(context) {
    const { fileSystem, currentUser, saveFileSystem } = context;
    
    if (!currentUser) return;
    
    // Créer le répertoire /run/sudo/ts s'il n'existe pas
    const runDir = '/run';
    const sudoDir = '/run/sudo';
    const tsDir = '/run/sudo/ts';
    
    if (!fileSystem[runDir]) {
        fileSystem[runDir] = {
            type: 'directory',
            permissions: 'drwxr-xr-x',
            owner: 'root',
            group: 'root',
            size: 4096,
            created: new Date(),
            modified: new Date()
        };
    }
    
    if (!fileSystem[sudoDir]) {
        fileSystem[sudoDir] = {
            type: 'directory',
            permissions: 'drwx------',
            owner: 'root',
            group: 'root',
            size: 4096,
            created: new Date(),
            modified: new Date()
        };
    }
    
    if (!fileSystem[tsDir]) {
        fileSystem[tsDir] = {
            type: 'directory',
            permissions: 'drwx------',
            owner: 'root',
            group: 'root',
            size: 4096,
            created: new Date(),
            modified: new Date()
        };
    }
    
    // Créer/mettre à jour le fichier timestamp
    const timestampPath = getSudoTimestampPath(currentUser.uid);
    const currentTime = Date.now().toString();
    
    fileSystem[timestampPath] = {
        type: 'file',
        content: currentTime,
        permissions: '-rw-------',
        owner: 'root',
        group: 'root',
        size: currentTime.length,
        created: new Date(),
        modified: new Date()
    };
    
    // Sauvegarder le système de fichiers
    if (saveFileSystem) {
        saveFileSystem();
    }
}

/**
 * ✅ NOUVEAU : Obtient le chemin du fichier timestamp pour un UID
 * @param {number} uid - UID de l'utilisateur
 * @returns {string} - Chemin du fichier timestamp
 */
function getSudoTimestampPath(uid) {
    return `/run/sudo/ts/${uid}`;
}

/**
 * ✅ NOUVEAU : Efface le timestamp sudo (sudo -k)
 * @param {Object} context - Contexte complet
 */
function clearSudoTimestamp(context) {
    const { fileSystem, currentUser, saveFileSystem } = context;
    
    if (!currentUser) return;
    
    const timestampPath = getSudoTimestampPath(currentUser.uid);
    if (fileSystem[timestampPath]) {
        delete fileSystem[timestampPath];
        
        if (saveFileSystem) {
            saveFileSystem();
        }
    }
}

/**
 * ✅ NOUVEAU : Nettoie les timestamps expirés (appelée périodiquement)
 * @param {Object} context - Contexte complet
 */
function cleanExpiredTimestamps(context) {
    const { fileSystem, saveFileSystem } = context;
    
    const tsDir = '/run/sudo/ts';
    if (!fileSystem[tsDir]) return;
    
    const currentTime = Date.now();
    const SUDO_TIMEOUT = 15 * 60 * 1000; // 15 minutes
    
    // Parcourir tous les fichiers dans /run/sudo/ts
    Object.keys(fileSystem).forEach(path => {
        if (path.startsWith('/run/sudo/ts/') && path !== tsDir) {
            const timestampFile = fileSystem[path];
            if (timestampFile && timestampFile.type === 'file') {
                try {
                    const lastAuthTime = parseInt(timestampFile.content);
                    const timeDiff = currentTime - lastAuthTime;
                    
                    if (timeDiff >= SUDO_TIMEOUT) {
                        // Timestamp expiré : supprimer le fichier
                        delete fileSystem[path];
                    }
                } catch (error) {
                    // Fichier corrompu : supprimer
                    delete fileSystem[path];
                }
            }
        }
    });
    
    if (saveFileSystem) {
        saveFileSystem();
    }
}