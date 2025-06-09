// modules/terminal/input.js
// Gestion des entrées clavier du terminal

import { getCommandInputElement } from './dom.js';
import { handleTabCompletion } from './autocomplete.js';
import { handleHistoryKeydown, resetHistoryNavigation } from './history.js';
import { handlePasswordInput, isPasswordMode } from './password.js';

let keyboardHandlers = {
    onEnter: null,
    onTab: null,
    onEscape: null,
    getContext: null
};

/**
 * Configure les gestionnaires d'événements clavier
 * @param {Object} handlers - Callbacks pour les événements
 * @param {Function} handlers.onEnter - Callback pour Enter
 * @param {Function} handlers.onTab - Callback pour Tab
 * @param {Function} handlers.onEscape - Callback pour Escape
 * @param {Function} handlers.getContext - Fonction qui retourne le contexte
 */
export function setupKeyboardHandlers(handlers) {
    keyboardHandlers = { ...keyboardHandlers, ...handlers };
    
    const commandInput = getCommandInputElement();
    if (!commandInput) {
        console.error('Input de commande non initialisé');
        return false;
    }

    // Supprimer les anciens listeners
    commandInput.removeEventListener('keydown', handleKeydown);
    
    // Ajouter le nouveau listener
    commandInput.addEventListener('keydown', handleKeydown);
    
    return true;
}

/**
 * Gestionnaire principal des événements clavier
 * @param {KeyboardEvent} e - Événement clavier
 */
function handleKeydown(e) {
    // En mode password, seules certaines touches sont autorisées
    if (isPasswordMode()) {
        if (handlePasswordInput(e)) {
            return; // Événement traité par le mode password
        }
    }

    const commandInput = getCommandInputElement();
    if (!commandInput) return;

    const currentInput = commandInput.value;

    switch (e.key) {
        case 'Enter':
            handleEnterKey(e, currentInput);
            break;
            
        case 'Tab':
            handleTabKey(e, currentInput);
            break;
            
        case 'Escape':
            handleEscapeKey(e);
            break;
            
        case 'ArrowUp':
        case 'ArrowDown':
            handleHistoryKeydown(e, currentInput);
            break;
            
        default:
            // Autres touches - reset navigation historique
            if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete') {
                resetHistoryNavigation();
            }
            break;
    }
}

/**
 * Gestion de la touche Enter
 * @param {KeyboardEvent} e - Événement
 * @param {string} input - Contenu de l'input
 */
function handleEnterKey(e, input) {
    e.preventDefault();
    
    if (keyboardHandlers.onEnter) {
        keyboardHandlers.onEnter(input);
    }
}

/**
 * Gestion de la touche Tab (autocomplétion)
 * @param {KeyboardEvent} e - Événement
 * @param {string} input - Contenu de l'input
 */
function handleTabKey(e, input) {
    e.preventDefault();
    
    const context = keyboardHandlers.getContext ? keyboardHandlers.getContext() : null;
    if (!context) return;
    
    const result = handleTabCompletion(input, context);
    
    if (keyboardHandlers.onTab) {
        keyboardHandlers.onTab(result);
    }
}

/**
 * Gestion de la touche Escape
 * @param {KeyboardEvent} e - Événement
 */
function handleEscapeKey(e) {
    e.preventDefault();
    
    if (keyboardHandlers.onEscape) {
        keyboardHandlers.onEscape();
    }
}

/**
 * Force le focus sur l'input de commande
 */
export function focusInput() {
    const commandInput = getCommandInputElement();
    if (commandInput) {
        commandInput.focus();
    }
}

/**
 * Sélectionne tout le texte dans l'input
 */
export function selectAllInput() {
    const commandInput = getCommandInputElement();
    if (commandInput) {
        commandInput.select();
    }
}

/**
 * Déplace le curseur à la fin de l'input
 */
export function moveCursorToEnd() {
    const commandInput = getCommandInputElement();
    if (commandInput) {
        commandInput.setSelectionRange(commandInput.value.length, commandInput.value.length);
    }
}

/**
 * Insère du texte à la position du curseur
 * @param {string} text - Texte à insérer
 */
export function insertTextAtCursor(text) {
    const commandInput = getCommandInputElement();
    if (!commandInput) return;
    
    const start = commandInput.selectionStart;
    const end = commandInput.selectionEnd;
    const value = commandInput.value;
    
    commandInput.value = value.substring(0, start) + text + value.substring(end);
    commandInput.setSelectionRange(start + text.length, start + text.length);
}

/**
 * Supprime les gestionnaires d'événements
 */
export function removeKeyboardHandlers() {
    const commandInput = getCommandInputElement();
    if (commandInput) {
        commandInput.removeEventListener('keydown', handleKeydown);
    }
}