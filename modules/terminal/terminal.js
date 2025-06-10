// modules/terminal/terminal.js
// Module principal du terminal - orchestration et API unifiée

import { 
    initTerminalElements, 
    getCommandInput, 
    setCommandInput, 
    clearCommandInput,
    focusCommandInput,
    isTerminalReady 
} from './dom.js';

import { 
    addLine, 
    addHTMLLine,
    clearTerminal, 
    showHelp, 
    showError, 
    showSuccess, 
    showInfo,
    showListing,
    scrollToBottom,
    write,
    flushLine
} from './display.js';

import { 
    updatePrompt, 
    addPromptWithCommand, 
    getPromptText,
    getEnvironmentVars 
} from './prompt.js';

import { 
    handleTabCompletion 
} from './autocomplete.js';

import { 
    startPasswordInput, 
    cancelPasswordInput, 
    isPasswordMode 
} from './password.js';

import { 
    setupHistory, 
    addToHistory, 
    navigateHistory,
    getHistory,
    clearHistory,
    serializeHistory,
    deserializeHistory 
} from './history.js';

import { 
    setupKeyboardHandlers, 
    focusInput,
    selectAllInput,
    moveCursorToEnd,
    insertTextAtCursor 
} from './input.js';

// État global du terminal
let terminalState = {
    initialized: false,
    context: null,
    onCommandExecute: null
};

/**
 * Initialise le terminal complet
 * @param {Object} context - Contexte d'exécution (filesystem, etc.)
 * @param {Function} onCommandExecute - Callback d'exécution des commandes
 * @returns {boolean} - true si initialisé avec succès
 */
export function initTerminal(context, onCommandExecute) {
    // Initialiser les éléments DOM
    if (!initTerminalElements()) {
        console.error('Échec de l\'initialisation des éléments DOM');
        return false;
    }

    // Sauvegarder le contexte et callback
    terminalState.context = context;
    terminalState.onCommandExecute = onCommandExecute;

    // Configurer l'historique
    setupHistory(
        (command) => setCommandInput(command),
        (command) => setCommandInput(command)
    );

    // Configurer les gestionnaires clavier
    setupKeyboardHandlers({
        onEnter: handleCommandSubmit,
        onTab: handleTabResult,
        onEscape: handleEscape,
        getContext: () => terminalState.context
    });

    // Mettre à jour le prompt initial
    if (context && context.getCurrentPath) {
        updatePrompt(context.getCurrentPath(), context);
    }

    // Focus sur l'input
    focusInput();

    terminalState.initialized = true;
    return true;
}

/**
 * Gestion de la soumission de commande (Enter)
 * @param {string} input - Commande saisie
 */
function handleCommandSubmit(input) {
    if (!input.trim()) return;

    const currentPath = terminalState.context ? 
        terminalState.context.getCurrentPath() : '/';

    // Ajouter la ligne de commande avec prompt
    addPromptWithCommand(input, currentPath, terminalState.context);

    // Ajouter à l'historique
    addToHistory(input);

    // Vider l'input
    clearCommandInput();

    // Exécuter la commande
    if (terminalState.onCommandExecute) {
        terminalState.onCommandExecute(input);
    }

    // Mettre à jour le prompt
    updatePrompt(currentPath, terminalState.context);
}

/**
 * Gestion du résultat d'autocomplétion (Tab)
 * @param {Object} result - Résultat de l'autocomplétion
 */
function handleTabResult(result) {
    if (result.completed) {
        setCommandInput(result.completed);
    }

    if (result.suggestions && result.suggestions.length > 0) {
        addLine('');
        addLine(result.suggestions.join('  '));
    }
}

/**
 * Gestion de la touche Escape
 */
function handleEscape() {
    if (isPasswordMode()) {
        cancelPasswordInput();
    } else {
        clearCommandInput();
    }
}

/**
 * API publique - Affichage
 */
export { 
    addLine, 
    addHTMLLine,
    clearTerminal, 
    showHelp, 
    showError, 
    showSuccess, 
    showInfo,
    showListing,
    scrollToBottom,
    write,
    flushLine
};

/**
 * API publique - Prompt
 */
export { 
    updatePrompt, 
    addPromptWithCommand, 
    getPromptText 
};

/**
 * API publique - Input
 */
export { 
    getCommandInput, 
    setCommandInput, 
    clearCommandInput,
    focusInput,
    selectAllInput,
    moveCursorToEnd,
    insertTextAtCursor 
};

/**
 * API publique - Password
 */
export { 
    startPasswordInput, 
    cancelPasswordInput, 
    isPasswordMode 
};

/**
 * API publique - Historique
 */
export { 
    addToHistory, 
    getHistory,
    clearHistory,
    serializeHistory,
    deserializeHistory 
};

/**
 * API publique - Utilitaires
 */
export { isTerminalReady };

/**
 * Met à jour le contexte du terminal
 * @param {Object} newContext - Nouveau contexte
 */
export function updateContext(newContext) {
    terminalState.context = newContext;
}

/**
 * Vérifie si le terminal est initialisé
 * @returns {boolean}
 */
export function isInitialized() {
    return terminalState.initialized;
}

/**
 * Récupère le contexte actuel
 * @returns {Object}
 */
export function getContext() {
    return terminalState.context;
}

/**
 * Réinitialise le terminal
 */
export function resetTerminal() {
    clearTerminal();
    clearHistory();
    clearCommandInput();
    
    if (terminalState.context && terminalState.context.getCurrentPath) {
        updatePrompt(terminalState.context.getCurrentPath(), terminalState.context);
    }
    
    focusInput();
}