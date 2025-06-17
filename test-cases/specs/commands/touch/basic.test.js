// test-cases/commands/touch/basic.test.js - Tests de base pour touch
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdTouch } from '../../../../bin/touch.js';

/**
 * Test de création d'un fichier simple
 */
function testSimpleFileCreation() {
    clearCaptures();
    const context = createTestContext();
    
    // Vérifier que le contexte est sain avant le test
    const validation = validateFileSystem(context);
    assert.isTrue(validation.success, 'Contexte initial doit être valide');
    
    // Exécuter touch
    cmdTouch(['test-file.txt'], context);
    
    // Vérifications
    assert.fileExists(context, '/root/test-file.txt', 'Le fichier test-file.txt devrait être créé');
    assert.isFile(context, '/root/test-file.txt', 'test-file.txt devrait être un fichier');
    
    // Vérifier que le fichier est vide
    const file = context.fileSystem['/root/test-file.txt'];
    assert.equals(file.content, '', 'Le fichier créé devrait être vide');
    assert.equals(file.size, 0, 'La taille du fichier devrait être 0');
    
    console.log('✅ Fichier simple créé avec succès');
    return true;
}

/**
 * Test de création de plusieurs fichiers en une commande
 */
function testMultipleFileCreation() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer plusieurs fichiers d'un coup
    cmdTouch(['file1.txt', 'file2.txt', 'file3.txt'], context);
    
    assert.fileExists(context, '/root/file1.txt', 'file1.txt devrait être créé');
    assert.fileExists(context, '/root/file2.txt', 'file2.txt devrait être créé');
    assert.fileExists(context, '/root/file3.txt', 'file3.txt devrait être créé');
    
    assert.isFile(context, '/root/file1.txt', 'file1.txt devrait être un fichier');
    assert.isFile(context, '/root/file2.txt', 'file2.txt devrait être un fichier');
    assert.isFile(context, '/root/file3.txt', 'file3.txt devrait être un fichier');
    
    console.log('✅ Plusieurs fichiers créés simultanément');
    return true;
}

/**
 * Test de touch sur un fichier existant (mise à jour des dates)
 */
function testExistingFileUpdate() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer d'abord un fichier avec du contenu
    testUtils.createTestFile(context, '/root/existing.txt', 'contenu initial');
    const originalFile = context.fileSystem['/root/existing.txt'];
    const originalModified = originalFile.modified;
    const originalContent = originalFile.content;
    
    // Attendre un petit délai pour avoir une différence de temps
    const oldTime = new Date(originalModified.getTime() - 1000); // 1 seconde avant
    originalFile.modified = oldTime;
    originalFile.accessed = oldTime;
    
    clearCaptures(); // Vider les captures de la création initiale
    
    // Utiliser touch sur le fichier existant
    cmdTouch(['existing.txt'], context);
    
    const updatedFile = context.fileSystem['/root/existing.txt'];
    
    // Vérifier que le contenu n'a pas changé
    assert.equals(updatedFile.content, originalContent, 'Le contenu ne devrait pas changer');
    assert.equals(updatedFile.size, originalContent.length, 'La taille ne devrait pas changer');
    
    // Vérifier que les dates ont été mises à jour
    assert.isTrue(updatedFile.modified > oldTime, 'La date de modification devrait être mise à jour');
    assert.isTrue(updatedFile.accessed > oldTime, 'La date d\'accès devrait être mise à jour');
    
    console.log('✅ Fichier existant mis à jour correctement');
    return true;
}

/**
 * Test sans arguments (erreur attendue)
 */
function testNoArguments() {
    clearCaptures();
    const context = createTestContext();
    
    // Appeler touch sans arguments
    cmdTouch([], context);
    
    // Vérifier qu'une erreur a été capturée
    const captures = getCaptures();
    const hasError = captures.some(capture => 
        capture.className === 'error' && capture.text.includes('opérande manquant')
    );
    
    assert.isTrue(hasError, 'Une erreur devrait être affichée sans arguments');
    console.log('✅ Erreur correcte sans arguments');
    return true;
}

/**
 * Test de création de fichier avec chemin relatif
 */
function testRelativePath() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un sous-dossier d'abord
    testUtils.createTestDirectory(context, '/root/subdir');
    
    // Créer un fichier dans le sous-dossier
    cmdTouch(['subdir/file-in-subdir.txt'], context);
    
    assert.fileExists(context, '/root/subdir/file-in-subdir.txt', 'Le fichier devrait être créé dans le sous-dossier');
    assert.isFile(context, '/root/subdir/file-in-subdir.txt', 'Devrait être un fichier');
    
    console.log('✅ Fichier créé avec chemin relatif');
    return true;
}

/**
 * Test d'erreur : répertoire parent inexistant
 */
function testParentDirectoryMissing() {
    clearCaptures();
    const context = createTestContext();
    
    // Essayer de créer un fichier dans un dossier qui n'existe pas
    cmdTouch(['nonexistent/file.txt'], context);
    
    // Vérifier qu'une erreur a été capturée
    const captures = getCaptures();
    const hasError = captures.some(capture => 
        capture.className === 'error' && capture.text.includes('répertoire parent n\'existe pas')
    );
    
    assert.isTrue(hasError, 'Une erreur devrait être affichée pour un répertoire parent manquant');
    
    // Vérifier que le fichier n'a pas été créé
    assert.fileNotExists(context, '/root/nonexistent/file.txt', 'Le fichier ne devrait pas être créé');
    
    console.log('✅ Erreur correcte pour répertoire parent manquant');
    return true;
}

/**
 * Test d'erreur : essayer de touch un dossier
 */
function testTouchDirectory() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un dossier
    testUtils.createTestDirectory(context, '/root/testdir');
    
    // Essayer de faire touch sur le dossier
    cmdTouch(['testdir'], context);
    
    // Vérifier qu'une erreur a été capturée
    const captures = getCaptures();
    const hasError = captures.some(capture => 
        capture.className === 'error' && capture.text.includes('Est un dossier')
    );
    
    assert.isTrue(hasError, 'Une erreur devrait être affichée pour un dossier');
    console.log('✅ Erreur correcte pour touch sur dossier');
    return true;
}

/**
 * Test de vérification des métadonnées du fichier créé
 */
function testFileMetadata() {
    clearCaptures();
    const context = createTestContext();
    
    cmdTouch(['metadata-test.txt'], context);
    
    const createdFile = context.fileSystem['/root/metadata-test.txt'];
    
    // Vérifier les métadonnées
    assert.equals(createdFile.type, 'file', 'Type devrait être "file"');
    assert.equals(createdFile.size, 0, 'Taille devrait être 0 pour un fichier vide');
    assert.equals(createdFile.content, '', 'Contenu devrait être vide');
    assert.isTrue(createdFile.created instanceof Date, 'Date de création devrait être une Date');
    assert.isTrue(createdFile.modified instanceof Date, 'Date de modification devrait être une Date');
    assert.isTrue(createdFile.accessed instanceof Date, 'Date d\'accès devrait être une Date');
    assert.equals(createdFile.permissions, '-rw-r--r--', 'Permissions par défaut correctes');
    assert.equals(createdFile.owner, 'root', 'Propriétaire devrait être root');
    assert.equals(createdFile.group, 'root', 'Groupe devrait être root');
    assert.equals(createdFile.links, 1, 'Nombre de liens devrait être 1');
    
    console.log('✅ Métadonnées du fichier correctes');
    return true;
}

/**
 * Export des tests de base pour touch
 */
export const touchBasicTests = [
    createTest('Création fichier simple', testSimpleFileCreation),
    createTest('Plusieurs fichiers', testMultipleFileCreation),
    createTest('Fichier existant (mise à jour)', testExistingFileUpdate),
    createTest('Sans arguments (erreur)', testNoArguments),
    createTest('Chemin relatif', testRelativePath),
    createTest('Répertoire parent manquant (erreur)', testParentDirectoryMissing),
    createTest('Touch sur dossier (erreur)', testTouchDirectory),
    createTest('Métadonnées du fichier', testFileMetadata)
];