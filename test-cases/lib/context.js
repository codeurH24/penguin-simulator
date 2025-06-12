
// test-cases/lib/context.js - Infrastructure de contexte de test utilisant les vraies fonctions
import { createDefaultContext, addContextMethods } from '../../core/basic-context.js';
import { initUserSystem } from '../../modules/users/user.service.js';

// Variable globale pour capturer les sorties
let capturedOutputs = [];

// Fonctions de capture pour remplacer les vraies fonctions terminal
function captureAddLine(text, className = '') {
    capturedOutputs.push({ text, className });
    console.log(`[CAPTURE] ${className ? `[${className}] ` : ''}${text}`);
}

function captureShowError(message) {
    capturedOutputs.push({ text: message, className: 'error' });
    console.log(`[CAPTURE ERROR] ${message}`);
}

function captureShowSuccess(message) {
    capturedOutputs.push({ text: message, className: 'success' });
    console.log(`[CAPTURE SUCCESS] ${message}`);
}

/**
 * Crée un contexte de test utilisant VOS VRAIES FONCTIONS
 * Reproduit exactement les mêmes étapes que createAndSaveContext() mais sans DB
 * @returns {Object} - Contexte de test avec vraie structure
 */
export function createTestContext() {
    // Étape 1: Utiliser votre vraie fonction de création de contexte
    const context = createDefaultContext();
    
    // Étape 2: Initialiser les fichiers système (comme dans votre vrai code)
    initUserSystem(context.fileSystem, () => {});
    
    // Étape 3: Modifier saveFileSystem pour éviter la persistance en mode test
    const originalSaveFileSystem = context.saveFileSystem;
    context.saveFileSystem = function() {
        console.log('[TEST MODE] saveFileSystem() appelé - pas de sauvegarde DB');
        return Promise.resolve(true);
    };
    
    // Étape 4: Injecter les fonctions de capture pour les tests
    context.addLine = captureAddLine;
    context.showError = captureShowError;
    context.showSuccess = captureShowSuccess;
    context.test = true;
    
    return context;
}

/**
 * Vide les captures précédentes
 */
export function clearCaptures() {
    capturedOutputs = [];
}

/**
 * Récupère les captures actuelles
 * @returns {Array} - Liste des sorties capturées
 */
export function getCaptures() {
    return [...capturedOutputs];
}

/**
 * Affiche les captures pour debug
 */
export function showCaptures() {
    console.log(`Nombre de lignes capturées: ${capturedOutputs.length}`);
    if (capturedOutputs.length > 0) {
        console.log('Contenu capturé:');
        capturedOutputs.forEach((output, index) => {
            console.log(`  ${index}: "${output.text}" [classe: ${output.className || 'aucune'}]`);
        });
    }
}