// modules/terminal/display.js
// Gestion de l'affichage du terminal (lignes, messages, formatage)

import { getTerminalElement } from './dom.js';
let currentLine = null;

/**
 * Ajoute une ligne de texte au terminal
 * @param {string} text - Texte à afficher
 * @param {string} className - Classe CSS optionnelle
 */
export function addLine(text, className = '') {
    const terminal = getTerminalElement();
    if (!terminal) {
        console.error('Terminal non initialisé');
        return;
    }

    const line = document.createElement('div');
    line.className = `line ${className}`;
    line.textContent = text;

    const inputContainer = document.querySelector('.input-container');
    terminal.insertBefore(line, inputContainer);
    terminal.scrollTop = terminal.scrollHeight;
}

/**
 * Ajoute une ligne avec contenu HTML
 * @param {string} html - Contenu HTML à afficher
 * @param {string} className - Classe CSS optionnelle
 */
export function addHTMLLine(html, className = '') {
    const terminal = getTerminalElement();
    if (!terminal) {
        console.error('Terminal non initialisé');
        return;
    }

    const line = document.createElement('div');
    line.className = `line ${className}`;
    line.innerHTML = html;

    const inputContainer = document.querySelector('.input-container');
    terminal.insertBefore(line, inputContainer);
    terminal.scrollTop = terminal.scrollHeight;
}

/**
 * Efface tout le contenu du terminal
 */
export function clearTerminal() {
    const terminal = getTerminalElement();
    if (!terminal) {
        console.error('Terminal non initialisé');
        return;
    }

    const lines = terminal.querySelectorAll('.line');
    lines.forEach(line => line.remove());
}

/**
 * Affiche un message d'aide formaté
 * @param {Array} helpLines - Lignes d'aide à afficher
 */
export function showHelp(helpLines) {
    helpLines.forEach(line => {
        addLine(line);
    });
}

/**
 * Affiche un message d'erreur
 * @param {string} message - Message d'erreur
 */
export function showError(message) {
    addLine(message, 'error');
}

/**
 * Affiche un message de succès
 * @param {string} message - Message de succès
 */
export function showSuccess(message) {
    addLine(message, 'success');
}

/**
 * Affiche un message d'information
 * @param {string} message - Message d'information
 */
export function showInfo(message) {
    addLine(message, 'info');
}

/**
 * Affiche un listing de fichiers/dossiers
 * @param {Array} items - Liste des éléments à afficher
 * @param {Function} isDirectory - Fonction pour tester si un élément est un dossier
 */
export function showListing(items, isDirectory) {
    if (items.length === 0) {
        addLine('(dossier vide)');
        return;
    }

    items.forEach(item => {
        const name = item.split('/').pop();
        if (isDirectory(item)) {
            addLine(name + '/', 'directory');
        } else {
            addLine(name);
        }
    });
}

/**
 * Scroll automatique vers le bas du terminal
 */
export function scrollToBottom() {
    const terminal = getTerminalElement();
    if (terminal) {
        terminal.scrollTop = terminal.scrollHeight;
    }
}

/**
 * Écrit du texte sur la ligne actuelle sans sauter de ligne
 * @param {string} text - Texte à écrire
 */
export function write(text) {
    const terminal = getTerminalElement();
    if (!terminal) {
        console.error('Terminal non initialisé');
        return;
    }

    if (!currentLine) {
        currentLine = document.createElement('div');
        currentLine.className = 'line';
        const inputContainer = document.querySelector('.input-container');
        terminal.insertBefore(currentLine, inputContainer);
    }

    // Crée un span pour garder le style inline
    const span = document.createElement('span');
    span.textContent = text;
    currentLine.appendChild(span);
    terminal.scrollTop = terminal.scrollHeight;
}

/**
 * Force une nouvelle ligne (à utiliser après des write() pour simuler addLine)
 */
export function flushLine(className = '') {
    const terminal = getTerminalElement();
    if (!terminal || !currentLine) return;

    currentLine.className = 'line';
    if (className) currentLine.classList.add(className);

    const inputContainer = document.querySelector('.input-container');
    terminal.insertBefore(currentLine, inputContainer);

    terminal.scrollTop = terminal.scrollHeight;

    currentLine = null;
}