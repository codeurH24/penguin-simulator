// test-cases/specs/commands/export/basic.test.js - Tests de base pour export
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdExport } from '../../../../lib/bash-builtins.js';
import { substituteVariablesInArgs } from '../../../../lib/bash-variables.js';

/**
 * Fonction helper qui reproduit le comportement du terminal
 * Applique substituteVariablesInArgs avant d'appeler cmdExport
 */
function executeExportCommand(args, context) {
    // Reproduire le comportement de commandParser.js
    const substitutedArgs = substituteVariablesInArgs(args, context);
    cmdExport(substitutedArgs, context);
}
/**
 * Test de base : export sans arguments (aucune variable)
 */
function testExportNoVariables() {
    clearCaptures();
    const context = createTestContext();
    context.sessionVariables = {};
    
    // Exécuter export (pas de substitution nécessaire pour les args vides)
    executeExportCommand([], context);
    
    // Vérifier la sortie
    const captures = getCaptures();
    assert.captureCount(1, 'export devrait capturer exactement 1 ligne');
    assert.equals(captures[0].text, 'Aucune variable exportée', 'export devrait afficher le message pour aucune variable');
    
    console.log('✅ export sans variables fonctionne');
    return true;
}

/**
 * Test : export VAR=value - définir et exporter une variable
 */
function testExportDefineVariable() {
    clearCaptures();
    const context = createTestContext();
    context.sessionVariables = {};
    
    // Exécuter export VAR=value avec substitution préalable
    executeExportCommand(['TEST_VAR=hello_world'], context);
    
    // Vérifier que la variable est exportée
    assert.equals(context.sessionVariables.TEST_VAR, 'hello_world', 'TEST_VAR devrait être exportée');
    
    // Vérifier qu'il n'y a pas de sortie (silencieux)
    const captures = getCaptures();
    assert.captureCount(0, 'export VAR=value devrait être silencieux');
    
    console.log('✅ export VAR=value fonctionne');
    return true;
}

/**
 * Test : export d'une variable locale existante
 */
function testExportLocalVariable() {
    clearCaptures();
    const context = createTestContext();
    context.sessionVariables = {};
    context.localVariables = { MY_VAR: 'local_value' };
    
    // Exécuter export MY_VAR avec substitution préalable
    executeExportCommand(['MY_VAR'], context);
    
    // Vérifier que la variable locale est exportée
    assert.equals(context.sessionVariables.MY_VAR, 'local_value', 'MY_VAR devrait être exportée');
    assert.isTrue(!context.localVariables.MY_VAR, 'MY_VAR ne devrait plus être locale');
    
    console.log('✅ export de variable locale fonctionne');
    return true;
}

/**
 * Test : affichage des variables exportées
 */
function testExportDisplayVariables() {
    clearCaptures();
    const context = createTestContext();
    context.sessionVariables = {
        PATH: '/usr/bin:/bin',
        HOME: '/root'
    };
    
    // Exécuter export
    executeExportCommand([], context);
    
    // Vérifier la sortie
    const captures = getCaptures();
    assert.isTrue(captures.length >= 2, 'export devrait afficher les 2 variables');
    
    const output = captures.map(c => c.text).join(' ');
    assert.isTrue(output.includes('declare -x HOME="/root"'), 'Devrait afficher HOME');
    assert.isTrue(output.includes('declare -x PATH="/usr/bin:/bin"'), 'Devrait afficher PATH');
    
    console.log('✅ affichage des variables exportées fonctionne');
    return true;
}

/**
 * Test : nom de variable invalide
 */
function testExportInvalidName() {
    clearCaptures();
    const context = createTestContext();
    context.sessionVariables = {};
    
    // Exécuter export avec nom invalide (substitution ne change rien ici)
    executeExportCommand(['123INVALID=value'], context);
    
    // Vérifier l'erreur
    const captures = getCaptures();
    const hasError = captures.some(capture => 
        capture.className === 'error' && 
        capture.text.includes("nom de variable invalide")
    );
    assert.isTrue(hasError, 'Devrait afficher erreur pour nom invalide');
    assert.isTrue(!context.sessionVariables['123INVALID'], 'Variable invalide ne devrait pas être créée');
    
    console.log('✅ gestion nom invalide fonctionne');
    return true;
}

/**
 * Test : export de variable inexistante (crée une variable vide)
 */
function testExportNonexistentVariable() {
    clearCaptures();
    const context = createTestContext();
    context.sessionVariables = {};
    context.localVariables = {};
    
    // Exécuter export NONEXISTENT
    executeExportCommand(['NONEXISTENT'], context);
    
    // Vérifier que la variable est créée vide
    assert.equals(context.sessionVariables.NONEXISTENT, '', 'Variable inexistante devrait être créée vide');
    
    console.log('✅ export de variable inexistante fonctionne');
    return true;
}

/**
 * Test : export avec substitution de variables (IMPORTANT: test corrigé)
 */
function testExportVariableSubstitution() {
    clearCaptures();
    const context = createTestContext();
    context.sessionVariables = {};
    context.variables = { USER: 'root' };  // Variable disponible pour substitution
    
    // IMPORTANT: Le terminal fait la substitution AVANT d'appeler cmdExport
    // On teste avec $USER qui sera substitué par 'root'
    executeExportCommand(['GREETING=Hello $USER'], context);
    
    // Vérifier que la substitution a bien eu lieu
    assert.equals(context.sessionVariables.GREETING, 'Hello root', 'Substitution devrait fonctionner');
    
    console.log('✅ substitution de variables fonctionne');
    return true;
}

/**
 * Test : export de multiples variables
 */
function testExportMultipleVariables() {
    clearCaptures();
    const context = createTestContext();
    context.sessionVariables = {};
    
    // Exécuter export avec plusieurs variables
    executeExportCommand(['VAR1=value1', 'VAR2=value2', 'VAR3=value3'], context);
    
    // Vérifier toutes les variables
    assert.equals(context.sessionVariables.VAR1, 'value1', 'VAR1 devrait être exportée');
    assert.equals(context.sessionVariables.VAR2, 'value2', 'VAR2 devrait être exportée');
    assert.equals(context.sessionVariables.VAR3, 'value3', 'VAR3 devrait être exportée');
    
    console.log('✅ export de multiples variables fonctionne');
    return true;
}

/**
 * Test : export avec valeur vide
 */
function testExportEmptyValue() {
    clearCaptures();
    const context = createTestContext();
    context.sessionVariables = {};
    
    // Exécuter export avec valeur vide
    executeExportCommand(['EMPTY_VAR='], context);
    
    // Vérifier que la variable vide est exportée
    assert.equals(context.sessionVariables.EMPTY_VAR, '', 'Variable vide devrait être exportée');
    
    console.log('✅ export avec valeur vide fonctionne');
    return true;
}

/**
 * Export des tests de base pour export
 */
export const exportBasicTests = [
    createTest('export sans variables', testExportNoVariables),
    createTest('export VAR=value', testExportDefineVariable),
    createTest('export variable locale', testExportLocalVariable),
    createTest('affichage variables exportées', testExportDisplayVariables),
    createTest('nom de variable invalide', testExportInvalidName),
    createTest('export variable inexistante', testExportNonexistentVariable),
    createTest('substitution de variables', testExportVariableSubstitution),
    createTest('export multiples variables', testExportMultipleVariables),
    createTest('export valeur vide', testExportEmptyValue)
];