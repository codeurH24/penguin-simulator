// bin/usermod/usermod.js - Point d'entrée principal pour la commande usermod
// Équivalent de /usr/sbin/usermod sous Debian

import { validateUsermodArgs, validateUserExists } from './validation.js';
import { modifyUserGroups } from './groups.js';
import { modifyUserProperties } from './properties.js';
import { executeUsermodChanges } from './execution.js';
import { requiresRootPrivileges } from './utils.js';

/**
 * Commande usermod - Modifie un compte utilisateur
 * Usage: usermod [options] LOGIN
 * 
 * Options principales:
 * -a, --append         Ajouter l'utilisateur aux groupes supplémentaires (avec -G)
 * -c, --comment TEXT   Nouveau champ commentaire (GECOS)
 * -d, --home DIR       Nouveau répertoire de connexion 
 * -e, --expiredate     Date d'expiration du compte (YYYY-MM-DD)
 * -g, --gid GID        Nouveau groupe principal
 * -G, --groups GROUPS  Liste des groupes supplémentaires
 * -l, --login LOGIN    Nouveau nom de connexion
 * -L, --lock          Verrouiller le mot de passe utilisateur
 * -m, --move-home     Déplacer le contenu du répertoire vers le nouveau
 * -s, --shell SHELL   Nouveau shell de connexion
 * -u, --uid UID       Nouvelle UID utilisateur
 * -U, --unlock        Déverrouiller le mot de passe utilisateur
 * 
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, saveFileSystem, terminal, currentUser)
 * @returns {void}
 */
export function cmdUsermod(args, context) {
    const { fileSystem, saveFileSystem, terminal } = context;
    const term = terminal;
    const errorFn = context?.showError || ((str) => { term.write(`${str}\r\n`) });
    const outputFn = context?.addLine || ((str) => { term.write(`${str}\r\n`) });

    // Vérifier les privilèges root
    if (!requiresRootPrivileges(context, errorFn)) {
        return;
    }

    // Afficher l'aide si aucun argument
    if (args.length === 0) {
        showUsermodHelp(outputFn);
        return;
    }

    try {
        // Validation des arguments
        const { options, username } = validateUsermodArgs(args, errorFn);
        if (!options || !username) {
            return;
        }

        // Vérifier que l'utilisateur existe
        if (!validateUserExists(username, context, errorFn)) {
            return;
        }

        // Préparer les modifications
        const modifications = {
            groups: null,
            properties: {},
            moveHome: false,
            append: false
        };

        // Traiter les options de groupes
        if (options.groups !== undefined || options.gid !== undefined) {
            const groupResult = modifyUserGroups(username, options, context, errorFn);
            if (groupResult === null) {
                return; // Erreur dans la modification des groupes
            }
            modifications.groups = groupResult;
            modifications.append = options.append || false;
        }

        // Traiter les modifications de propriétés
        const propertyResult = modifyUserProperties(username, options, context, errorFn);
        if (propertyResult === null) {
            return; // Erreur dans la modification des propriétés
        }
        modifications.properties = propertyResult;
        modifications.moveHome = options.moveHome || false;

        // Exécuter toutes les modifications
        const success = executeUsermodChanges(username, modifications, context, errorFn);
        
        if (success) {
            // usermod est normalement silencieux en cas de succès (comportement Unix)
            saveFileSystem();
        }

    } catch (error) {
        errorFn(`usermod: erreur inattendue: ${error.message}`);
    }
}

/**
 * Affiche l'aide de la commande usermod
 * @param {Function} outputFn - Fonction d'affichage
 */
function showUsermodHelp(outputFn) {
    outputFn('Usage: usermod [options] LOGIN');
    outputFn('');
    outputFn('Options:');
    outputFn('  -a, --append                 ajouter l\'utilisateur aux GROUPES supplémentaires');
    outputFn('                               mentionnés par l\'option -G sans supprimer');
    outputFn('                               l\'utilisateur des autres groupes');
    outputFn('  -c, --comment COMMENTAIRE    nouvelle valeur du champ GECOS');
    outputFn('  -d, --home RÉPERTOIRE        nouveau répertoire personnel pour le compte utilisateur');
    outputFn('  -e, --expiredate DATE_EXPIR  définir la date d\'expiration du compte à DATE_EXPIR');
    outputFn('  -g, --gid GROUPE             forcer l\'utilisation de GROUPE comme nouveau groupe principal');
    outputFn('  -G, --groups GROUPES         nouvelle liste des GROUPES supplémentaires');
    outputFn('  -l, --login NOUVEAU_LOGIN    nouvelle valeur du nom de connexion');
    outputFn('  -L, --lock                   verrouiller le compte utilisateur');
    outputFn('  -m, --move-home              déplacer le contenu du répertoire personnel vers le');
    outputFn('                               nouvel emplacement (à utiliser seulement avec -d)');
    outputFn('  -s, --shell SHELL            nouveau shell de connexion pour le compte utilisateur');
    outputFn('  -u, --uid UID                nouvelle UID pour le compte utilisateur');
    outputFn('  -U, --unlock                 déverrouiller le compte utilisateur');
    outputFn('  -h, --help                   afficher ce message d\'aide et quitter');
}