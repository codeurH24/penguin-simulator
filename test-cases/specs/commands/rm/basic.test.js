// test-cases/specs/commands/rm/basic.test.js - Tests de base pour rm (version finale)
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdRm } from '../../../../bin/rm.js';

/**
 * Vérifie si une erreur correspond aux messages d'erreur attendus de rm
 * @param {Array} captures - Messages capturés
 * @param {string} expectedType - Type d'erreur attendu
 * @returns {boolean} - true si l'erreur correspond
 */
function hasExpectedError(captures, expectedType) {
    return captures.some(capture => {
        if (capture.className !== 'error') return false;
        
        const text = capture.text.toLowerCase();
        
        switch (expectedType) {
            case 'not_found':
                return text.includes('fichier ou dossier introuvable') ||
                       text.includes('no such file or directory') ||
                       text.includes('impossible de supprimer') ||
                       text.includes('cannot remove');
                       
            case 'is_directory':
                return text.includes('est un répertoire') ||
                       text.includes('is a directory') ||
                       text.includes('impossible de supprimer');
                       
            case 'missing_operand':
                return text.includes('opérande manquant') ||
                       text.includes('missing operand') ||
                       text.includes('aucun fichier spécifié');
                       
            default:
                return false;
        }
    });
}

/**
 * Test de suppression d'un fichier simple
 */
function testSimpleFileRemoval() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un fichier de test
    testUtils.createTestFile(context, '/root/test-file.txt', 'contenu test');
    assert.fileExists(context, '/root/test-file.txt', 'Le fichier devrait exister avant suppression');
    
    // Supprimer le fichier
    cmdRm(['test-file.txt'], context);
    
    // Vérifier que le fichier a été supprimé
    assert.fileNotExists(context, '/root/test-file.txt', 'Le fichier devrait être supprimé');
    
    console.log('✅ Fichier simple supprimé avec succès');
    return true;
}

/**
 * Test de suppression de plusieurs fichiers
 */
function testMultipleFileRemoval() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer plusieurs fichiers
    testUtils.createTestFile(context, '/root/file1.txt', 'contenu1');
    testUtils.createTestFile(context, '/root/file2.txt', 'contenu2');
    testUtils.createTestFile(context, '/root/file3.txt', 'contenu3');
    
    assert.fileExists(context, '/root/file1.txt', 'file1.txt devrait exister');
    assert.fileExists(context, '/root/file2.txt', 'file2.txt devrait exister');
    assert.fileExists(context, '/root/file3.txt', 'file3.txt devrait exister');
    
    // Supprimer tous les fichiers en une commande
    cmdRm(['file1.txt', 'file2.txt', 'file3.txt'], context);
    
    // Vérifier que tous ont été supprimés
    assert.fileNotExists(context, '/root/file1.txt', 'file1.txt devrait être supprimé');
    assert.fileNotExists(context, '/root/file2.txt', 'file2.txt devrait être supprimé');
    assert.fileNotExists(context, '/root/file3.txt', 'file3.txt devrait être supprimé');
    
    console.log('✅ Plusieurs fichiers supprimés avec succès');
    return true;
}

/**
 * Test d'erreur pour fichier inexistant
 */
function testNonexistentFile() {
    clearCaptures();
    const context = createTestContext();
    
    // Essayer de supprimer un fichier qui n'existe pas
    cmdRm(['fichier-inexistant.txt'], context);
    
    // Vérifier qu'une erreur a été capturée
    const captures = getCaptures();
    const hasError = hasExpectedError(captures, 'not_found');
    
    assert.isTrue(hasError, 'Une erreur devrait être affichée pour un fichier inexistant');
    console.log('✅ Erreur correcte pour fichier inexistant');
    return true;
}

/**
 * Test d'erreur sans arguments
 */
function testNoArguments() {
    clearCaptures();
    const context = createTestContext();
    
    // Appeler rm sans arguments
    cmdRm([], context);
    
    // Vérifier qu'une erreur a été capturée
    const captures = getCaptures();
    const hasError = hasExpectedError(captures, 'missing_operand');
    
    assert.isTrue(hasError, 'Une erreur devrait être affichée sans arguments');
    console.log('✅ Erreur correcte sans arguments');
    return true;
}

/**
 * Test de suppression d'un dossier vide sans -r (erreur attendue)
 */
function testDirectoryWithoutRecursive() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un dossier vide
    testUtils.createTestDirectory(context, '/root/empty-dir');
    assert.fileExists(context, '/root/empty-dir', 'Le dossier devrait exister');
    
    // Essayer de le supprimer sans -r
    cmdRm(['empty-dir'], context);
    
    // Vérifier qu'une erreur a été capturée
    const captures = getCaptures();
    const hasError = hasExpectedError(captures, 'is_directory');
    
    assert.isTrue(hasError, 'Une erreur devrait être affichée pour un dossier sans -r');
    
    // Le dossier devrait toujours exister
    assert.fileExists(context, '/root/empty-dir', 'Le dossier devrait toujours exister après l\'erreur');
    
    console.log('✅ Erreur correcte pour dossier sans -r');
    return true;
}

/**
 * Test de suppression d'un dossier vide AVEC l'option -r
 */
function testEmptyDirectoryWithRecursive() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un dossier vide
    testUtils.createTestDirectory(context, '/root/empty-to-remove');
    assert.fileExists(context, '/root/empty-to-remove', 'Le dossier devrait exister');
    
    // Le supprimer avec -r
    cmdRm(['-r', 'empty-to-remove'], context);
    
    // Vérifier qu'il a été supprimé
    assert.fileNotExists(context, '/root/empty-to-remove', 'Le dossier devrait être supprimé avec -r');
    
    console.log('✅ Dossier vide supprimé avec -r');
    return true;
}

/**
 * Test de suppression avec chemin absolu
 */
function testAbsolutePath() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un fichier avec chemin absolu
    testUtils.createTestFile(context, '/root/absolute-test.txt', 'contenu');
    assert.fileExists(context, '/root/absolute-test.txt', 'Le fichier devrait exister');
    
    // Le supprimer avec chemin absolu
    cmdRm(['/root/absolute-test.txt'], context);
    
    // Vérifier qu'il a été supprimé
    assert.fileNotExists(context, '/root/absolute-test.txt', 'Le fichier devrait être supprimé');
    
    console.log('✅ Fichier supprimé avec chemin absolu');
    return true;
}

/**
 * Test de suppression avec chemin relatif dans sous-dossier
 */
function testRelativePathInSubdirectory() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un sous-dossier avec un fichier
    testUtils.createTestDirectory(context, '/root/subdir');
    testUtils.createTestFile(context, '/root/subdir/file-in-sub.txt', 'contenu');
    assert.fileExists(context, '/root/subdir/file-in-sub.txt', 'Le fichier devrait exister');
    
    // Le supprimer avec chemin relatif
    cmdRm(['subdir/file-in-sub.txt'], context);
    
    // Vérifier qu'il a été supprimé
    assert.fileNotExists(context, '/root/subdir/file-in-sub.txt', 'Le fichier devrait être supprimé');
    
    // Le dossier parent devrait toujours exister
    assert.fileExists(context, '/root/subdir', 'Le dossier parent devrait toujours exister');
    
    console.log('✅ Fichier supprimé avec chemin relatif');
    return true;
}

/**
 * Test de suppression de fichiers mixtes (certains existent, d'autres non)
 */
function testMixedExistentFiles() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer seulement quelques fichiers
    testUtils.createTestFile(context, '/root/exists1.txt', 'contenu1');
    testUtils.createTestFile(context, '/root/exists2.txt', 'contenu2');
    // Ne pas créer exists3.txt
    
    assert.fileExists(context, '/root/exists1.txt', 'exists1.txt devrait exister');
    assert.fileExists(context, '/root/exists2.txt', 'exists2.txt devrait exister');
    assert.fileNotExists(context, '/root/exists3.txt', 'exists3.txt ne devrait pas exister');
    
    // Essayer de supprimer tous les trois
    cmdRm(['exists1.txt', 'exists2.txt', 'exists3.txt'], context);
    
    // Vérifier que les existants ont été supprimés
    assert.fileNotExists(context, '/root/exists1.txt', 'exists1.txt devrait être supprimé');
    assert.fileNotExists(context, '/root/exists2.txt', 'exists2.txt devrait être supprimé');
    
    // Vérifier qu'une erreur a été émise pour le fichier inexistant
    const captures = getCaptures();
    const hasError = captures.some(capture => 
        capture.className === 'error' && capture.text.includes('exists3.txt')
    );
    
    assert.isTrue(hasError, 'Une erreur devrait être émise pour exists3.txt');
    
    console.log('✅ Gestion correcte des fichiers mixtes');
    return true;
}

/**
 * Export des tests de base pour rm
 */
export const rmBasicTests = [
    createTest('Suppression fichier simple', testSimpleFileRemoval),
    createTest('Suppression plusieurs fichiers', testMultipleFileRemoval),
    createTest('Fichier inexistant (erreur)', testNonexistentFile),
    createTest('Sans arguments (erreur)', testNoArguments),
    createTest('Dossier sans -r (erreur)', testDirectoryWithoutRecursive),
    createTest('Dossier vide avec -r', testEmptyDirectoryWithRecursive),
    createTest('Chemin absolu', testAbsolutePath),
    createTest('Chemin relatif dans sous-dossier', testRelativePathInSubdirectory),
    createTest('Fichiers mixtes (existants/inexistants)', testMixedExistentFiles)
];