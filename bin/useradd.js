// bin/useradd.js - Commande useradd avec option -G pour sudo
// Équivalent de /usr/sbin/useradd sous Debian - VERSION CORRIGÉE

import { addUser, addUserToGroups } from '../modules/users/user-crud.js';
import { initializeUserSystem } from '../modules/users/system-init.js';

/**
 * Commande useradd - Ajoute un nouvel utilisateur au système avec option -G
 * @param {Array} args - Arguments de la commande  
 * @param {Object} context - Contexte (fileSystem, saveFileSystem, currentUser)
 */
export function cmdUseradd(args, context) {
    const { fileSystem, saveFileSystem } = context;
    
    const term = context.terminal;
    const errorFn = context?.showError || ((str) => { term.write(`${str}\r\n`) });
    
    // ✅ SÉCURISÉ: Utiliser context.currentUser comme source de vérité
    const currentUser = context.currentUser;
    
    // Vérifier les permissions (seul root peut ajouter des utilisateurs)
    if (!currentUser || currentUser.uid !== 0) {
        errorFn('useradd: Seul root peut ajouter des utilisateurs au système');
        return;
    }
    
    // S'assurer que les fichiers système existent
    if (!fileSystem['/etc/passwd']) {
        initializeUserSystem(fileSystem, saveFileSystem);
    }
    
    // Vérifier qu'au moins un nom d'utilisateur est fourni
    if (args.length === 0) {
        errorFn('useradd: nom d\'utilisateur manquant');
        errorFn('Usage: useradd [options] <nom_utilisateur>');
        errorFn('Options:');
        errorFn('  -u UID     Spécifier l\'UID de l\'utilisateur');
        errorFn('  -g GID     Spécifier le GID principal');
        errorFn('  -G GROUPES Spécifier les groupes supplémentaires (séparés par des virgules)');
        errorFn('  -d HOME    Spécifier le répertoire home');
        errorFn('  -s SHELL   Spécifier le shell de connexion');
        errorFn('  -c GECOS   Spécifier le commentaire (nom complet)');
        errorFn('  -m         Créer le répertoire home');
        errorFn('  -M         Ne pas créer le répertoire home');
        errorFn('');
        errorFn('Exemple pour sudo: useradd -m -G sudo john');
        return;
    }

    // Parser les options
    const options = {};
    let username = null;
    let createHome = false; // DEBIAN: Par défaut FALSE
    let supplementaryGroups = []; // Nouveaux groupes supplémentaires
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg === '-u' && i + 1 < args.length) {
            const uidStr = args[++i];
            const uid = parseInt(uidStr);
            if (isNaN(uid) || uid < 0) {
                errorFn(`useradd: UID invalide '${uidStr}'`);
                return;
            }
            options.uid = uid;
        } else if (arg === '-g' && i + 1 < args.length) {
            const gidStr = args[++i];
            const gid = parseInt(gidStr);
            if (isNaN(gid) || gid < 0) {
                errorFn(`useradd: GID invalide '${gidStr}'`);
                return;
            }
            options.gid = gid;
        } else if (arg === '-G' && i + 1 < args.length) {
            // ✅ OPTION ESSENTIELLE: Groupes supplémentaires pour sudo
            const groupsStr = args[++i];
            supplementaryGroups = groupsStr.split(',').map(g => g.trim());
        } else if (arg === '-d' && i + 1 < args.length) {
            options.home = args[++i];
        } else if (arg === '-s' && i + 1 < args.length) {
            options.shell = args[++i];
        } else if (arg === '-c' && i + 1 < args.length) {
            options.gecos = args[++i];
        } else if (arg === '-m') {
            createHome = true;
        } else if (arg === '-M') {
            createHome = false;
        } else if (arg.startsWith('-')) {
            errorFn(`useradd: option inconnue '${arg}'`);
            return;
        } else {
            if (username === null) {
                username = arg;
            } else {
                errorFn('useradd: trop d\'arguments');
                errorFn('Usage: useradd [options] <nom_utilisateur>');
                return;
            }
        }
    }

    if (username === null) {
        errorFn('useradd: nom d\'utilisateur manquant');
        return;
    }

    // Validation du nom d'utilisateur
    if (!/^[a-z_][a-z0-9_-]*$/.test(username) || username.length > 32) {
        errorFn(`useradd: nom d'utilisateur invalide '${username}'`);
        return;
    }

    try {
        // Créer l'utilisateur
        const newUser = addUser(username, options, fileSystem, saveFileSystem, createHome);
        
        // ✅ ESSENTIEL: Ajouter aux groupes supplémentaires (notamment sudo)
        if (supplementaryGroups.length > 0) {
            addUserToGroups(username, supplementaryGroups, fileSystem, saveFileSystem);
        }
        
        // DEBIAN: Aucune sortie en cas de succès (mode silencieux)
        
    } catch (error) {
        errorFn(error.message);
    }
}