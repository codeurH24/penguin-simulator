// modules/backup/filesystem/global-backup.js

import { exportAsDownloadURL } from './export-utils.js';

// Configuration flexible du nom de variable globale
let GLOBAL_TERMINAL_VAR = 'terminal';

/**
 * Configure le nom de la variable globale du terminal
 * @param {string} varName - Nom de la variable (ex: 'terminal', 'terminalService')
 */
function setGlobalTerminalVar(varName) {
    GLOBAL_TERMINAL_VAR = varName;
    console.log(`🔧 Variable globale configurée: window.${varName}`);
}

/**
 * Détecte automatiquement la variable globale du terminal
 * @returns {Object|null} - Context trouvé ou null
 */
function findTerminalContext() {
    // Liste des noms possibles
    const possibleNames = ['terminal', 'terminalService'];
    
    for (const name of possibleNames) {
        if (window[name]?.context) {
            return window[name].context;
        }
    }
    
    // Recherche dans toutes les propriétés de window
    for (const key in window) {
        if (window[key]?.context?.fileSystem) {
            console.log(`📡 Terminal détecté automatiquement: window.${key}`);
            return window[key].context;
        }
    }
    
    return null;
}

/**
 * Récupère le contexte selon la configuration
 * @returns {Object|null} - Context ou null
 */
function getContext() {
    // Essayer la variable configurée d'abord
    if (window[GLOBAL_TERMINAL_VAR]?.context) {
        return window[GLOBAL_TERMINAL_VAR].context;
    }
    
    // Sinon détection automatique
    return findTerminalContext();
}

// Rendre accessible globalement dès l'import
if (typeof window !== 'undefined') {
    console.log('window.saveFilesystem() disponible !');
    
    /**
     * Sauvegarde complète du filesystem
     */
    window.saveFilesystem = (path = '/', filename = null) => {
        const context = getContext();
        
        if (!context) {
            console.error('❌ Contexte non disponible. Vérifiez que le terminal est initialisé.');
            console.error('💡 Utilisez window.setGlobalTerminalVar("nom") pour configurer.');
            return;
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const defaultFilename = `filesystem-${timestamp}.json`;

        // Fix pour path racine - exporter tout le filesystem
        let exportPath = path;
        if (path === '/') {
            exportPath = Object.keys(context.fileSystem);
        }
            
        return exportAsDownloadURL(
            context.fileSystem, 
            path, 
            filename || defaultFilename
        );
    };
    
    /**
     * Configure le nom de la variable globale
     */
    window.setGlobalTerminalVar = setGlobalTerminalVar;
    

    
} else {
    console.error('window.saveFilesystem() indisponible !');
}