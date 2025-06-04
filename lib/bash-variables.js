// bin/bash-variables.js - Gestion des variables du shell bash
// Module pour l'assignation et la substitution des variables

import { showError } from '../modules/terminal.js';
import { getCurrentUser } from '../modules/users.js';

/**
 * Gère l'assignation de variables (var=value)
 * @param {string} assignment - Assignation (format var=value)
 * @param {Object} context - Contexte d'exécution
 */
export function handleVariableAssignment(assignment, context) {
    const [varName, ...valueParts] = assignment.split('=');
    const value = valueParts.join('='); // Rejoindre au cas où la valeur contient des =
    
    if (!varName) {
        showError('bash: assignation de variable invalide');
        return;
    }
    
    // Stocker la variable dans le contexte
    if (!context.variables) {
        context.variables = {};
    }
    
    context.variables[varName] = value;
    // Pas de sortie pour les assignations de variables (comme le vrai bash)
}

/**
 * Substitue les variables dans un argument ($var, ${var})
 * @param {string} arg - Argument pouvant contenir des variables
 * @param {Object} context - Contexte contenant les variables
 * @returns {string} - Argument avec variables substituées
 */
export function substituteVariables(arg, context) {
    if (!arg.includes('$')) {
        return arg; // Pas de variable, retourner tel quel
    }
    
    const variables = context.variables || {};
    
    // Variables d'environnement prédéfinies (mises à jour dynamiquement)
    const envVars = getEnvironmentVariables(context);
    
    let result = arg;
    
    // Substituer les variables ${var} (format complet)
    result = result.replace(/\$\{([^}]+)\}/g, (match, varName) => {
        return variables[varName] || envVars[varName] || '';
    });
    
    // Substituer les variables $var (format simple)
    result = result.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, varName) => {
        return variables[varName] || envVars[varName] || '';
    });
    
    return result;
}

/**
 * Obtient les variables d'environnement prédéfinies
 * @param {Object} context - Contexte contenant currentPath
 * @returns {Object} - Objet des variables d'environnement
 */
export function getEnvironmentVariables(context) {
    const currentUser = getCurrentUser();
    return {
        'HOME': currentUser.home,
        'PWD': context.currentPath || '/',
        'USER': currentUser.username,
        'SHELL': currentUser.shell,
        'HOSTNAME': 'bash',
        'UID': currentUser.uid.toString(),
        'GID': currentUser.gid.toString(),
        'PATH': '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
    };
}

/**
 * Vérifie si une chaîne est une assignation de variable
 * @param {string} str - Chaîne à vérifier
 * @returns {boolean} - true si c'est une assignation de variable
 */
export function isVariableAssignment(str) {
    // Vérifier le format var=value (pas d'espaces autour du =)
    return /^[a-zA-Z_][a-zA-Z0-9_]*=.*$/.test(str);
}

/**
 * Substitue les variables dans un tableau d'arguments
 * @param {Array} args - Arguments à traiter
 * @param {Object} context - Contexte contenant les variables
 * @returns {Array} - Arguments avec variables substituées
 */
export function substituteVariablesInArgs(args, context) {
    return args.map(arg => substituteVariables(arg, context));
}

/**
 * Affiche toutes les variables (pour debug)
 * @param {Object} context - Contexte contenant les variables
 */
export function debugVariables(context) {
    const userVars = context.variables || {};
    const envVars = getEnvironmentVariables(context);
    
    console.log('Variables utilisateur:', userVars);
    console.log('Variables d\'environnement:', envVars);
}