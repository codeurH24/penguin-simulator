// test-cases/specs/bash/variables.test.js - Tests pour les variables bash
import { createTestContext, clearCaptures, getCaptures } from '../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../lib/helpers.js';
import { createTest } from '../../lib/runner.js';
import { executeCommand } from '../../../bin/bash.js';
import { 
    handleVariableAssignment, 
    substituteVariables,
    isVariableAssignment,
    getEnvironmentVariables,
    substituteVariablesInArgs
} from '../../../lib/bash-variables.js';

/**
 * Test de détection d'assignation de variable
 */
function testIsVariableAssignment() {
    clearCaptures();
    
    // Tests positifs
    assert.isTrue(isVariableAssignment('var=value'), 'var=value devrait être détecté comme assignation');
    assert.isTrue(isVariableAssignment('MY_VAR=test'), 'MY_VAR=test devrait être détecté comme assignation');
    assert.isTrue(isVariableAssignment('var123=hello'), 'var123=hello devrait être détecté comme assignation');
    assert.isTrue(isVariableAssignment('empty='), 'empty= devrait être détecté comme assignation');
    assert.isTrue(isVariableAssignment('var=value=with=equals'), 'var=value=with=equals devrait être détecté comme assignation');
    
    // Tests négatifs
    assert.isFalse(isVariableAssignment('var = value'), 'var = value ne devrait pas être détecté (espaces)');
    assert.isFalse(isVariableAssignment('123var=value'), '123var=value ne devrait pas être détecté (commence par chiffre)');
    assert.isFalse(isVariableAssignment('echo hello'), 'echo hello ne devrait pas être détecté');
    assert.isFalse(isVariableAssignment(''), 'chaîne vide ne devrait pas être détectée');
    
    console.log('✅ Détection d\'assignation de variable fonctionne');
    return true;
}

/**
 * Test de création d'une variable simple
 */
function testSimpleVariableAssignment() {
    clearCaptures();
    const context = createTestContext();
    
    // Vérifier qu'aucune variable utilisateur n'existe au départ
    assert.isTrue(context.variables === undefined || context.variables.maVariable === undefined, 'maVariable ne devrait pas exister au départ');
    
    // Créer une variable via handleVariableAssignment
    handleVariableAssignment('maVariable=1', context);
    
    // Vérifier que la variable a été créée
    assert.isTrue(context.variables !== undefined, 'L\'objet variables devrait être créé');
    assert.isTrue(context.variables.maVariable !== undefined, 'La variable maVariable devrait exister');
    assert.equals(context.variables.maVariable, '1', 'La variable devrait avoir la valeur "1"');
    
    console.log('✅ Création de variable simple fonctionne');
    return true;
}

/**
 * Test de création de plusieurs variables
 */
function testMultipleVariableAssignments() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer plusieurs variables
    handleVariableAssignment('var1=hello', context);
    handleVariableAssignment('var2=world', context);
    handleVariableAssignment('number=42', context);
    
    // Vérifier que toutes les variables ont été créées
    assert.equals(context.variables.var1, 'hello', 'var1 devrait valoir "hello"');
    assert.equals(context.variables.var2, 'world', 'var2 devrait valoir "world"');
    assert.equals(context.variables.number, '42', 'number devrait valoir "42"');
    
    console.log('✅ Création de plusieurs variables fonctionne');
    return true;
}

/**
 * Test de variable avec valeur vide
 */
function testEmptyVariable() {
    clearCaptures();
    const context = createTestContext();
    
    // Variable vide
    handleVariableAssignment('empty=', context);
    
    // Vérifier que la variable existe mais est vide
    assert.isTrue(context.variables.empty !== undefined, 'La variable empty devrait exister');
    assert.equals(context.variables.empty, '', 'La variable devrait être vide');
    
    console.log('✅ Variable vide fonctionne');
    return true;
}

/**
 * Test de variable avec valeur contenant des égals
 */
function testVariableWithEquals() {
    clearCaptures();
    const context = createTestContext();
    
    // Variable avec plusieurs égals dans la valeur
    handleVariableAssignment('config=key=value=test', context);
    
    // Vérifier que tout après le premier = est considéré comme la valeur
    assert.equals(context.variables.config, 'key=value=test', 'La variable devrait contenir "key=value=test"');
    
    console.log('✅ Variable avec égals dans la valeur fonctionne');
    return true;
}

/**
 * Test de substitution de variable simple
 */
function testSimpleVariableSubstitution() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer une variable
    context.variables = { test: 'bonjour' };
    
    // Tester la substitution
    const result = substituteVariables('$test', context);
    assert.equals(result, 'bonjour', 'La variable $test devrait être substituée par "bonjour"');
    
    console.log('✅ Substitution de variable simple fonctionne');
    return true;
}

/**
 * Test de substitution de variable avec accolades
 */
function testBracketVariableSubstitution() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer une variable
    context.variables = { nom: 'Claude' };
    
    // Tester la substitution avec accolades
    const result = substituteVariables('${nom}', context);
    assert.equals(result, 'Claude', 'La variable ${nom} devrait être substituée par "Claude"');
    
    console.log('✅ Substitution avec accolades fonctionne');
    return true;
}

/**
 * Test de substitution de variable inexistante
 */
function testNonexistentVariableSubstitution() {
    clearCaptures();
    const context = createTestContext();
    
    // Initialiser variables comme objet vide
    context.variables = {};
    
    // Tester la substitution d'une variable inexistante
    const result = substituteVariables('$inexistante', context);
    assert.equals(result, '', 'Une variable inexistante devrait donner une chaîne vide');
    
    console.log('✅ Variable inexistante devient chaîne vide');
    return true;
}

/**
 * Test des variables d'environnement prédéfinies
 */
function testEnvironmentVariables() {
    clearCaptures();
    const context = createTestContext();
    
    // Obtenir les variables d'environnement
    const envVars = getEnvironmentVariables(context);
    
    // Vérifier les variables d'environnement essentielles
    assert.equals(envVars.HOME, '/root', '$HOME devrait valoir /root');
    assert.equals(envVars.PWD, '/root', '$PWD devrait valoir /root');
    assert.equals(envVars.USER, 'root', '$USER devrait valoir root');
    assert.equals(envVars.SHELL, '/bin/bash', '$SHELL devrait valoir /bin/bash');
    assert.equals(envVars.UID, '0', '$UID devrait valoir 0');
    assert.equals(envVars.GID, '0', '$GID devrait valoir 0');
    assert.isTrue(envVars.PATH.includes('/bin'), '$PATH devrait contenir /bin');
    
    console.log('✅ Variables d\'environnement prédéfinies fonctionnent');
    return true;
}

/**
 * Test de substitution de variables d'environnement
 */
function testEnvironmentVariableSubstitution() {
    clearCaptures();
    const context = createTestContext();
    
    // Tester la substitution de HOME
    const homeResult = substituteVariables('$HOME', context);
    assert.equals(homeResult, '/root', '$HOME devrait être substitué par /root');
    
    // Tester la substitution de PWD
    const pwdResult = substituteVariables('$PWD', context);
    assert.equals(pwdResult, '/root', '$PWD devrait être substitué par /root');
    
    // Tester la substitution de USER
    const userResult = substituteVariables('$USER', context);
    assert.equals(userResult, 'root', '$USER devrait être substitué par root');
    
    console.log('✅ Substitution des variables d\'environnement fonctionne');
    return true;
}

/**
 * Test de substitution dans un tableau d'arguments
 */
function testSubstituteVariablesInArgs() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer des variables
    context.variables = { 
        file1: 'document.txt',
        file2: 'readme.md' 
    };
    
    // Tester la substitution dans un tableau d'arguments
    const args = ['ls', '$file1', '$file2', '$HOME'];
    const result = substituteVariablesInArgs(args, context);
    
    assert.equals(result[0], 'ls', 'Premier argument devrait rester "ls"');
    assert.equals(result[1], 'document.txt', 'Deuxième argument devrait être substitué');
    assert.equals(result[2], 'readme.md', 'Troisième argument devrait être substitué');
    assert.equals(result[3], '/root', 'Quatrième argument devrait être substitué par $HOME');
    
    console.log('✅ Substitution dans tableau d\'arguments fonctionne');
    return true;
}

/**
 * Test de substitution complexe avec texte mixte
 */
function testComplexVariableSubstitution() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer des variables
    context.variables = { 
        name: 'test',
        ext: 'txt'
    };
    
    // Tester la substitution dans une chaîne complexe
    const result = substituteVariables('file_$name.$ext', context);
    assert.equals(result, 'file_test.txt', 'Substitution complexe devrait fonctionner');
    
    // Tester avec accolades pour éviter l'ambiguïté
    const result2 = substituteVariables('${name}_backup.${ext}', context);
    assert.equals(result2, 'test_backup.txt', 'Substitution avec accolades devrait fonctionner');
    
    console.log('✅ Substitution complexe fonctionne');
    return true;
}

/**
 * Test de remplacement de variable existante
 */
function testVariableOverwrite() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer une variable
    handleVariableAssignment('counter=1', context);
    assert.equals(context.variables.counter, '1', 'counter devrait valoir "1"');
    
    // La remplacer
    handleVariableAssignment('counter=2', context);
    assert.equals(context.variables.counter, '2', 'counter devrait maintenant valoir "2"');
    
    // Vérifier avec substitution
    const result = substituteVariables('$counter', context);
    assert.equals(result, '2', 'La variable devrait avoir la nouvelle valeur');
    
    console.log('✅ Remplacement de variable fonctionne');
    return true;
}

/**
 * Test de variable avec caractères spéciaux dans le nom
 */
function testVariableWithSpecialCharacters() {
    clearCaptures();
    const context = createTestContext();
    
    // Variable avec underscore (valide)
    handleVariableAssignment('my_var=test', context);
    assert.equals(context.variables.my_var, 'test', 'Variable avec underscore devrait fonctionner');
    
    // Variable avec nombre dans le nom (valide)
    handleVariableAssignment('var123=test', context);
    assert.equals(context.variables.var123, 'test', 'Variable avec nombre devrait fonctionner');
    
    // Vérifier la substitution
    const result1 = substituteVariables('$my_var', context);
    assert.equals(result1, 'test', 'Substitution avec underscore devrait fonctionner');
    
    const result2 = substituteVariables('$var123', context);
    assert.equals(result2, 'test', 'Substitution avec nombre devrait fonctionner');
    
    console.log('✅ Variables avec caractères spéciaux fonctionnent');
    return true;
}

/**
 * Test de intégration avec executeCommand
 */
function testIntegrationWithExecuteCommand() {
    clearCaptures();
    const context = createTestContext();
    
    // Tester l'assignation via executeCommand
    executeCommand('testVar=integration', context);
    
    // Vérifier que la variable a été créée
    assert.isTrue(context.variables.testVar !== undefined, 'testVar devrait être créée via executeCommand');
    assert.equals(context.variables.testVar, 'integration', 'testVar devrait avoir la bonne valeur');
    
    console.log('✅ Intégration avec executeCommand fonctionne');
    return true;
}

/**
 * Export des tests pour les variables bash
 */
export const bashVariablesTests = [
    createTest('Détection assignation variable', testIsVariableAssignment),
    createTest('Création variable simple', testSimpleVariableAssignment),
    createTest('Création variables multiples', testMultipleVariableAssignments),
    createTest('Variable vide', testEmptyVariable),
    createTest('Variable avec égals', testVariableWithEquals),
    createTest('Substitution variable simple', testSimpleVariableSubstitution),
    createTest('Substitution avec accolades', testBracketVariableSubstitution),
    createTest('Variable inexistante', testNonexistentVariableSubstitution),
    createTest('Variables d\'environnement', testEnvironmentVariables),
    createTest('Substitution variables environnement', testEnvironmentVariableSubstitution),
    createTest('Substitution dans arguments', testSubstituteVariablesInArgs),
    createTest('Substitution complexe', testComplexVariableSubstitution),
    createTest('Remplacement de variable', testVariableOverwrite),
    createTest('Variables caractères spéciaux', testVariableWithSpecialCharacters),
    createTest('Intégration executeCommand', testIntegrationWithExecuteCommand)
];