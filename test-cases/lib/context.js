// test-cases/lib/context.js - Infrastructure de contexte de test
import { createContext } from '../../core/context.js';

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
 * Crée un contexte de test avec fonctions de capture injectées
 * @returns {Object} - Contexte de test prêt à utiliser
 */
export function createTestContext() {
    const context = createContext();
    
    // Injecter nos fonctions de capture
    context.addLine = captureAddLine;
    context.showError = captureShowError;
    context.showSuccess = captureShowSuccess;
    
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