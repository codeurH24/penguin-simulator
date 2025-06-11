// test-cases/specs/bash/export.test.js - Tests pour la commande export
import { createTestContext, clearCaptures, getCaptures } from '../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../lib/helpers.js';
import { createTest } from '../../lib/runner.js';
import { executeCommand } from '../../../bin/bash.js';
import { cmdExport } from '../../../lib/bash-builtins.js';
import { 
    handleVariableAssignment, 
    substituteVariables
} from '../../../lib/bash-variables.js';

/**
 * Test d'export avec assignation directe
 */
function testExportWithAssignment() {
    clearCaptures();
    const context = createTestContext();
    
    // Exporter une variable avec assignation
    cmdExport(['TEST_VAR=hello'], context);
    
    // Vérifier que la variable est dans sessionVariables
    assert.isTrue(context.sessionVariables !== undefined, 'sessionVariables devrait être créé');
    assert.equals(context.sessionVariables.TEST_VAR, 'hello', 'TEST_VAR devrait être exportée avec la valeur "hello"');
    
    console.log('✅ Export avec assignation fonctionne');
    return true;
}

/**
 * Test d'export d'une variable locale existante
 */
function testExportLocalVariable() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer d'abord une variable locale
    handleVariableAssignment('LOCAL_VAR=test', context);
    assert.equals(context.localVariables.LOCAL_VAR, 'test', 'Variable locale devrait être créée');
    
    // Exporter la variable locale
    cmdExport(['LOCAL_VAR'], context);
    
    // Vérifier que la variable est maintenant dans sessionVariables
    assert.equals(context.sessionVariables.LOCAL_VAR, 'test', 'Variable devrait être exportée vers session');
    assert.isTrue(context.localVariables.LOCAL_VAR === undefined, 'Variable ne devrait plus être locale');
    
    console.log('✅ Export de variable locale fonctionne');
    return true;
}

/**
 * Test d'export de variable inexistante
 */
function testExportNonexistentVariable() {
    clearCaptures();
    const context = createTestContext();
    
    // Exporter une variable qui n'existe pas
    cmdExport(['NONEXISTENT'], context);
    
    // Vérifier qu'elle est créée vide
    assert.equals(context.sessionVariables.NONEXISTENT, '', 'Variable inexistante devrait être créée vide');
    
    console.log('✅ Export de variable inexistante fonctionne');
    return true;
}

/**
 * Test d'affichage des variables exportées
 */
function testExportList() {
    clearCaptures();
    const context = createTestContext();
    
    // Exporter quelques variables
    cmdExport(['VAR1=value1'], context);
    cmdExport(['VAR2=value2'], context);
    
    clearCaptures();
    // Lister les variables exportées
    cmdExport([], context);
    
    const captures = getCaptures();
    assert.isTrue(captures.length >= 2, 'Devrait afficher au moins 2 variables exportées');
    
    // Vérifier le format d'affichage
    const output = captures.map(c => c.text).join('\n');
    assert.isTrue(output.includes('declare -x VAR1="value1"'), 'Devrait afficher VAR1');
    assert.isTrue(output.includes('declare -x VAR2="value2"'), 'Devrait afficher VAR2');
    
    console.log('✅ Affichage des variables exportées fonctionne');
    return true;
}

/**
 * Test de substitution avec variables exportées
 */
function testSubstitutionWithExportedVariables() {
    clearCaptures();
    const context = createTestContext();
    
    // Exporter une variable
    cmdExport(['EXPORTED_VAR=exported_value'], context);
    
    // Tester la substitution
    const result = substituteVariables('$EXPORTED_VAR', context);
    assert.equals(result, 'exported_value', 'Substitution de variable exportée devrait fonctionner');
    
    console.log('✅ Substitution avec variables exportées fonctionne');
    return true;
}

/**
 * Test de priorité des variables (locale > session > env)
 */
function testVariablePriority() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer une variable d'environnement
    if (!context.variables) context.variables = {};
    context.variables.PRIORITY_VAR = 'env_value';
    
    // Exporter une variable de session avec le même nom
    cmdExport(['PRIORITY_VAR=session_value'], context);
    
    // Créer une variable locale avec le même nom
    handleVariableAssignment('PRIORITY_VAR=local_value', context);
    
    // Tester la priorité: locale > session > env
    const result = substituteVariables('$PRIORITY_VAR', context);
    assert.equals(result, 'local_value', 'Variable locale devrait avoir la priorité');
    
    console.log('✅ Priorité des variables fonctionne');
    return true;
}

/**
 * Test d'export avec substitution de variables
 */
function testExportWithVariableSubstitution() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer une variable locale
    handleVariableAssignment('BASE=hello', context);
    
    // Exporter avec substitution
    cmdExport(['COMPOSED=$BASE-world'], context);
    
    // Vérifier que la substitution a eu lieu
    assert.equals(context.sessionVariables.COMPOSED, 'hello-world', 'Substitution dans export devrait fonctionner');
    
    console.log('✅ Export avec substitution fonctionne');
    return true;
}

/**
 * Test de nom de variable invalide
 */
function testInvalidVariableName() {
    clearCaptures();
    const context = createTestContext();
    
    // Tenter d'exporter avec un nom invalide
    cmdExport(['123INVALID=value'], context);
    
    const captures = getCaptures();
    assert.isTrue(captures.some(c => c.text.includes('nom de variable invalide')), 'Devrait afficher une erreur pour nom invalide');
    
    console.log('✅ Validation des noms de variables fonctionne');
    return true;
}

/**
 * Export des tests pour export
 */
export const exportTests = [
    createTest('Export avec assignation', testExportWithAssignment),
    createTest('Export variable locale', testExportLocalVariable),
    createTest('Export variable inexistante', testExportNonexistentVariable),
    createTest('Affichage variables exportées', testExportList),
    createTest('Substitution variables exportées', testSubstitutionWithExportedVariables),
    createTest('Priorité des variables', testVariablePriority),
    createTest('Export avec substitution', testExportWithVariableSubstitution),
    createTest('Nom de variable invalide', testInvalidVariableName)
];