// test-cases/commands/mkdir/basic.test.js - Tests de base pour mkdir
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdMkdir } from '../../../../bin/mkdir.js';

/**
 * Test de création d'un dossier simple
 */
function testSimpleDirectoryCreation() {
    clearCaptures();
    const context = createTestContext();
    
    // Vérifier que le contexte est sain avant le test
    const validation = validateFileSystem(context);
    assert.isTrue(validation.success, 'Contexte initial doit être valide');
    
    // Exécuter mkdir
    cmdMkdir(['test-folder'], context);
    
    // Vérifications
    assert.fileExists(context, '/root/test-folder', 'Le dossier test-folder devrait être créé');
    assert.isDirectory(context, '/root/test-folder', 'test-folder devrait être un dossier');
    
    console.log('✅ Dossier simple créé avec succès');
    return true;
}

/**
 * Test de création d'un dossier avec nom différent
 */
function testDifferentName() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un dossier avec un nom différent
    cmdMkdir(['documents'], context);
    
    assert.fileExists(context, '/root/documents', 'Le dossier documents devrait être créé');
    assert.isDirectory(context, '/root/documents', 'documents devrait être un dossier');
    
    console.log('✅ Dossier avec nom différent créé');
    return true;
}

/**
 * Test de création de plusieurs dossiers en une commande
 */
function testMultipleDirectories() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer plusieurs dossiers d'un coup
    cmdMkdir(['folder1', 'folder2', 'folder3'], context);
    
    assert.fileExists(context, '/root/folder1', 'folder1 devrait être créé');
    assert.fileExists(context, '/root/folder2', 'folder2 devrait être créé');
    assert.fileExists(context, '/root/folder3', 'folder3 devrait être créé');
    
    assert.isDirectory(context, '/root/folder1', 'folder1 devrait être un dossier');
    assert.isDirectory(context, '/root/folder2', 'folder2 devrait être un dossier');
    assert.isDirectory(context, '/root/folder3', 'folder3 devrait être un dossier');
    
    console.log('✅ Plusieurs dossiers créés simultanément');
    return true;
}

/**
 * Test de création d'un dossier déjà existant (erreur attendue)
 */
function testExistingDirectory() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un dossier
    cmdMkdir(['existing'], context);
    assert.fileExists(context, '/root/existing', 'Le dossier devrait être créé d\'abord');
    
    clearCaptures(); // Vider les captures de la première création
    
    // Essayer de créer le même dossier (devrait échouer)
    cmdMkdir(['existing'], context);
    
    // Vérifier qu'une erreur a été capturée
    const captures = getCaptures();
    const hasError = captures.some(capture => 
        capture.className === 'error' && capture.text.includes('existe déjà')
    );
    
    assert.isTrue(hasError, 'Une erreur devrait être affichée pour un dossier existant');
    console.log('✅ Erreur correcte pour dossier existant');
    return true;
}

/**
 * Test sans arguments (erreur attendue)
 */
function testNoArguments() {
    clearCaptures();
    const context = createTestContext();
    
    // Appeler mkdir sans arguments
    cmdMkdir([], context);
    
    // Vérifier qu'une erreur a été capturée
    const captures = getCaptures();
    const hasError = captures.some(capture => 
        capture.className === 'error' && capture.text.includes('nom de dossier manquant')
    );
    
    assert.isTrue(hasError, 'Une erreur devrait être affichée sans arguments');
    console.log('✅ Erreur correcte sans arguments');
    return true;
}

/**
 * Test de vérification des métadonnées du dossier créé
 */
function testDirectoryMetadata() {
    clearCaptures();
    const context = createTestContext();
    
    cmdMkdir(['metadata-test'], context);
    
    const createdDir = context.fileSystem['/root/metadata-test'];
    
    // Vérifier les métadonnées
    assert.equals(createdDir.type, 'dir', 'Type devrait être "dir"');
    assert.equals(createdDir.size, 4096, 'Taille devrait être 4096 (standard Unix)');
    assert.isTrue(createdDir.created instanceof Date, 'Date de création devrait être une Date');
    assert.isTrue(createdDir.modified instanceof Date, 'Date de modification devrait être une Date');
    assert.isTrue(createdDir.accessed instanceof Date, 'Date d\'accès devrait être une Date');
    
    console.log('✅ Métadonnées du dossier correctes');
    return true;
}

/**
 * Export des tests de base pour mkdir
 */
export const mkdirBasicTests = [
    createTest('Création dossier simple', testSimpleDirectoryCreation),
    createTest('Dossier avec nom différent', testDifferentName),
    createTest('Plusieurs dossiers', testMultipleDirectories),
    createTest('Dossier existant (erreur)', testExistingDirectory),
    createTest('Sans arguments (erreur)', testNoArguments),
    createTest('Métadonnées du dossier', testDirectoryMetadata)
];