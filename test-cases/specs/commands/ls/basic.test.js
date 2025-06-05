// test-cases/commands/ls/basic.test.js - Tests de base pour ls
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdLs } from '../../../../bin/ls.js';

/**
 * Test de base : ls dans un dossier vide
 */
function testEmptyDirectory() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un dossier vraiment vide pour le test
    testUtils.createTestDirectory(context, '/root/empty-test-dir');
    
    // Lister le contenu du dossier vide
    cmdLs(['empty-test-dir'], context);
    
    // Dans un dossier vide, ls ne devrait rien afficher (comme le vrai ls)
    const captures = getCaptures();
    
    // Vérifier qu'aucune ligne n'a été capturée
    assert.equals(captures.length, 0, 'ls dans un dossier vide ne devrait capturer aucune ligne');
    
    console.log('✅ ls fonctionne correctement dans un dossier vide');
    return true;
}

/**
 * Test de ls avec des fichiers et dossiers
 */
function testWithContent() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer du contenu de test
    testUtils.createTestDirectory(context, '/root/folder1');
    testUtils.createTestDirectory(context, '/root/documents');
    testUtils.createTestFile(context, '/root/file1.txt', 'contenu test');
    testUtils.createTestFile(context, '/root/readme.md', 'documentation');
    
    // Exécuter ls
    cmdLs([], context);
    
    const captures = getCaptures();
    const outputText = captures.map(c => c.text).join(' ');
    
    // Vérifier que les éléments créés apparaissent dans la sortie
    assert.isTrue(outputText.includes('folder1/'), 'folder1/ devrait apparaître (avec / pour les dossiers)');
    assert.isTrue(outputText.includes('documents/'), 'documents/ devrait apparaître (avec / pour les dossiers)');
    assert.isTrue(outputText.includes('file1.txt'), 'file1.txt devrait apparaître');
    assert.isTrue(outputText.includes('readme.md'), 'readme.md devrait apparaître');
    
    console.log('✅ ls affiche correctement le contenu du dossier');
    return true;
}

/**
 * Test de ls dans un dossier spécifique
 */
function testSpecificDirectory() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un sous-dossier avec du contenu
    testUtils.createTestDirectory(context, '/root/testdir');
    testUtils.createTestFile(context, '/root/testdir/subfile.txt', 'contenu');
    testUtils.createTestDirectory(context, '/root/testdir/subfolder');
    
    // Lister le contenu du sous-dossier
    cmdLs(['testdir'], context);
    
    const captures = getCaptures();
    const outputText = captures.map(c => c.text).join(' ');
    
    assert.isTrue(outputText.includes('subfile.txt'), 'subfile.txt devrait apparaître');
    assert.isTrue(outputText.includes('subfolder/'), 'subfolder/ devrait apparaître');
    
    console.log('✅ ls fonctionne avec un dossier spécifique');
    return true;
}

/**
 * Test d'erreur : dossier inexistant
 */
function testNonexistentDirectory() {
    clearCaptures();
    const context = createTestContext();
    
    // Essayer de lister un dossier qui n'existe pas
    cmdLs(['dossier-inexistant'], context);
    
    const captures = getCaptures();
    const hasError = captures.some(capture => 
        capture.className === 'error' && capture.text.includes('Dossier introuvable')
    );
    
    assert.isTrue(hasError, 'Une erreur devrait être affichée pour un dossier inexistant');
    console.log('✅ Erreur correcte pour dossier inexistant');
    return true;
}

/**
 * Test d'erreur : essayer de lister un fichier au lieu d'un dossier
 */
function testFileInsteadOfDirectory() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un fichier
    testUtils.createTestFile(context, '/root/notadirectory.txt', 'contenu');
    
    // Essayer de le lister comme un dossier
    cmdLs(['notadirectory.txt'], context);
    
    const captures = getCaptures();
    const hasError = captures.some(capture => 
        capture.className === 'error' && capture.text.includes('N\'est pas un dossier')
    );
    
    assert.isTrue(hasError, 'Une erreur devrait être affichée pour un fichier au lieu d\'un dossier');
    console.log('✅ Erreur correcte pour fichier au lieu de dossier');
    return true;
}

/**
 * Test de tri alphabétique
 */
function testAlphabeticalSorting() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer des fichiers dans le désordre alphabétique
    testUtils.createTestFile(context, '/root/zebra.txt', '');
    testUtils.createTestFile(context, '/root/alpha.txt', '');
    testUtils.createTestDirectory(context, '/root/beta');
    testUtils.createTestFile(context, '/root/gamma.txt', '');
    
    cmdLs([], context);
    
    const captures = getCaptures();
    const outputText = captures.map(c => c.text).join(' ');
    
    // Vérifier l'ordre alphabétique (alpha, beta/, gamma, zebra)
    const alphaPos = outputText.indexOf('alpha.txt');
    const betaPos = outputText.indexOf('beta/');
    const gammaPos = outputText.indexOf('gamma.txt');
    const zebraPos = outputText.indexOf('zebra.txt');
    
    assert.isTrue(alphaPos < betaPos, 'alpha.txt devrait venir avant beta/');
    assert.isTrue(betaPos < gammaPos, 'beta/ devrait venir avant gamma.txt');
    assert.isTrue(gammaPos < zebraPos, 'gamma.txt devrait venir avant zebra.txt');
    
    console.log('✅ Tri alphabétique correct');
    return true;
}

/**
 * Test avec dossier racine
 */
function testRootDirectory() {
    clearCaptures();
    const context = createTestContext();
    
    // Lister le contenu de la racine
    cmdLs(['/'], context);
    
    const captures = getCaptures();
    const outputText = captures.map(c => c.text).join(' ');
    
    // La racine devrait contenir au moins /home et /root
    assert.isTrue(outputText.includes('home/'), '/home devrait apparaître dans /');
    assert.isTrue(outputText.includes('root/'), '/root devrait apparaître dans /');
    
    console.log('✅ ls fonctionne avec le dossier racine');
    return true;
}

/**
 * Export des tests de base pour ls
 */
export const lsBasicTests = [
    createTest('Dossier vide', testEmptyDirectory),
    createTest('Dossier avec contenu', testWithContent),
    createTest('Dossier spécifique', testSpecificDirectory),
    createTest('Dossier inexistant (erreur)', testNonexistentDirectory),
    createTest('Fichier au lieu de dossier (erreur)', testFileInsteadOfDirectory),
    createTest('Tri alphabétique', testAlphabeticalSorting),
    createTest('Dossier racine', testRootDirectory)
];