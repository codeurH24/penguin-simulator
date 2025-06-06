// test-cases/system/context.test.js - Tests du contexte d'exécution
import { createTestContext, clearCaptures } from '../../lib/context.js';
import { assert, testUtils } from '../../lib/helpers.js';
import { createTest } from '../../lib/runner.js';

/**
 * Test de base : vérification de l'initialisation du contexte
 */
function testContextInitialization() {
    clearCaptures();
    const context = createTestContext();
    
    // Vérifier que le contexte existe
    assert.isTrue(context !== null, 'Le contexte ne devrait pas être null');
    assert.isTrue(context !== undefined, 'Le contexte ne devrait pas être undefined');
    
    console.log('✅ Contexte correctement initialisé');
    return true;
}

/**
 * Test des propriétés essentielles du contexte
 */
function testContextProperties() {
    clearCaptures();
    const context = createTestContext();
    
    // Vérifier que les propriétés essentielles existent
    assert.isTrue(context.fileSystem !== undefined, 'fileSystem devrait exister');
    assert.isTrue(context.getCurrentPath !== undefined, 'getCurrentPath devrait exister');
    assert.isTrue(typeof context.getCurrentPath === 'function', 'getCurrentPath devrait être une fonction');
    assert.isTrue(context.variables !== undefined, 'variables devrait exister');
    assert.isTrue(context.currentUser !== undefined, 'currentUser devrait exister');
    
    console.log('✅ Propriétés du contexte présentes');
    return true;
}

/**
 * Test des fonctions du contexte
 */
function testContextFunctions() {
    clearCaptures();
    const context = createTestContext();
    
    // Vérifier que les fonctions essentielles existent
    assert.isTrue(typeof context.setCurrentPath === 'function', 'setCurrentPath devrait être une fonction');
    assert.isTrue(typeof context.saveFileSystem === 'function', 'saveFileSystem devrait être une fonction');
    assert.isTrue(typeof context.getCurrentPath === 'function', 'getCurrentPath devrait être une fonction');
    
    // Vérifier les fonctions injectées pour les tests
    assert.isTrue(typeof context.addLine === 'function', 'addLine devrait être injectée');
    assert.isTrue(typeof context.showError === 'function', 'showError devrait être injectée');
    assert.isTrue(typeof context.showSuccess === 'function', 'showSuccess devrait être injectée');
    
    console.log('✅ Fonctions du contexte disponibles');
    return true;
}

/**
 * Test du chemin courant initial
 */
function testInitialCurrentPath() {
    clearCaptures();
    const context = createTestContext();
    
    // Vérifier le chemin courant initial via la méthode
    assert.equals(context.getCurrentPath(), '/root', 'Le chemin courant initial devrait être /root');
    
    console.log('✅ Chemin courant initial correct');
    return true;
}

/**
 * Test des variables du contexte
 */
function testContextVariables() {
    clearCaptures();
    const context = createTestContext();
    
    // Vérifier que variables est un objet
    assert.isTrue(typeof context.variables === 'object', 'variables devrait être un objet');
    assert.isTrue(context.variables !== null, 'variables ne devrait pas être null');
    
    console.log('✅ Variables du contexte initialisées');
    return true;
}

/**
 * Test du changement de chemin courant
 */
function testCurrentPathChange() {
    clearCaptures();
    const context = createTestContext();
    
    // Vérifier le chemin initial
    assert.equals(context.getCurrentPath(), '/root', 'Chemin initial devrait être /root');
    
    // Changer le chemin
    context.setCurrentPath('/home');
    
    // Vérifier le nouveau chemin
    assert.equals(context.getCurrentPath(), '/home', 'Le chemin devrait être changé vers /home');
    
    console.log('✅ Changement de chemin courant fonctionne');
    return true;
}

/**
 * Export des tests du contexte
 */
export const contextTests = [
    createTest('Initialisation du contexte', testContextInitialization),
    createTest('Propriétés du contexte', testContextProperties),
    createTest('Fonctions du contexte', testContextFunctions),
    createTest('Chemin courant initial', testInitialCurrentPath),
    createTest('Variables du contexte', testContextVariables),
    createTest('Changement de chemin courant', testCurrentPathChange)
];