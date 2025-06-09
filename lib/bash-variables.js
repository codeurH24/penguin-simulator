// lib/bash-variables.js - Gestion des variables bash
// Module pour les assignations et substitutions de variables

import { showError } from '../modules/terminal/terminal.js';

/**
 * Vérifie si une chaîne est une assignation de variable (var=value)
 * @param {string} str - Chaîne à vérifier
 * @returns {boolean} - true si c'est une assignation
 */
export function isVariableAssignment(str) {
    return /^[a-zA-Z_][a-zA-Z0-9_]*=.*$/.test(str);
}

/**
 * Gère l'assignation d'une variable
 * @param {string} assignment - Assignation (var=value)
 * @param {Object} context - Contexte avec variables
 */
export function handleVariableAssignment(assignment, context) {
    const { variables } = context;
    const errorFn = context?.showError || showError;
    
    const equalIndex = assignment.indexOf('=');
    if (equalIndex === -1) {
        errorFn(`bash: assignation invalide '${assignment}'`);
        return;
    }
    
    const varName = assignment.substring(0, equalIndex);
    const value = assignment.substring(equalIndex + 1);
    
    // Valider le nom de variable
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
        errorFn(`bash: '${varName}': nom de variable invalide`);
        return;
    }
    
    // Substituer les variables dans la valeur
    const resolvedValue = substituteVariables(value, context);
    
    // Assigner la variable
    variables[varName] = resolvedValue;
    
    // Sauvegarder si possible
    if (context.saveFileSystem) {
        context.saveFileSystem();
    }
}

/**
 * Substitue les variables dans une chaîne ($VAR, ${VAR})
 * @param {string} str - Chaîne avec variables
 * @param {Object} context - Contexte avec variables
 * @returns {string} - Chaîne avec variables substituées
 */
export function substituteVariables(str, context) {
    const { variables = {} } = context;
    
    // Variables d'environnement système
    const envVars = {
        'HOME': '/root',
        'PWD': context.getCurrentPath ? context.getCurrentPath() : '/root',
        'USER': 'root',
        'UID': '0',
        'GID': '0',
        'SHELL': '/bin/bash',
        'PATH': '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
    };
    
    // Substitution des variables $VAR et ${VAR}
    return str.replace(/\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}|\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, braced, unbraced) => {
        const varName = braced || unbraced;
        
        // Priorité: variables utilisateur, puis variables d'environnement
        if (variables.hasOwnProperty(varName)) {
            return variables[varName];
        } else if (envVars.hasOwnProperty(varName)) {
            return envVars[varName];
        } else {
            return ''; // Variable non définie = chaîne vide
        }
    });
}

/**
 * Récupère les variables d'environnement
 * @param {Object} context - Contexte avec variables
 * @returns {Object} - Variables d'environnement
 */
export function getEnvironmentVariables(context) {
    const { variables = {} } = context;
    
    return {
        'HOME': '/root',
        'PWD': context.getCurrentPath ? context.getCurrentPath() : '/root',
        'USER': 'root',
        'UID': '0',
        'GID': '0', 
        'SHELL': '/bin/bash',
        'PATH': '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
        ...variables
    };
}

/**
 * Substitue les variables dans un tableau d'arguments
 * @param {Array} args - Arguments à traiter
 * @param {Object} context - Contexte avec variables
 * @returns {Array} - Arguments avec variables substituées
 */
export function substituteVariablesInArgs(args, context) {
    return args.map(arg => substituteVariables(arg, context));
}