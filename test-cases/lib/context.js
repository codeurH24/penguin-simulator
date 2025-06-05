// test-cases/lib/context.js - Infrastructure de contexte de test (version améliorée)
import { createContext } from '../../core/context.js';
// import _ from 'https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/lodash.js';

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
 * NOUVEAU: Force toujours le chemin initial à /root pour des tests propres
 * @returns {Object} - Contexte de test prêt à utiliser
 */
export function createTestContext() {
    const testContext = createContext({ testMode: true });
    
    testContext.addLine = captureAddLine;
    testContext.showError = captureShowError;
    testContext.showSuccess = captureShowSuccess;
    testContext.test = true;
    
    return testContext;
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