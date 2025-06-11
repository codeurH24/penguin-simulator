// modules/terminal/xterm/Autocompletion.js
// Classe dédiée à la gestion de l'auto-complétion bash

export class Autocompletion {
    constructor(terminal, context) {
        this.terminal = terminal;
        this.context = context;

        // État pour la gestion de la double Tab
        this.lastTabInput = '';
        this.lastTabTime = 0;
        this.isConsecutiveTab = false;

        // Liste des commandes disponibles
        this.availableCommands = [
            'cd', 'pwd', 'ls', 'mkdir', 'touch', 'cat', 'echo',
            'mv', 'passwd', 'rm', 'su', 'whoami', 'id', 'groups', 'clear'
        ];
    }

    /**
     * Point d'entrée principal pour l'auto-complétion
     * @param {string} currentInput - Ligne de commande actuelle
     * @param {Function} insertTextCallback - Fonction pour insérer du texte
     */
    async handleTabCompletion(currentInput, insertTextCallback) {
        const currentTime = Date.now();

        this.isConsecutiveTab = (
            currentInput === this.lastTabInput &&
            currentTime - this.lastTabTime < 500
        );

        this.lastTabInput = currentInput;
        this.lastTabTime = currentTime;

        const parts = currentInput.trim().split(/\s+/);

        let optionsDisplayed = false;

        if (parts.length === 1 && !currentInput.endsWith(' ')) {
            optionsDisplayed = this.completeCommand(parts[0], insertTextCallback);
        } else {
            const currentArg = currentInput.endsWith(' ') ? '' : parts[parts.length - 1];
            optionsDisplayed = await this.completeFilePath(currentArg, insertTextCallback);
        }

        return optionsDisplayed; // Retourner si des options ont été affichées
    }

    /**
     * Auto-complétion des commandes
     * @param {string} partial - Début de commande tapé
     * @param {Function} insertTextCallback - Fonction pour insérer du texte
     */
    completeCommand(partial, insertTextCallback) {
        const matches = this.availableCommands.filter(cmd => cmd.startsWith(partial));

        if (matches.length === 1) {
            const completion = matches[0].substring(partial.length);
            insertTextCallback(completion + ' ');
            return false; // Pas d'options affichées
        } else if (matches.length > 1) {
            const commonPrefix = this.getCommonPrefix(matches);

            if (commonPrefix.length > partial.length) {
                const completion = commonPrefix.substring(partial.length);
                insertTextCallback(completion);
                return false; // Pas d'options affichées
            } else if (this.isConsecutiveTab) {
                return this.showCompletionOptions(matches); // Retourne true/false
            }
        }
        return false; // Rien fait
    }

    /**
 * Auto-complétion des fichiers et dossiers
 * @param {string} partial - Début de nom de fichier tapé
 * @param {Function} insertTextCallback - Fonction pour insérer du texte
 */
    async completeFilePath(partial, insertTextCallback) {
        try {
            const { listDirectory, resolvePath } = await import('../../../modules/filesystem.js');

            // Déterminer le répertoire à lister
            let dirPath = this.context.getCurrentPath();
            let filePattern = partial;

            // Si le partial contient un slash, séparer le répertoire du nom de fichier
            if (partial.includes('/')) {
                const lastSlash = partial.lastIndexOf('/');
                const pathPart = partial.substring(0, lastSlash + 1);
                filePattern = partial.substring(lastSlash + 1);

                // Résoudre le chemin du répertoire
                dirPath = resolvePath(pathPart, dirPath);
            }

            // Lister le contenu du répertoire
            const entries = listDirectory(this.context.fileSystem, dirPath);

            // Filtrer selon le pattern
            const matches = entries.filter(entry => entry.name.startsWith(filePattern));

            if (matches.length === 1) {
                // Une seule correspondance : complétion automatique
                const completion = matches[0].name.substring(filePattern.length);
                const suffix = matches[0].type === 'dir' ? '/' : ' ';
                insertTextCallback(completion + suffix);
                return false; // Pas d'options affichées
            } else if (matches.length > 1) {
                // Plusieurs correspondances
                const commonPrefix = this.getCommonPrefix(matches.map(m => m.name));

                if (commonPrefix.length > filePattern.length) {
                    // Première Tab : compléter seulement le préfixe commun
                    const completion = commonPrefix.substring(filePattern.length);
                    insertTextCallback(completion);
                    return false; // Pas d'options affichées
                } else if (this.isConsecutiveTab) {
                    // Deuxième Tab : afficher les options
                    const displayNames = matches.map(m => m.name + (m.type === 'dir' ? '/' : ''));
                    return this.showCompletionOptions(displayNames); // Retourner le résultat
                }
            }
            return false; // Rien fait
        } catch (e) {
            // Pas de complétion si erreur (répertoire inexistant, etc.)
            console.log('Erreur auto-complétion:', e);
            return false; // Erreur = pas d'options affichées
        }
    }

    /**
     * Affiche les options de complétion disponibles
     * @param {Array} options - Liste des options à afficher
     */
    showCompletionOptions(options) {
        // Ne rien afficher s'il n'y a pas d'options
        if (options.length === 0) {
            return false;
        }

        this.terminal.write('\r\n' + options.join('  ') + '\r\n');
        return true;
    }

    /**
     * Trouve le préfixe commun le plus long dans une liste de chaînes
     * @param {Array} strings - Liste de chaînes
     * @returns {string} - Préfixe commun
     */
    getCommonPrefix(strings) {
        if (strings.length === 0) return '';

        let prefix = strings[0];
        for (let i = 1; i < strings.length; i++) {
            while (!strings[i].startsWith(prefix)) {
                prefix = prefix.slice(0, -1);
            }
        }
        return prefix;
    }

    /**
     * Met à jour la liste des commandes disponibles
     * @param {Array} commands - Nouvelle liste de commandes
     */
    setAvailableCommands(commands) {
        this.availableCommands = commands;
    }

    /**
     * Ajoute une commande à la liste des commandes disponibles
     * @param {string} command - Commande à ajouter
     */
    addCommand(command) {
        if (!this.availableCommands.includes(command)) {
            this.availableCommands.push(command);
        }
    }

    /**
     * Supprime une commande de la liste des commandes disponibles
     * @param {string} command - Commande à supprimer
     */
    removeCommand(command) {
        const index = this.availableCommands.indexOf(command);
        if (index > -1) {
            this.availableCommands.splice(index, 1);
        }
    }
}