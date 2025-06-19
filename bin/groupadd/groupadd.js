// bin/groupadd/groupadd.js - Point d'entrée principal pour la commande groupadd
// Équivalent de /usr/sbin/groupadd sous Debian

import { validateGroupAddArgs } from './validation.js';
import { createGroup } from './creation.js';
import { requiresRootAccess } from './utils.js';

/**
 * Commande groupadd - Crée un nouveau groupe système
 * @param {Array} args - Arguments de la commande
 * @param {Object} context - Contexte (fileSystem, saveFileSystem, terminal, currentUser)
 * @param {Object} options - Options supplémentaires
 */
export function cmdGroupadd(args, context, options = {}) {
    const { fileSystem, saveFileSystem, terminal } = context;
    const { programmatic = false } = options;
    
    const term = terminal;
    const errorFn = context?.showError || ((str) => { term.write(`${str}\r\n`) });
    const outputFn = context?.addLine || ((str) => { term.write(`${str}\r\n`) });

    // Utiliser context.currentUser comme source de vérité
    const currentUser = context.currentUser;

    if (!currentUser) {
        errorFn('groupadd: aucun utilisateur connecté');
        return;
    }

    // Vérifier les permissions root
    if (!requiresRootAccess(currentUser)) {
        errorFn('groupadd: Seul root peut exécuter cette commande');
        return;
    }

    // Afficher l'aide si demandée
    if (args.includes('--help') || args.includes('-h')) {
        showHelp(outputFn);
        return;
    }

    // Valider les arguments
    const validation = validateGroupAddArgs(args, fileSystem);
    if (!validation.isValid) {
        errorFn(`groupadd: ${validation.error}`);
        if (validation.showUsage) {
            showUsage(errorFn);
        }
        return;
    }

    // Créer le groupe
    try {
        createGroup(validation.groupName, validation.options, context);
        
        // DEBIAN: Aucune sortie en cas de succès (principe Unix)
        // La commande est silencieuse si tout s'est bien passé
        
    } catch (error) {
        errorFn(`groupadd: ${error.message}`);
    }
}

/**
 * Affiche l'aide de la commande groupadd
 * @param {Function} outputFn - Fonction d'affichage
 */
function showHelp(outputFn) {
    outputFn('Usage: groupadd [options] GROUPE');
    outputFn('');
    outputFn('Options:');
    outputFn('  -g, --gid GID       Utiliser GID comme identifiant de groupe');
    outputFn('  -h, --help          Afficher cette aide et quitter');
    outputFn('  -r, --system        Créer un groupe système');
    outputFn('  -f, --force         Forcer la création (retour OK si groupe existe)');
    outputFn('');
    outputFn('Exemples:');
    outputFn('  groupadd developers        # Créer le groupe "developers"');
    outputFn('  groupadd -g 500 staff      # Créer "staff" avec GID 500');
    outputFn('  groupadd -r services       # Créer un groupe système');
}

/**
 * Affiche l'usage en cas d'erreur
 * @param {Function} errorFn - Fonction d'erreur
 */
function showUsage(errorFn) {
    errorFn('Usage: groupadd [options] GROUPE');
    errorFn('Essayez "groupadd --help" pour plus d\'informations.');
}