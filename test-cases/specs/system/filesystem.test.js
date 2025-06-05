// test-cases/system/filesystem.test.js - Tests du système de fichiers
import { createTestContext, clearCaptures } from '../../lib/context.js';
import { assert, testUtils } from '../../lib/helpers.js';
import { createTest } from '../../lib/runner.js';

/**
 * Test de vérification des dossiers de base du système
 */
function testBasicDirectories() {
    clearCaptures();
    const context = createTestContext();
    
    testUtils.debugFileSystem(context, 'Dossiers de base');
    
    // Vérifier que les dossiers essentiels existent
    assert.fileExists(context, '/', 'Le dossier racine / devrait exister');
    assert.fileExists(context, '/home', 'Le dossier /home devrait exister');
    assert.fileExists(context, '/root', 'Le dossier /root devrait exister');
    
    console.log('✅ Dossiers de base présents');
    return true;
}

/**
 * Test de vérification des types de dossiers
 */
function testDirectoryTypes() {
    clearCaptures();
    const context = createTestContext();
    
    // Vérifier que les éléments sont bien des dossiers
    assert.isDirectory(context, '/', 'La racine / devrait être un dossier');
    assert.isDirectory(context, '/home', '/home devrait être un dossier');
    assert.isDirectory(context, '/root', '/root devrait être un dossier');
    
    console.log('✅ Types de dossiers corrects');
    return true;
}

/**
 * Test de vérification des métadonnées des dossiers
 */
function testDirectoryMetadata() {
    clearCaptures();
    const context = createTestContext();
    
    // Vérifier que les dossiers ont les bonnes métadonnées
    const rootDir = context.fileSystem['/'];
    const homeDir = context.fileSystem['/home'];
    const rootUserDir = context.fileSystem['/root'];
    
    // Vérifier les propriétés de base
    assert.isTrue(rootDir.size !== undefined, '/ devrait avoir une taille');
    assert.isTrue(rootDir.created !== undefined, '/ devrait avoir une date de création');
    assert.isTrue(rootDir.modified !== undefined, '/ devrait avoir une date de modification');
    
    assert.isTrue(homeDir.size !== undefined, '/home devrait avoir une taille');
    assert.isTrue(rootUserDir.size !== undefined, '/root devrait avoir une taille');
    
    console.log('✅ Métadonnées des dossiers correctes');
    return true;
}

/**
 * Export des tests du système de fichiers
 */
export const filesystemTests = [
    createTest('Dossiers de base', testBasicDirectories),
    createTest('Types de dossiers', testDirectoryTypes),
    createTest('Métadonnées des dossiers', testDirectoryMetadata)
];

