// modules/terminal/prompt.js
// Gestion du prompt style Debian avec couleurs et variables d'environnement

import { getCurrentUser } from '../users/user.service.js';
import { getPromptElement, getTerminalElement } from './dom.js';
import { addHTMLLine } from './display.js';

/**
 * Récupère les variables d'environnement pour le prompt
 * @param {Object} context - Contexte avec currentPath et variables
 * @returns {Object} - {user, hostname}
 */
function getEnvironmentVars(context = null) {
    const currentUser = getCurrentUser();
    let user = currentUser.username;
    let hostname = 'bash';
    
    if (context) {
        // Variables d'environnement (comme dans bash-variables.js)
        const envVars = {
            'HOME': currentUser.home,
            'PWD': context.getCurrentPath() || '/',
            'USER': currentUser.username,
            'SHELL': currentUser.shell,
            'HOSTNAME': 'bash',
            'PATH': '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
        };
        
        // Récupérer depuis les variables utilisateur d'abord, sinon depuis env
        const variables = context.variables || {};
        user = variables.USER || envVars.USER;
        hostname = variables.HOSTNAME || envVars.HOSTNAME;
    }
    
    return { user, hostname };
}

/**
 * Met à jour l'affichage du prompt avec couleurs Debian
 * @param {string} currentPath - Chemin courant à afficher
 * @param {Object} context - Contexte avec variables d'environnement (optionnel)
 */
export function updatePrompt(currentPath, context = null) {
    const promptElement = getPromptElement();
    if (!promptElement) {
        console.error('Élément prompt non initialisé');
        return;
    }

    const { user, hostname } = getEnvironmentVars(context);
    const displayPath = currentPath === '/' ? '/' : currentPath;
    const promptSymbol = user === 'root' ? '#' : '$';
    
    // Créer le prompt avec HTML coloré style Debian
    promptElement.innerHTML = `<span style="color: #51cf66; font-weight: bold;">${user}@${hostname}</span><span style="color: #ffffff;">:</span><span style="color: #74c0fc; font-weight: bold;">${displayPath}</span><span style="color: #ffffff;">${promptSymbol}</span> `;
}

/**
 * Ajoute une ligne avec le prompt coloré et la commande exécutée
 * @param {string} command - Commande exécutée
 * @param {string} currentPath - Chemin courant
 * @param {Object} context - Contexte avec variables d'environnement (optionnel)
 */
export function addPromptWithCommand(command, currentPath, context = null) {
    const { user, hostname } = getEnvironmentVars(context);
    const displayPath = currentPath === '/' ? '/' : currentPath;
    const promptSymbol = user === 'root' ? '#' : '$';
    
    // Créer la ligne avec le prompt coloré + commande
    const promptHTML = `<span style="color: #51cf66; font-weight: bold;">${user}@${hostname}</span><span style="color: #ffffff;">:</span><span style="color: #74c0fc; font-weight: bold;">${displayPath}</span><span style="color: #ffffff;">${promptSymbol} ${command}</span>`;
    
    addHTMLLine(promptHTML);
}

/**
 * Génère le prompt sous forme de texte brut (pour l'historique)
 * @param {string} currentPath - Chemin courant
 * @param {Object} context - Contexte avec variables d'environnement (optionnel)
 * @returns {string} - Prompt en texte brut
 */
export function getPromptText(currentPath, context = null) {
    const { user, hostname } = getEnvironmentVars(context);
    const displayPath = currentPath === '/' ? '/' : currentPath;
    const promptSymbol = user === 'root' ? '#' : '$';
    
    return `${user}@${hostname}:${displayPath}${promptSymbol}`;
}

/**
 * Exporte les variables d'environnement (pour usage externe)
 * @param {Object} context - Contexte avec variables d'environnement
 * @returns {Object} - Variables d'environnement
 */
export { getEnvironmentVars };