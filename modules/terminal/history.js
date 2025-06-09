// modules/terminal/history.js
// Gestion de l'historique des commandes

let commandHistory = [];
let historyIndex = -1;
let currentCommand = '';

// Callbacks pour la navigation
let handleHistoryUp = null;
let handleHistoryDown = null;

/**
 * Configure les callbacks de navigation dans l'historique
 * @param {Function} upCallback - Callback pour flèche haut
 * @param {Function} downCallback - Callback pour flèche bas
 */
export function setupHistory(upCallback, downCallback) {
    handleHistoryUp = upCallback;
    handleHistoryDown = downCallback;
}

/**
 * Ajoute une commande à l'historique
 * @param {string} command - Commande à ajouter
 */
export function addToHistory(command) {
    if (!command || command.trim() === '') return;
    
    const trimmedCommand = command.trim();
    
    // Éviter les doublons consécutifs
    if (commandHistory.length === 0 || 
        commandHistory[commandHistory.length - 1] !== trimmedCommand) {
        commandHistory.push(trimmedCommand);
    }
    
    // Limiter la taille de l'historique
    if (commandHistory.length > 1000) {
        commandHistory = commandHistory.slice(-1000);
    }
    
    // Reset de l'index
    historyIndex = -1;
    currentCommand = '';
}

/**
 * Navigue dans l'historique
 * @param {string} direction - 'up' ou 'down'
 * @param {string} current - Commande actuellement tapée
 * @returns {string} - Commande à afficher
 */
export function navigateHistory(direction, current = '') {
    if (commandHistory.length === 0) return current;
    
    if (direction === 'up') {
        // Sauvegarder la commande actuelle si on démarre la navigation
        if (historyIndex === -1) {
            currentCommand = current;
            historyIndex = commandHistory.length - 1;
        } else if (historyIndex > 0) {
            historyIndex--;
        }
        
        return commandHistory[historyIndex] || current;
    }
    
    if (direction === 'down') {
        if (historyIndex === -1) return current;
        
        historyIndex++;
        
        // Retour à la commande en cours de frappe
        if (historyIndex >= commandHistory.length) {
            historyIndex = -1;
            return currentCommand;
        }
        
        return commandHistory[historyIndex] || current;
    }
    
    return current;
}

/**
 * Gère les événements clavier pour l'historique
 * @param {KeyboardEvent} e - Événement clavier
 * @param {string} currentInput - Contenu actuel de l'input
 * @returns {boolean} - true si l'événement a été traité
 */
export function handleHistoryKeydown(e, currentInput) {
    if (e.key === 'ArrowUp') {
        e.preventDefault();
        const command = navigateHistory('up', currentInput);
        if (handleHistoryUp) {
            handleHistoryUp(command);
        }
        return true;
    }
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        const command = navigateHistory('down', currentInput);
        if (handleHistoryDown) {
            handleHistoryDown(command);
        }
        return true;
    }
    
    // Reset de l'index si on tape quelque chose
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete') {
        resetHistoryNavigation();
    }
    
    return false;
}

/**
 * Reset la navigation dans l'historique
 */
export function resetHistoryNavigation() {
    historyIndex = -1;
    currentCommand = '';
}

/**
 * Récupère l'historique complet
 * @returns {Array} - Tableau des commandes
 */
export function getHistory() {
    return [...commandHistory];
}

/**
 * Vide l'historique
 */
export function clearHistory() {
    commandHistory = [];
    historyIndex = -1;
    currentCommand = '';
}

/**
 * Récupère une commande spécifique de l'historique
 * @param {number} index - Index de la commande (négatif pour partir de la fin)
 * @returns {string|null} - Commande ou null si index invalide
 */
export function getHistoryCommand(index) {
    if (index < 0) {
        index = commandHistory.length + index;
    }
    
    if (index >= 0 && index < commandHistory.length) {
        return commandHistory[index];
    }
    
    return null;
}

/**
 * Sauvegarde l'historique (pour persistance)
 * @returns {string} - Historique sérialisé
 */
export function serializeHistory() {
    return JSON.stringify(commandHistory);
}

/**
 * Restaure l'historique (depuis persistance)
 * @param {string} serialized - Historique sérialisé
 */
export function deserializeHistory(serialized) {
    try {
        const restored = JSON.parse(serialized);
        if (Array.isArray(restored)) {
            commandHistory = restored;
            historyIndex = -1;
            currentCommand = '';
        }
    } catch (error) {
        console.warn('Erreur lors de la restauration de l\'historique:', error);
    }
}