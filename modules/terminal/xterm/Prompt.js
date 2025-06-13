// modules/terminal/xterm/Prompt.js
export class Prompt {

    constructor(terminal) {
        this.terminal = terminal;
    }

    /**
     * Affiche le prompt bash standard (conservé pour compatibilité)
     */
    showPrompt() {
        // Ne pas afficher le prompt si on est en mode spécial
        if (this.terminal.term.customPromptMode || this.terminal.term.passwordMode) {
            return;
        }

        const username = this.terminal.context?.currentUser?.username || 'root';
        const currentPath = this.terminal.context?.getCurrentPath() || '/';
        this.uid = this.terminal.context?.currentUser?.uid || 0;

        this.terminal.term.write(`${username}@bash:${currentPath}${this.getShellSymbol()} `);
    }

    /**
     * Affiche un prompt personnalisé avec callback
     * @param {string} promptText - Le texte du prompt à afficher
     * @param {function} callback - Fonction appelée avec la réponse de l'utilisateur
     * @param {object} options - Options du prompt (optionnel)
     * @param {boolean} options.hidden - Cache la saisie (mode password)
     * @param {function} options.validator - Fonction de validation (return {valid: boolean, message?: string})
     * @param {function} options.onCancel - Fonction appelée lors d'une annulation (Ctrl+C)
     */
    showCustomPrompt(promptText, callback, options = {}) {
        const term = this.terminal.term;
        
        // Configuration par défaut
        const config = {
            hidden: false,
            validator: null,
            onCancel: null,
            ...options
        };

        // Effacer la ligne courante et afficher le prompt
        term.write('\r\x1b[K'); // Effacer la ligne courante
        term.write(promptText);
        
        // Activer le mode prompt personnalisé
        term.customPromptMode = true;
        term.customPromptInput = '';
        term.customPromptCallback = callback;
        term.customPromptConfig = config;
        
        // Gérer l'annulation
        if (config.onCancel) {
            term.customPromptCancelCallback = config.onCancel;
        }
    }

    /**
     * Raccourci pour afficher une question simple
     * @param {string} question - La question à poser
     * @param {function} callback - Fonction appelée avec la réponse
     */
    askQuestion(question, callback) {
        const promptText = question.endsWith(' ') ? question : question + ' ';
        this.showCustomPrompt(promptText, callback);
    }

    /**
     * Raccourci pour demander un mot de passe
     * @param {string} prompt - Le texte du prompt
     * @param {function} callback - Fonction appelée avec le mot de passe
     * @param {function} onCancel - Fonction appelée en cas d'annulation
     */
    askPassword(prompt, callback, onCancel = null) {
        this.showCustomPrompt(prompt, callback, {
            hidden: true,
            onCancel: onCancel
        });
    }

    /**
     * Demande une confirmation oui/non
     * @param {string} question - La question à poser
     * @param {function} callback - Fonction appelée avec true/false
     */
    askConfirmation(question, callback) {
        const promptText = question.endsWith(' ') ? question + '[y/N] ' : question + ' [y/N] ';
        
        this.showCustomPrompt(promptText, (answer) => {
            const normalized = answer.trim().toLowerCase();
            const confirmed = normalized === 'y' || normalized === 'yes' || normalized === 'o' || normalized === 'oui';
            callback(confirmed);
        });
    }

    /**
     * Demande une saisie avec validation
     * @param {string} prompt - Le texte du prompt
     * @param {function} validator - Fonction de validation (return {valid: boolean, message?: string})
     * @param {function} callback - Fonction appelée avec la réponse validée
     */
    askWithValidation(prompt, validator, callback) {
        this.showCustomPrompt(prompt, callback, {
            validator: validator
        });
    }

    /**
     * Traite la réponse du prompt personnalisé
     * @param {string} input - La saisie de l'utilisateur
     */
    handleCustomPromptResponse(input) {
        const term = this.terminal.term;
        const config = term.customPromptConfig;
        
        // Validation si nécessaire
        if (config && config.validator) {
            const validation = config.validator(input);
            if (!validation.valid) {
                // Afficher le message d'erreur et redemander
                if (validation.message) {
                    term.write(`\r\n${validation.message}\r\n`);
                }
                // Réafficher le prompt
                const currentPromptText = term.customPromptText || '';
                term.write(currentPromptText);
                term.customPromptInput = '';
                return;
            }
        }
        
        // Sauvegarder le callback AVANT de sortir du mode
        const callback = term.customPromptCallback;
        
        // Sortir du mode prompt personnalisé IMMÉDIATEMENT
        term.customPromptMode = false;
        term.customPromptInput = '';
        term.customPromptCallback = null;
        term.customPromptConfig = null;
        term.customPromptCancelCallback = null;
        
        // Appeler le callback avec la réponse
        if (callback) {
            callback(input);
        }
        
        // Restaurer le prompt bash manuellement
        this.showPrompt();
    }

    /**
     * Sort du mode prompt personnalisé (simplifié)
     */
    exitCustomPromptMode() {
        const term = this.terminal.term;
        
        term.customPromptMode = false;
        term.customPromptInput = '';
        term.customPromptCallback = null;
        term.customPromptConfig = null;
        term.customPromptCancelCallback = null;
    }

    /**
     * Gère l'annulation du prompt personnalisé (Ctrl+C)
     */
    cancelCustomPrompt() {
        const term = this.terminal.term;
        
        term.write('^C\r\n');
        
        // Appeler le callback d'annulation si défini
        if (term.customPromptCancelCallback) {
            term.customPromptCancelCallback();
        }
        
        // Sortir du mode prompt personnalisé
        term.customPromptMode = false;
        term.customPromptInput = '';
        term.customPromptCallback = null;
        term.customPromptConfig = null;
        term.customPromptCancelCallback = null;
        
        // Restaurer le prompt bash après l'annulation
        this.showPrompt();
    }

    getShellSymbol() {
        return this.uid === 0 ? "#" : "$";
    }
}