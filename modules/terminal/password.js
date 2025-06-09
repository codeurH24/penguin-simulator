// modules/terminal/password.js
// Gestion du mode saisie password sécurisé

import { getPromptElement, getCommandInputElement } from './dom.js';
import { showError } from './display.js';

// État pour la saisie de mot de passe
let passwordMode = {
    active: false,
    step: 'current', // 'current' | 'password' | 'confirm'
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    username: '',
    requireOldPassword: false,
    verifyOldPasswordCallback: null,
    callback: null,
    originalPrompt: '',
    attempts: 0,
    maxAttempts: 3,
    accountHasValidPassword: true
};

/**
 * Démarre la saisie de mot de passe
 * @param {Object} options - Configuration du mode password
 * @param {string} options.username - Nom d'utilisateur
 * @param {boolean} options.requireOldPassword - Si l'ancien mot de passe est requis
 * @param {Function} options.verifyOldPasswordCallback - Callback de vérification ancien mot de passe
 * @param {Function} options.callback - Callback final
 * @param {boolean} options.accountHasValidPassword - Si le compte a un mot de passe valide
 */
export function startPasswordInput(options) {
    const {
        username,
        requireOldPassword = false,
        verifyOldPasswordCallback = null,
        callback,
        accountHasValidPassword = true
    } = options;

    const promptElement = getPromptElement();
    const commandInput = getCommandInputElement();
    
    if (!promptElement || !commandInput) {
        console.error('Éléments DOM non initialisés pour le mode password');
        return false;
    }

    // Sauvegarder l'état actuel
    passwordMode.originalPrompt = promptElement.innerHTML;
    passwordMode.active = true;
    passwordMode.username = username;
    passwordMode.requireOldPassword = requireOldPassword;
    passwordMode.verifyOldPasswordCallback = verifyOldPasswordCallback;
    passwordMode.callback = callback;
    passwordMode.attempts = 0;
    passwordMode.accountHasValidPassword = accountHasValidPassword;
    passwordMode.maxAttempts = accountHasValidPassword ? 3 : 1;

    // Déterminer l'étape initiale
    if (requireOldPassword) {
        passwordMode.step = 'current';
        promptElement.innerHTML = 'Current password: ';
    } else {
        passwordMode.step = 'password';
        promptElement.innerHTML = 'New password: ';
    }

    // Configuration du champ input pour masquer la saisie
    commandInput.type = 'password';
    commandInput.value = '';
    commandInput.focus();

    return true;
}

/**
 * Gère la saisie en mode password
 * @param {KeyboardEvent} e - Événement clavier
 * @returns {boolean} - true si l'événement a été traité
 */
export function handlePasswordInput(e) {
    if (!passwordMode.active) return false;

    const commandInput = getCommandInputElement();
    const promptElement = getPromptElement();
    
    if (!commandInput || !promptElement) return false;

    if (e.key === 'Enter') {
        e.preventDefault();
        const value = commandInput.value;
        commandInput.value = '';

        switch (passwordMode.step) {
            case 'current':
                handleCurrentPasswordStep(value);
                break;
            case 'password':
                handleNewPasswordStep(value);
                break;
            case 'confirm':
                handleConfirmPasswordStep(value);
                break;
        }
        return true;
    }

    if (e.key === 'Escape') {
        e.preventDefault();
        cancelPasswordInput();
        return true;
    }

    return true; // Bloquer toutes les autres touches en mode password
}

/**
 * Gère l'étape de saisie du mot de passe actuel
 * @param {string} value - Mot de passe saisi
 */
function handleCurrentPasswordStep(value) {
    const promptElement = getPromptElement();
    
    passwordMode.currentPassword = value;
    passwordMode.attempts++;

    // Vérifier l'ancien mot de passe
    if (passwordMode.verifyOldPasswordCallback) {
        const isValid = passwordMode.verifyOldPasswordCallback(
            passwordMode.username, 
            value
        );
        
        if (isValid) {
            // Passer à l'étape suivante
            passwordMode.step = 'password';
            promptElement.innerHTML = 'New password: ';
        } else {
            if (passwordMode.attempts >= passwordMode.maxAttempts) {
                showError('passwd: Authentication failure');
                cancelPasswordInput();
                return;
            }
            showError('Sorry, try again.');
            promptElement.innerHTML = 'Current password: ';
        }
    } else {
        // Pas de vérification, passer directement
        passwordMode.step = 'password';
        promptElement.innerHTML = 'New password: ';
    }
}

/**
 * Gère l'étape de saisie du nouveau mot de passe
 * @param {string} value - Nouveau mot de passe
 */
function handleNewPasswordStep(value) {
    const promptElement = getPromptElement();
    
    passwordMode.newPassword = value;
    passwordMode.step = 'confirm';
    promptElement.innerHTML = 'Confirm new password: ';
}

/**
 * Gère l'étape de confirmation du mot de passe
 * @param {string} value - Confirmation du mot de passe
 */
function handleConfirmPasswordStep(value) {
    passwordMode.confirmPassword = value;
    
    if (passwordMode.newPassword === passwordMode.confirmPassword) {
        // Mots de passe identiques, succès
        const result = {
            success: true,
            oldPassword: passwordMode.currentPassword,
            newPassword: passwordMode.newPassword,
            username: passwordMode.username
        };
        
        exitPasswordMode();
        
        if (passwordMode.callback) {
            passwordMode.callback(result);
        }
    } else {
        // Mots de passe différents
        showError('Sorry, passwords do not match.');
        resetPasswordInput();
    }
}

/**
 * Remet à zéro la saisie de mot de passe (recommence)
 */
function resetPasswordInput() {
    const promptElement = getPromptElement();
    
    passwordMode.newPassword = '';
    passwordMode.confirmPassword = '';
    
    if (passwordMode.requireOldPassword) {
        passwordMode.step = 'current';
        promptElement.innerHTML = 'Current password: ';
    } else {
        passwordMode.step = 'password';
        promptElement.innerHTML = 'New password: ';
    }
}

/**
 * Annule la saisie de mot de passe
 */
export function cancelPasswordInput() {
    if (passwordMode.callback) {
        passwordMode.callback({ success: false, cancelled: true });
    }
    exitPasswordMode();
}

/**
 * Sort du mode password et restaure l'état normal
 */
function exitPasswordMode() {
    const promptElement = getPromptElement();
    const commandInput = getCommandInputElement();
    
    if (promptElement) {
        promptElement.innerHTML = passwordMode.originalPrompt;
    }
    
    if (commandInput) {
        commandInput.type = 'text';
        commandInput.value = '';
        commandInput.focus();
    }
    
    // Reset de l'état
    passwordMode.active = false;
    passwordMode.step = 'current';
    passwordMode.currentPassword = '';
    passwordMode.newPassword = '';
    passwordMode.confirmPassword = '';
    passwordMode.username = '';
    passwordMode.requireOldPassword = false;
    passwordMode.verifyOldPasswordCallback = null;
    passwordMode.callback = null;
    passwordMode.originalPrompt = '';
    passwordMode.attempts = 0;
}

/**
 * Vérifie si le mode password est actif
 * @returns {boolean}
 */
export function isPasswordMode() {
    return passwordMode.active;
}

/**
 * Récupère l'état actuel du mode password
 * @returns {Object}
 */
export function getPasswordState() {
    return { ...passwordMode };
}