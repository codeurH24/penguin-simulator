// bin/useradd.js - Commande useradd (ajouter un utilisateur) - Version corrigée
// Équivalent de /usr/sbin/useradd sous Debian

import { addUser, isRoot, initUserSystem, parsePasswdFile } from '../modules/users.js';
import { showError, showSuccess } from '../modules/terminal.js';

/**
 * Commande useradd - Ajoute un nouvel utilisateur au système
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, saveFileSystem)
 */
export function cmdUseradd(args, context) {
    const { fileSystem, saveFileSystem } = context;
    
    // Utiliser les fonctions du contexte si disponibles, sinon celles par défaut
    const errorFn = context?.showError || showError;
    const successFn = context?.showSuccess || showSuccess;
    
    // Vérifier les permissions (seul root peut ajouter des utilisateurs)
    if (!isRoot()) {
        errorFn('useradd: Seul root peut ajouter des utilisateurs au système');
        return;
    }
    
    // VÉRIFICATION CRITIQUE: S'assurer que les fichiers système existent
    if (!fileSystem['/etc/passwd']) {
        console.log('ATTENTION: /etc/passwd manquant, initialisation des fichiers système...');
        initUserSystem(fileSystem);
        saveFileSystem();
    }
    
    // Vérifier qu'au moins un nom d'utilisateur est fourni
    if (args.length === 0) {
        errorFn('useradd: nom d\'utilisateur manquant');
        errorFn('Usage: useradd [options] <nom_utilisateur>');
        errorFn('Options:');
        errorFn('  -u UID     Spécifier l\'UID de l\'utilisateur');
        errorFn('  -g GID     Spécifier le GID principal');
        errorFn('  -d HOME    Spécifier le répertoire home');
        errorFn('  -s SHELL   Spécifier le shell de connexion');
        errorFn('  -c GECOS   Spécifier le commentaire (nom complet)');
        errorFn('  -m         Créer le répertoire home (défaut)');
        return;
    }

    // Parser les options
    const options = {};
    let username = null;
    let createHome = true;
    
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
                return;
            }
        }
    }
    
    if (!username) {
        errorFn('useradd: nom d\'utilisateur manquant');
        return;
    }
    
    // Valider le nom d'utilisateur selon les règles Unix
    if (!isValidUsername(username)) {
        errorFn(`useradd: nom d'utilisateur invalide '${username}'`);
        errorFn('Le nom d\'utilisateur doit :');
        errorFn('- Commencer par une lettre minuscule ou _');
        errorFn('- Contenir uniquement des lettres minuscules, chiffres, _ et -');
        errorFn('- Faire au maximum 32 caractères');
        return;
    }
    
    // Vérifier si l'utilisateur existe déjà
    const users = parsePasswdFile(fileSystem);
    if (users.find(u => u.username === username)) {
        errorFn(`useradd: l'utilisateur '${username}' existe déjà`);
        return;
    }
    
    // Vérifier si l'UID est déjà utilisé (si spécifié)
    if (options.uid !== undefined) {
        if (users.find(u => u.uid === options.uid)) {
            errorFn(`useradd: l'UID ${options.uid} est déjà utilisé`);
            return;
        }
    }
    
    try {
        // Debug: vérifier l'état des fichiers avant
        console.log('État avant useradd:', {
            passwd: !!fileSystem['/etc/passwd'],
            shadow: !!fileSystem['/etc/shadow'],
            group: !!fileSystem['/etc/group']
        });
        
        const newUser = addUser(username, options, fileSystem, saveFileSystem);
        
        // COMPORTEMENT UNIX: useradd est SILENCIEUX en cas de succès
        // Les tests s'attendent à aucune sortie pour un succès
        
    } catch (error) {
        errorFn('useradd: ' + error.message);
        console.error('Erreur détaillée useradd:', error);
    }
}

/**
 * Valide un nom d'utilisateur selon les règles Unix/Linux
 * @param {string} username - Nom d'utilisateur à valider
 * @returns {boolean} - true si le nom est valide
 */
function isValidUsername(username) {
    // Règles Unix pour les noms d'utilisateur :
    // - Doit commencer par une lettre minuscule ou underscore
    // - Peut contenir des lettres minuscules, chiffres, underscores et tirets
    // - Peut se terminer par un $ (pour les comptes de machine)
    // - Maximum 32 caractères
    
    if (!username || username.length === 0 || username.length > 32) {
        return false;
    }
    
    // Regex selon les standards POSIX
    const validPattern = /^[a-z_][a-z0-9_-]*[$]?$/;
    return validPattern.test(username);
}