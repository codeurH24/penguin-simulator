// test-cases/specs/commands/cat/basic.test.js - Tests de base pour cat (version corrigée)
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
    
    // Vérifier l'affichage - cat fait UN SEUL appel à outputFn avec tout le contenu
    const captures = getCaptures();
    assert.captureCount(1, 'cat devrait capturer 1 seule sortie avec tout le contenu');
    assert.equals(captures[0].text, 'Hello World\nSecond Line', 'Le contenu complet devrait être affiché en une fois');
    
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
    
    // Vérifier l'affichage - cat fait UN appel par fichier
    const captures = getCaptures();
    assert.captureCount(2, 'cat avec 2 fichiers devrait capturer 2 sorties (une par fichier)');
    assert.equals(captures[0].text, 'Content of file 1', 'Contenu du premier fichier');
    assert.equals(captures[1].text, 'Content of file 2\nSecond line', 'Contenu complet du deuxième fichier');
    
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
    
    // Vérifier l'affichage numéroté - UN SEUL appel avec tout le contenu traité
    const captures = getCaptures();
    assert.captureCount(1, 'cat -n devrait capturer 1 sortie avec tout le contenu numéroté');
    
    const output = captures[0].text;
    assert.isTrue(output.includes('1'), 'Le contenu devrait contenir le numéro de ligne 1');
    assert.isTrue(output.includes('2'), 'Le contenu devrait contenir le numéro de ligne 2');
    assert.isTrue(output.includes('3'), 'Le contenu devrait contenir le numéro de ligne 3');
    assert.isTrue(output.includes('Line 1'), 'Le contenu original devrait être préservé');
    
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
    
    // Vérifier l'affichage avec marqueurs de fin - UN SEUL appel
    const captures = getCaptures();
    assert.captureCount(1, 'cat -E devrait capturer 1 sortie avec marqueurs de fin');
    
    const output = captures[0].text;
    assert.isTrue(output.includes('First line$'), 'La première ligne devrait se terminer par $');
    assert.isTrue(output.includes('Second line'), 'La deuxième ligne devrait être présente');
    
    console.log('✅ cat -E marque les fins de lignes');
    return true;
}

/**
 * Test avec fichier vide
 */
function testCatEmptyFile() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un fichier vide
    testUtils.createTestFile(context, '/root/empty.txt', '');
    
    // Exécuter cat sur le fichier vide
    cmdCat(['empty.txt'], context);
    
    // Vérifier qu'aucune sortie n'est générée pour un fichier vide
    const captures = getCaptures();
    assert.captureCount(0, 'cat sur fichier vide ne devrait rien capturer');
    
    console.log('✅ cat gère correctement les fichiers vides');
    return true;
}

/**
 * Test avec fichier contenant uniquement des nouvelles lignes
 */
function testCatOnlyNewlines() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un fichier avec seulement des nouvelles lignes
    testUtils.createTestFile(context, '/root/newlines.txt', '\n\n\n');
    
    // Exécuter cat
    cmdCat(['newlines.txt'], context);
    
    // Vérifier l'affichage
    const captures = getCaptures();
    assert.captureCount(1, 'cat devrait capturer 1 sortie');
    assert.equals(captures[0].text, '\n\n\n', 'Les nouvelles lignes devraient être préservées');
    
    console.log('✅ cat préserve les nouvelles lignes');
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
    createTest('Option -E (fins de lignes)', testCatOptionE),
    createTest('Fichier vide', testCatEmptyFile),
    createTest('Fichier avec nouvelles lignes', testCatOnlyNewlines)
];