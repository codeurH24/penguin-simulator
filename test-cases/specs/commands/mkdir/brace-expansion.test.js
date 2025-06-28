// test-cases/specs/commands/mkdir/brace-expansion.test.js - Tests des brace expansions pour mkdir

import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdMkdir } from '../../../../bin/mkdir/mkdir.js';
import { expandBraces, expandAllBraces } from '../../../../lib/bash-parser.js';

/**
 * Helper pour vérifier que deux tableaux sont identiques
 */
function assertArrayEquals(actual, expected, message) {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    
    if (actualStr !== expectedStr) {
        console.log('FAIL:', message);
        console.log('Expected:', expected);
        console.log('Actual:', actual);
        throw new Error(`${message}. Attendu: ${expectedStr}, Reçu: ${actualStr}`);
    }
}

/**
 * Test de DEBUG des fonctions d'expansion avant les vrais tests
 */
function testDebugBraceExpansion() {
    console.log('🐛 === DEBUG BRACE EXPANSION ===');
    
    // Debug 1: Vérifier si les fonctions existent
    console.log('\n1. Vérification des fonctions:');
    console.log('expandBraces type:', typeof expandBraces);
    console.log('expandAllBraces type:', typeof expandAllBraces);
    
    // Debug 2: Test simple
    console.log('\n2. Test expandBraces simple:');
    const test1 = expandBraces('project/{src,docs}');
    console.log('Input: "project/{src,docs}"');
    console.log('Output:', test1);
    console.log('Output type:', typeof test1);
    console.log('Is array:', Array.isArray(test1));
    
    // Debug 3: Test du cas qui échoue avec plus de détails
    console.log('\n3. Test du cas qui échoue:');
    const input = 'project/{src/{js,css},docs}';
    console.log('Input:', input);
    
    // Décortiquer manuellement
    const openIndex = input.indexOf('{');
    const closeIndex = input.indexOf('}', openIndex);
    const prefix = input.substring(0, openIndex);
    const suffix = input.substring(closeIndex + 1);
    const braceContent = input.substring(openIndex + 1, closeIndex);
    
    console.log('  - openIndex:', openIndex, '(char:', input[openIndex], ')');
    console.log('  - closeIndex:', closeIndex, '(char:', input[closeIndex], ')');
    console.log('  - prefix:', JSON.stringify(prefix));
    console.log('  - suffix:', JSON.stringify(suffix));
    console.log('  - braceContent:', JSON.stringify(braceContent));
    
    // Test de splitBraceContent
    const options = splitBraceContent(braceContent);
    console.log('  - options après split:', options);
    
    const test2 = expandBraces(input);
    console.log('Output:', test2);
    console.log('Expected: ["project/src/js","project/src/css","project/docs"]');
    
    // Debug 4: Test expandAllBraces
    console.log('\n4. Test expandAllBraces:');
    const test3 = expandAllBraces(['project/{src,docs}']);
    console.log('Input: ["project/{src,docs}"]');
    console.log('Output:', test3);
    
    console.log('\n=== FIN DEBUG ===\n');
    return true;
}

/**
 * Test de base des brace expansions (tests unitaires de la fonction)
 */
function testBasicBraceExpansion() {
    clearCaptures();
    
    // Test simple
    console.log('🧪 Test 1: Expansion simple');
    const result1 = expandBraces('project/{src,docs}');
    const expected1 = ['project/src', 'project/docs'];
    assertArrayEquals(result1, expected1, 'Expansion simple devrait fonctionner');
    
    // Test imbriqué 
    console.log('🧪 Test 2: Expansion imbriquée');
    const result2 = expandBraces('project/src/{js,css}');
    const expected2 = ['project/src/js', 'project/src/css'];
    assertArrayEquals(result2, expected2, 'Expansion imbriquée devrait fonctionner');
    
    // Test complexe
    console.log('🧪 Test 3: Expansion complexe');
    const result3 = expandBraces('project/{src/{js,css},docs}');
    const expected3 = ['project/src/js', 'project/src/css', 'project/docs'];
    assertArrayEquals(result3, expected3, 'L\'expansion des braces devrait créer les bonnes combinaisons');
    
    // Test sans braces
    console.log('🧪 Test 4: Sans braces');
    const result4 = expandBraces('simple-folder');
    const expected4 = ['simple-folder'];
    assertArrayEquals(result4, expected4, 'Pattern sans braces devrait rester inchangé');
    
    console.log('✅ Tests unitaires des brace expansions réussis');
    return true;
}

/**
 * Test d'expansion de plusieurs arguments
 */
function testExpandAllBraces() {
    clearCaptures();
    
    const args = ['project/{src,docs}', 'simple', '{a,b}/{c,d}'];
    const result = expandAllBraces(args);
    const expected = ['project/src', 'project/docs', 'simple', 'a/c', 'a/d', 'b/c', 'b/d'];
    
    assertArrayEquals(result, expected, 'Expansion de tous les arguments devrait fonctionner');
    
    console.log('✅ Test d\'expansion de tous les arguments réussi');
    return true;
}

/**
 * Test mkdir avec brace expansion simple
 */
function testMkdirSimpleBraceExpansion() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer project/{src,docs} avec -p
    cmdMkdir(['-p', 'project/{src,docs}'], context);
    
    // Vérifier que tous les dossiers ont été créés
    assert.fileExists(context, '/root/project/src', 'project/src devrait être créé');
    assert.fileExists(context, '/root/project/docs', 'project/docs devrait être créé');
    
    assert.isDirectory(context, '/root/project/src', 'project/src devrait être un dossier');
    assert.isDirectory(context, '/root/project/docs', 'project/docs devrait être un dossier');
    
    console.log('✅ mkdir avec brace expansion simple réussi');
    return true;
}

/**
 * Test mkdir avec brace expansion imbriquée
 */
function testMkdirNestedBraceExpansion() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer project/{src/{js,css},docs}
    cmdMkdir(['-p', 'project/{src/{js,css},docs}'], context);
    
    // Vérifier tous les dossiers créés
    assert.fileExists(context, '/root/project/src/js', 'project/src/js devrait être créé');
    assert.fileExists(context, '/root/project/src/css', 'project/src/css devrait être créé');
    assert.fileExists(context, '/root/project/docs', 'project/docs devrait être créé');
    
    // Vérifier que ce sont des dossiers
    assert.isDirectory(context, '/root/project/src/js', 'project/src/js devrait être un dossier');
    assert.isDirectory(context, '/root/project/src/css', 'project/src/css devrait être un dossier');
    assert.isDirectory(context, '/root/project/docs', 'project/docs devrait être un dossier');
    
    console.log('✅ mkdir avec brace expansion imbriquée réussi');
    return true;
}

/**
 * Test mkdir avec plusieurs patterns de braces
 */
function testMkdirMultipleBracePatterns() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer project/{src,docs} config/{dev,prod} avec -p
    cmdMkdir(['-p', 'project/{src,docs}', 'config/{dev,prod}'], context);
    
    // Vérifier tous les dossiers créés
    assert.fileExists(context, '/root/project/src', 'project/src devrait être créé');
    assert.fileExists(context, '/root/project/docs', 'project/docs devrait être créé');
    assert.fileExists(context, '/root/config/dev', 'config/dev devrait être créé');
    assert.fileExists(context, '/root/config/prod', 'config/prod devrait être créé');
    
    console.log('✅ mkdir avec plusieurs patterns de braces réussi');
    return true;
}

/**
 * Test mkdir avec mélange de patterns avec et sans braces
 */
function testMkdirMixedPatterns() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer simple {a,b}/nested normal/{x,y}
    cmdMkdir(['-p', 'simple', '{a,b}/nested', 'normal/{x,y}'], context);
    
    assert.fileExists(context, '/root/simple', 'simple devrait être créé');
    assert.fileExists(context, '/root/a/nested', 'a/nested devrait être créé');
    assert.fileExists(context, '/root/b/nested', 'b/nested devrait être créé');
    assert.fileExists(context, '/root/normal/x', 'normal/x devrait être créé');
    assert.fileExists(context, '/root/normal/y', 'normal/y devrait être créé');
    
    console.log('✅ mkdir avec patterns mixtes réussi');
    return true;
}

/**
 * Export des tests de brace expansion pour mkdir
 */
export const braceExpansionTests = [
    createTest('Tests unitaires brace expansion', testBasicBraceExpansion),
    createTest('Expansion de tous les arguments', testExpandAllBraces),
    createTest('mkdir brace expansion simple', testMkdirSimpleBraceExpansion),
    createTest('mkdir brace expansion imbriquée', testMkdirNestedBraceExpansion),
    createTest('mkdir patterns multiples', testMkdirMultipleBracePatterns),
    createTest('mkdir patterns mixtes', testMkdirMixedPatterns)
];