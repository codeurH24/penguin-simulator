// test-cases/specs/commands/cat/basic.test.js - Tests de base pour cat
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdCat } from '../../../../bin/cat.js';

/**
 * Test d'affichage du contenu d'un fichier simple
 */
function testCatSimpleFile() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un fichier avec du contenu
    testUtils.createTestFile(context, '/root/test.txt', 'Hello World\nSecond Line');
    
    // Exécuter cat
    cmdCat(['test.txt'], context);
    
    // Vérifier l'affichage
    const captures = getCaptures();
    assert.captureCount(2, 'cat devrait capturer 2 lignes');
    assert.equals(captures[0].text, 'Hello World', 'Première ligne devrait être "Hello World"');
    assert.equals(captures[1].text, 'Second Line', 'Deuxième ligne devrait être "Second Line"');
    
    console.log('✅ cat affiche le contenu d\'un fichier simple');
    return true;
}

/**
 * Test d'erreur pour fichier inexistant
 */
function testCatNonexistentFile() {
    clearCaptures();
    const context = createTestContext();
    
    // Essayer de cat un fichier inexistant
    cmdCat(['nonexistent.txt'], context);
    
    // Vérifier qu'une erreur a été capturée
    const captures = getCaptures();
    const hasError = captures.some(capture => 
        capture.className === 'error' && capture.text.includes('Fichier introuvable')
    );
    
    assert.isTrue(hasError, 'Une erreur devrait être affichée pour un fichier inexistant');
    
    console.log('✅ cat gère correctement les fichiers inexistants');
    return true;
}

/**
 * Test d'erreur sans arguments
 */
function testCatNoArguments() {
    clearCaptures();
    const context = createTestContext();
    
    // Appeler cat sans arguments
    cmdCat([], context);
    
    // Vérifier qu'une erreur a été capturée
    const captures = getCaptures();
    const hasError = captures.some(capture => 
        capture.className === 'error' && capture.text.includes('lecture depuis stdin non supportée')
    );
    
    assert.isTrue(hasError, 'Une erreur devrait être affichée sans arguments');
    
    console.log('✅ cat affiche une erreur sans arguments');
    return true;
}

/**
 * Test avec plusieurs fichiers
 */
function testCatMultipleFiles() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer plusieurs fichiers avec du contenu
    testUtils.createTestFile(context, '/root/file1.txt', 'Content of file 1');
    testUtils.createTestFile(context, '/root/file2.txt', 'Content of file 2\nSecond line');
    
    // Exécuter cat avec plusieurs fichiers
    cmdCat(['file1.txt', 'file2.txt'], context);
    
    // Vérifier l'affichage
    const captures = getCaptures();
    assert.captureCount(3, 'cat avec 2 fichiers devrait capturer 3 lignes au total');
    assert.equals(captures[0].text, 'Content of file 1', 'Première ligne du premier fichier');
    assert.equals(captures[1].text, 'Content of file 2', 'Première ligne du deuxième fichier');
    assert.equals(captures[2].text, 'Second line', 'Deuxième ligne du deuxième fichier');
    
    console.log('✅ cat concatène plusieurs fichiers');
    return true;
}

/**
 * Test avec option -n (numérotation des lignes)
 */
function testCatOptionN() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un fichier avec plusieurs lignes
    testUtils.createTestFile(context, '/root/numbered.txt', 'Line 1\nLine 2\nLine 3');
    
    // Exécuter cat avec option -n
    cmdCat(['-n', 'numbered.txt'], context);
    
    // Vérifier l'affichage numéroté
    const captures = getCaptures();
    assert.captureCount(3, 'cat -n devrait capturer 3 lignes');
    assert.isTrue(captures[0].text.includes('1'), 'Première ligne devrait être numérotée 1');
    assert.isTrue(captures[1].text.includes('2'), 'Deuxième ligne devrait être numérotée 2');
    assert.isTrue(captures[2].text.includes('3'), 'Troisième ligne devrait être numérotée 3');
    assert.isTrue(captures[0].text.includes('Line 1'), 'Le contenu devrait être préservé');
    
    console.log('✅ cat -n numérote les lignes');
    return true;
}

/**
 * Test avec option -E (marquer fin de lignes)
 */
function testCatOptionE() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un fichier avec plusieurs lignes
    testUtils.createTestFile(context, '/root/endlines.txt', 'First line\nSecond line');
    
    // Exécuter cat avec option -E
    cmdCat(['-E', 'endlines.txt'], context);
    
    // Vérifier l'affichage avec marqueurs de fin
    const captures = getCaptures();
    assert.captureCount(2, 'cat -E devrait capturer 2 lignes');
    assert.isTrue(captures[0].text.includes('First line$'), 'Première ligne devrait se terminer par $');
    assert.equals(captures[1].text, 'Second line', 'Dernière ligne ne devrait pas avoir de $ (pas de \\n suivant)');
    
    console.log('✅ cat -E marque les fins de lignes');
    return true;
}

/**
 * Export des tests de base pour cat
 */
export const catBasicTests = [
    createTest('Affichage fichier simple', testCatSimpleFile),
    createTest('Fichier inexistant (erreur)', testCatNonexistentFile),
    createTest('Sans arguments (erreur)', testCatNoArguments),
    createTest('Plusieurs fichiers', testCatMultipleFiles),
    createTest('Option -n (numérotation)', testCatOptionN),
    createTest('Option -E (fins de lignes)', testCatOptionE)
];