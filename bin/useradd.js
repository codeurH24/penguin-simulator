// bin/useradd.js - Commande useradd (ajouter un utilisateur)
// Équivalent de /usr/sbin/useradd sous Debian

import { addUser, isRoot, initUserSystem } from '../modules/users.js';
import { showError, showSuccess } from '../modules/terminal.js';

/**
 * Commande useradd - Ajoute un nouvel utilisateur au système
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, saveFileSystem)
 */
export function cmdUseradd(args, context) {
    const { fileSystem, saveFileSystem } = context;
    
    // Vérifier les permissions (seul root peut ajouter des utilisateurs)
    if (!isRoot()) {
        showError('useradd: Seul root peut ajouter des utilisateurs au système');
        return;
    }
    
    // VÉRIFICATION CRITIQUE: S'assurer que les fichiers système existent
    if (!fileSystem['/etc/passwd']) {
        console.log('ATTENTION: /etc/passwd manquant, initialisation des fichiers système...');
        initUserSystem(fileSystem);
        saveFileSystem();
    }
    
    if (args.length === 0) {
        showError('useradd: nom d\'utilisateur manquant');
        showError('Usage: useradd [options] <nom_utilisateur>');
        showError('Options:');
        showError('  -u UID     Spécifier l\'UID de l\'utilisateur');
        showError('  -g GID     Spécifier le GID principal');
        showError('  -d HOME    Spécifier le répertoire home');
        showError('  -s SHELL   Spécifier le shell de connexion');
        showError('  -c GECOS   Spécifier le commentaire (nom complet)');
        showError('  -m         Créer le répertoire home (défaut)');
        return;
    }

    // Parser les options
    const options = {};
    let username = null;
    let createHome = true;
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg === '-u' && i + 1 < args.length) {
            options.uid = parseInt(args[++i]);
            if (isNaN(options.uid) || options.uid < 0) {
                showError(`useradd: UID invalide '${args[i]}'`);
                return;
            }
        } else if (arg === '-g' && i + 1 < args.length) {
            options.gid = parseInt(args[++i]);
            if (isNaN(options.gid) || options.gid < 0) {
                showError(`useradd: GID invalide '${args[i]}'`);
                return;
            }
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
            showError(`useradd: option inconnue '${arg}'`);
            return;
        } else {
            if (username === null) {
                username = arg;
            } else {
                showError('useradd: trop d\'arguments');
                return;
            }
        }
    }
    
    if (!username) {
        showError('useradd: nom d\'utilisateur manquant');
        return;
    }
    
    // Valider le nom d'utilisateur
    if (!/^[a-z_][a-z0-9_-]*[$]?$/.test(username) || username.length > 32) {
        showError(`useradd: nom d'utilisateur invalide '${username}'`);
        showError('Le nom d\'utilisateur doit :');
        showError('- Commencer par une lettre minuscule ou _');
        showError('- Contenir uniquement des lettres minuscules, chiffres, _ et -');
        showError('- Faire au maximum 32 caractères');
        return;
    }
    
    try {
        // Debug: vérifier l'état des fichiers avant
        console.log('État avant useradd:', {
            passwd: !!fileSystem['/etc/passwd'],
            shadow: !!fileSystem['/etc/shadow'],
            group: !!fileSystem['/etc/group']
        });
        
        const newUser = addUser(username, options, fileSystem, saveFileSystem);
        
        showSuccess(`Utilisateur '${username}' ajouté avec succès`);
        showSuccess(`UID: ${newUser.uid}, GID: ${newUser.gid}`);
        showSuccess(`Répertoire home: ${newUser.home}`);
        showSuccess(`Shell: ${newUser.shell}`);
        
        if (createHome) {
            showSuccess(`Répertoire home créé: ${newUser.home}`);
        }
        
        // Afficher les prochaines étapes
        showSuccess('');
        showSuccess('Prochaines étapes recommandées:');
        showSuccess(`- Définir un mot de passe: passwd ${username}`);
        showSuccess(`- Se connecter: su ${username}`);
        
    } catch (error) {
        showError('ERREUR useradd: ' + error.message);
        console.error('Erreur détaillée useradd:', error);
    }
}