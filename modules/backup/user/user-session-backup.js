// modules/backup/user/user-session-backup.js
// Fonctions de sauvegarde/restauration de la session utilisateur

import { cmdUseradd } from "../../../bin/useradd.js";
import { getCurrentUser, switchUser } from "../../users/current-user.js";
import { parsePasswdFile } from '../../users/user.service.js';

// Rendre accessible globalement dès l'import
if (typeof window !== 'undefined') {
    console.log('window.saveSession() disponible !');
    window.saveSession = () => {
        
        const context = window.terminal?.context;
        
        if (!context) {
            console.error('❌ Contexte non disponible. Initialisez d\'abord l\'application.');
            return;
        }
        return saveUserSessionAsDownload(context);
    };
} else  {
    console.log('window.saveSession() indisponible !');
}

/**
 * Exporte la session utilisateur complète
 * @param {Object} context - Contexte de l'application
 * @returns {Object} - Données de session au format JSON
 */
export function exportUserSession(context) {
    const currentUser = getCurrentUser();
    
    const sessionData = {
        // Métadonnées
        exportDate: new Date().toISOString(),
        version: "1.0",
        
        // Chemin courant
        currentPath: context.getCurrentPath(),
        
        // Utilisateur courant et pile de session
        currentUser: currentUser,
        userStack: context.userStack || [], // Pile des utilisateurs (su)
        
        // Variables d'environnement
        variables: {
            environment: context.variables || {},
            session: context.sessionVariables || {},
            shell: context.shellVariables || {},
            local: context.localVariables || {}
        },
        
        // Historique des commandes
        commandHistory: context.commandHistory || [],
        
        // Configuration shell
        shellConfig: {
            promptFormat: context.promptFormat || null,
            shellOptions: context.shellOptions || {}
        }
    };
    
    return sessionData;
}

/**
 * Exporte la session utilisateur et lance le téléchargement
 * @param {Object} context - Contexte de l'application
 * @param {string} filename - Nom du fichier (optionnel)
 */
export function saveUserSessionAsDownload(context, filename = null) {
    const currentUser = getCurrentUser();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const defaultFilename = `session-${currentUser.username}-${timestamp}.json`;
    
    const sessionData = exportUserSession(context);
    const jsonContent = JSON.stringify(sessionData, null, 2);
    
    // Créer le blob et lancer le téléchargement
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || defaultFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log(`💾 Session sauvegardée: ${link.download}`);
    return link.download;
}

/**
 * Charge une session depuis un fichier JSON uploadé
 * @param {Object} context - Contexte de l'application
 * @param {File} file - Fichier JSON à charger
 * @param {Object} options - Options de chargement
 * @returns {Promise} - Promesse de chargement
 */
export async function loadUserSessionFromFile(context, file, options = {}) {
    if (!file || file.type !== 'application/json') {
        throw new Error('Veuillez sélectionner un fichier JSON valide');
    }
    
    try {
        const content = await file.text();
        const sessionData = JSON.parse(content);
        
        loadUserSession(context, sessionData, options);
        console.log(`📂 Session chargée depuis: ${file.name}`);
        
    } catch (error) {
        console.error(`❌ Erreur lors du chargement: ${error.message}`);
        throw error;
    }
}

/**
 * Réinitialise la session utilisateur à l'état par défaut
 * @param {Object} context - Contexte de l'application
 * @param {Object} options - Options de réinitialisation
 */
export function resetUserSession(context, options = {}) {
    const { 
        keepCurrentUser = true, 
        keepCurrentPath = false,
        keepHistory = false 
    } = options;
    
    const currentUser = getCurrentUser();
    
    console.log(`🔄 Réinitialisation de la session...`);
    
    // Réinitialiser les variables
    context.variables = {
        'HOME': currentUser.username === 'root' ? '/root' : `/home/${currentUser.username}`,
        'USER': currentUser.username,
        'SHELL': '/bin/bash',
        'PATH': '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
    };
    context.sessionVariables = {};
    context.shellVariables = {};
    context.localVariables = {};
    
    // Réinitialiser le chemin si demandé
    if (!keepCurrentPath) {
        const homePath = currentUser.username === 'root' ? '/root' : `/home/${currentUser.username}`;
        context.setCurrentPath(homePath);
        console.log(`📁 Chemin réinitialisé: ${homePath}`);
    }
    
    // Réinitialiser l'historique si demandé
    if (!keepHistory) {
        context.commandHistory = [];
        console.log(`📜 Historique effacé`);
    }
    
    // Réinitialiser la pile d'utilisateurs
    context.userStack = [];
    
    // Réinitialiser la configuration shell
    context.promptFormat = null;
    context.shellOptions = {};
    
    console.log(`✅ Session réinitialisée`);
}

/**
 * Affiche un résumé de la session courante
 * @param {Object} context - Contexte de l'application
 */
export function showUserSessionInfo(context) {
    const currentUser = getCurrentUser();
    const term = context.terminal;
    
    term.write(`\r\n📊 Informations de session:\r\n`);
    term.write(`👤 Utilisateur: ${currentUser.username}\r\n`);
    term.write(`📁 Chemin: ${context.getCurrentPath()}\r\n`);
    term.write(`👥 Pile utilisateurs: ${(context.userStack || []).length} niveaux\r\n`);
    
    const envCount = Object.keys(context.variables || {}).length;
    const sessionCount = Object.keys(context.sessionVariables || {}).length;
    const shellCount = Object.keys(context.shellVariables || {}).length;
    const localCount = Object.keys(context.localVariables || {}).length;
    
    term.write(`🔧 Variables: ${envCount} env, ${sessionCount} session, ${shellCount} shell, ${localCount} local\r\n`);
    term.write(`📜 Historique: ${(context.commandHistory || []).length} commandes\r\n`);
}

/**
 * Charge une session utilisateur depuis des données JSON
 * @param {Object} context - Contexte de l'application
 * @param {Object} sessionData - Données de session à charger
 * @param {Object} options - Options de chargement
 */
export function loadUserSession(context, sessionData, options = {}) {
    const { 
        overwriteVariables = true, 
        preserveCurrentUser = false,
        preserveCurrentPath = false,
        force = false
    } = options;
    
    if (!sessionData || typeof sessionData !== 'object') {
        throw new Error('Données de session invalides');
    }
    
    console.log(`📦 Chargement session du ${sessionData.exportDate}`);
    
    // Restaurer l'utilisateur courant
    if (!preserveCurrentUser && sessionData.currentUser) {
        const username = sessionData.currentUser.username;
        const userHome = sessionData.currentUser.home;
        
        // Vérifier si l'utilisateur existe dans /etc/passwd
        const users = parsePasswdFile(context.fileSystem);
        const userExists = users.some(u => u.username === username);
        
        if (!userExists) {
            if (force) {
                console.log(`🔧 Création automatique de l'utilisateur '${username}' avec useradd -m`);
                try {
                    cmdUseradd(['-m', username], context);
                    console.log(`✅ Utilisateur '${username}' créé automatiquement`);
                } catch (error) {
                    console.error(`❌ Erreur création utilisateur: ${error.message}`);
                    throw error;
                }
            } else {
                throw new Error(`L'utilisateur '${username}' n'existe pas dans /etc/passwd. Utilisez { force: true } pour forcer.`);
            }
        } else {
            // Vérifier si le dossier home existe
            if (!context.fileSystem[userHome]) {
                if (force) {
                    console.log(`🏠 Création du dossier home manquant: ${userHome}`);
                    const now = new Date();
                    context.fileSystem[userHome] = {
                        type: 'dir',
                        size: 4096,
                        created: now,
                        modified: now,
                        accessed: now,
                        permissions: 'drwxr-xr-x',
                        owner: username,
                        group: username,
                        links: 2
                    };
                    console.log(`✅ Dossier home ${userHome} créé`);
                } else {
                    throw new Error(`Le dossier home '${userHome}' n'existe pas. Utilisez { force: true } pour forcer.`);
                }
            }
        }
        
        try {
            switchUser(username, context.fileSystem);
            context.currentUser = sessionData.currentUser;
            console.log(`👤 Utilisateur restauré: ${username}`);
        } catch (error) {
            console.error(`❌ Erreur restauration utilisateur: ${error.message}`);
            throw error;
        }
    }
    
    // Restaurer le chemin courant
    if (!preserveCurrentPath && sessionData.currentPath) {
        context.setCurrentPath(sessionData.currentPath);
        console.log(`📁 Chemin restauré: ${sessionData.currentPath}`);
    }
    
    // Restaurer les variables d'environnement
    if (overwriteVariables && sessionData.variables) {
        if (sessionData.variables.environment) {
            context.variables = { ...context.variables, ...sessionData.variables.environment };
        }
        if (sessionData.variables.session) {
            context.sessionVariables = { ...context.sessionVariables, ...sessionData.variables.session };
        }
        if (sessionData.variables.shell) {
            context.shellVariables = { ...context.shellVariables, ...sessionData.variables.shell };
        }
        if (sessionData.variables.local) {
            context.localVariables = { ...context.localVariables, ...sessionData.variables.local };
        }
        console.log(`🔧 Variables restaurées`);
    }
    
    // Restaurer l'historique des commandes
    if (sessionData.commandHistory) {
        context.commandHistory = [...(sessionData.commandHistory || [])];
        console.log(`📜 Historique restauré (${context.commandHistory.length} commandes)`);
    }
    
    // Restaurer la pile d'utilisateurs (pour su)
    if (sessionData.userStack) {
        context.userStack = [...sessionData.userStack];
        console.log(`👥 Pile utilisateurs restaurée (${context.userStack.length} niveaux)`);
    }
    
    console.log(`✅ Session utilisateur chargée avec succès`);
}

/**
 * Wrapper pour charger une session depuis une URL
 * @param {Object} context - Contexte de l'application
 * @param {string} url - URL du fichier JSON de session
 * @param {Object} options - Options de chargement
 * @returns {Promise} - Promesse de chargement
 */
export async function fetchLoadUserSession(context, url, options = {}) {
    try {
        console.log(`🌐 Téléchargement session depuis: ${url}`);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const sessionData = await response.json();
        loadUserSession(context, sessionData, options);
        
    } catch (error) {
        console.error(`❌ Erreur lors du chargement: ${error.message}`);
        throw error;
    }
}