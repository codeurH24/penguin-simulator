// modules/terminal/dom.js
// Gestion des éléments DOM du terminal

let terminal = null;
let commandInput = null;
let promptElement = null;

/**
 * Initialise les éléments DOM du terminal
 * @returns {boolean} - true si l'initialisation réussit
 */
export function initTerminalElements() {
    terminal = document.getElementById('terminal');
    commandInput = document.getElementById('commandInput');
    promptElement = document.getElementById('prompt');

    if (!terminal || !commandInput || !promptElement) {
        console.error('Erreur: éléments DOM du terminal non trouvés');
        return false;
    }

    return true;
}

/**
 * Récupère l'élément terminal principal
 * @returns {HTMLElement|null}
 */
export function getTerminalElement() {
    return terminal;
}

/**
 * Récupère l'élément input de commande
 * @returns {HTMLInputElement|null}
 */
export function getCommandInputElement() {
    return commandInput;
}

/**
 * Récupère l'élément prompt
 * @returns {HTMLElement|null}
 */
export function getPromptElement() {
    return promptElement;
}

/**
 * Récupère la valeur actuelle de l'input
 * @returns {string} - Commande tapée
 */
export function getCommandInput() {
    return commandInput ? commandInput.value.trim() : '';
}

/**
 * Vide l'input de commande
 */
export function clearCommandInput() {
    if (commandInput) {
        commandInput.value = '';
    }
}

/**
 * Définit la valeur de l'input de commande
 * @param {string} value - Valeur à définir
 */
export function setCommandInput(value) {
    if (commandInput) {
        commandInput.value = value;
    }
}

/**
 * Focus sur l'input de commande
 */
export function focusCommandInput() {
    if (commandInput) {
        commandInput.focus();
    }
}

/**
 * Vérifie si les éléments du terminal sont initialisés
 * @returns {boolean} - true si tout est initialisé
 */
export function isTerminalReady() {
    return terminal !== null && commandInput !== null && promptElement !== null;
}