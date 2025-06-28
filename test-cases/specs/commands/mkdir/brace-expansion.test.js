// test-cases/specs/commands/mkdir/brace-expansion.test.js
// Tests de l'expansion des braces pour mkdir

import { createTestContext, clearCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdMkdir } from '../../../../bin/mkdir/mkdir.js';
import { expandBraces, parseCommandLine } from '../../../../lib/bash-parser.js';

/**
 * Fonction utilitaire pour vérifier l'égalité de deux tableaux
 * @param {Array} actual - Tableau actuel
 * @param {Array} expected - Tableau attendu
 * @param {string} message - Message d'erreur
 */
function assertArrayEquals(actual, expected, message) {
    assert.equals(JSON.stringify(actual), JSON.stringify(expected), message);
}

/**
 * Test de l'expansion basique des braces
 */
function testBasicBraceExpansion() {
    // Test de la fonction expandBraces directement
    const input = ['project/src/{js,css}', 'project/docs'];
    const result = expandBraces(input);
    
    assertArrayEquals(result, [
        'project/src/js',
        'project/src/css', 
        'project/docs'
    ], 'L\'expansion des braces devrait créer les bonnes combinaisons');
}

/**
 * Test de l'expansion des braces avec parseCommandLine
 */
function testParseCommandLineWithBraces() {
    const input = 'mkdir -p project/src/{js,css} project/docs';
    const result = parseCommandLine(input);
    
    assertArrayEquals(result, [
        'mkdir',
        '-p',
        'project/src/js',
        'project/src/css',
        'project/docs'
    ], 'parseCommandLine devrait automatiquement faire l\'expansion des braces');
}

/**
 * Test de mkdir avec expansion des braces
 */
function testMkdirWithBraceExpansion() {
    clearCaptures();
    const context = createTestContext();
    
    // Simuler la commande: mkdir -p project/src/{js,css} project/docs
    const args = ['-p', 'project/src/js', 'project/src/css', 'project/docs'];
    
    cmdMkdir(args, context);
    
    // Vérifier que tous les répertoires ont été créés
    assert.isDirectory(context, '/root/project/src/js', 'Le répertoire project/src/js devrait exister');
    assert.isDirectory(context, '/root/project/src/css', 'Le répertoire project/src/css devrait exister');
    assert.isDirectory(context, '/root/project/docs', 'Le répertoire project/docs devrait exister');
    assert.isDirectory(context, '/root/project/src', 'Le répertoire parent project/src devrait exister');
    assert.isDirectory(context, '/root/project', 'Le répertoire parent project devrait exister');
}

/**
 * Test avec des braces multiples
 */
function testMultipleBraces() {
    const input = ['app/{src,test}/{js,css}'];
    const result = expandBraces(input);
    
    assertArrayEquals(result, [
        'app/src/js',
        'app/src/css',
        'app/test/js', 
        'app/test/css'
    ], 'Les braces multiples devraient s\'étendre correctement');
}

/**
 * Test avec braces sans expansion (pas de braces)
 */
function testNoBraces() {
    const input = ['project/src/js', 'project/src/css'];
    const result = expandBraces(input);
    
    assertArrayEquals(result, [
        'project/src/js',
        'project/src/css'
    ], 'Les arguments sans braces devraient rester inchangés');
}

/**
 * Test avec braces vides ou malformées
 */
function testMalformedBraces() {
    const input1 = ['project/src/{}'];
    const result1 = expandBraces(input1);
    assertArrayEquals(result1, ['project/src/'], 'Les braces vides devraient donner une chaîne vide');
    
    const input2 = ['project/src/{js'];
    const result2 = expandBraces(input2);
    assertArrayEquals(result2, ['project/src/{js'], 'Les braces non fermées devraient rester inchangées');
}

/**
 * Test d'intégration complet avec le terminal
 */
function testFullIntegrationMkdir() {
    clearCaptures();
    const context = createTestContext();
    
    // Simuler une vraie commande du terminal avec expansion
    const commandLine = 'mkdir -p web/{assets,src}/{js,css,img} docs';
    const parts = parseCommandLine(commandLine);
    
    // Extraire la commande et les arguments
    const cmd = parts[0]; // 'mkdir'
    const args = parts.slice(1); // tout le reste
    
    assert.equals(cmd, 'mkdir', 'La commande devrait être mkdir');
    assert.equals(args[0], '-p', 'Le premier argument devrait être -p');
    
    // Vérifier que l'expansion a bien eu lieu
    const expectedArgs = [
        '-p',
        'web/assets/js',
        'web/assets/css', 
        'web/assets/img',
        'web/src/js',
        'web/src/css',
        'web/src/img',
        'docs'
    ];
    
    assertArrayEquals(args, expectedArgs, 'L\'expansion des braces imbriquées devrait fonctionner');
    
    // Exécuter mkdir avec les arguments expandés
    cmdMkdir(args, context);
    
    // Vérifier que tous les répertoires existent
    assert.isDirectory(context, '/root/web/assets/js', 'web/assets/js devrait exister');
    assert.isDirectory(context, '/root/web/assets/css', 'web/assets/css devrait exister');
    assert.isDirectory(context, '/root/web/assets/img', 'web/assets/img devrait exister');
    assert.isDirectory(context, '/root/web/src/js', 'web/src/js devrait exister');
    assert.isDirectory(context, '/root/web/src/css', 'web/src/css devrait exister');
    assert.isDirectory(context, '/root/web/src/img', 'web/src/img devrait exister');
    assert.isDirectory(context, '/root/docs', 'docs devrait exister');
}

// Export des tests
export const braceExpansionTests = [
    createTest('Basic brace expansion', testBasicBraceExpansion),
    createTest('parseCommandLine with braces', testParseCommandLineWithBraces),
    createTest('mkdir with brace expansion', testMkdirWithBraceExpansion),
    createTest('Multiple braces expansion', testMultipleBraces),
    createTest('No braces (passthrough)', testNoBraces),
    createTest('Malformed braces', testMalformedBraces),
    createTest('Full integration mkdir with braces', testFullIntegrationMkdir)
];