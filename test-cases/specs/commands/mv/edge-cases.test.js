// test-cases/specs/commands/mv/edge-cases.test.js
// Tests des cas limites et situations spéciales pour mv

import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdMv } from '../../../../bin/mv.js';
import { cmdMkdir } from '../../../../bin/mkdir.js';
import { cmdTouch } from '../../../../bin/touch.js';
import { cmdChmod } from '../../../../bin/chmod.js';

/**
 * TEST 1: mv avec chemins contenant des espaces et caractères spéciaux
 */
function testMvSpecialCharactersInPaths() {
    console.log('🧪 TEST EDGE: mv avec caractères spéciaux dans chemins');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer des fichiers avec noms contenant espaces et caractères spéciaux
    testUtils.createTestFile(context, '/root/file with spaces.txt', 'contenu espaces');
    testUtils.createTestFile(context, '/root/file-with-dashes.txt', 'contenu tirets');
    testUtils.createTestFile(context, '/root/file_with_underscores.txt', 'contenu underscores');
    
    // Créer répertoire destination
    testUtils.createTestDirectory(context, '/root/dest dir');
    
    // Déplacer fichier avec espaces
    cmdMv(['file with spaces.txt', 'renamed with spaces.txt'], context);
    
    // Vérifier le succès silencieux
    let captures = getCaptures();
    assert.captureCount(0, 'mv avec espaces doit être silencieux');
    
    // Vérifier le déplacement
    assert.fileNotExists(context, '/root/file with spaces.txt', 'Ancien fichier avec espaces ne doit plus exister');
    assert.fileExists(context, '/root/renamed with spaces.txt', 'Nouveau fichier avec espaces doit exister');
    assert.equals(context.fileSystem['/root/renamed with spaces.txt'].content, 'contenu espaces', 'Contenu préservé');
    
    console.log('✅ mv gère correctement les caractères spéciaux');
    return true;
}

/**
 * TEST 2: mv vers répertoire avec fichier de même nom existant
 */
function testMvToDirectoryWithExistingFile() {
    console.log('🧪 TEST EDGE: mv vers répertoire avec fichier existant de même nom');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer fichier source et répertoire destination
    testUtils.createTestFile(context, '/root/source.txt', 'contenu source');
    testUtils.createTestDirectory(context, '/root/dest-dir');
    testUtils.createTestFile(context, '/root/dest-dir/source.txt', 'contenu destination');
    
    // Vérifier l'état initial
    assert.fileExists(context, '/root/source.txt', 'Le fichier source doit exister');
    assert.fileExists(context, '/root/dest-dir/source.txt', 'Le fichier destination doit exister');
    assert.equals(context.fileSystem['/root/source.txt'].content, 'contenu source', 'Contenu source initial');
    assert.equals(context.fileSystem['/root/dest-dir/source.txt'].content, 'contenu destination', 'Contenu destination initial');
    
    // COMPORTEMENT DEBIAN: mv vers répertoire écrase silencieusement le fichier existant
    cmdMv(['source.txt', 'dest-dir'], context);
    
    // Vérifier qu'aucune erreur n'est générée (comportement Debian)
    const captures = getCaptures();
    assert.captureCount(0, 'mv doit être silencieux lors de l\'écrasement dans répertoire (comportement Debian)');
    
    // Vérifications après écrasement
    assert.fileNotExists(context, '/root/source.txt', 'Le fichier source ne doit plus exister');
    assert.fileExists(context, '/root/dest-dir/source.txt', 'Le fichier destination doit toujours exister');
    
    // ESSENTIEL: Le contenu du fichier dans le répertoire doit être écrasé
    const finalFile = context.fileSystem['/root/dest-dir/source.txt'];
    assert.equals(finalFile.content, 'contenu source', 'Le contenu dans le répertoire doit être écrasé par celui du fichier source');
    
    console.log('✅ mv écrase silencieusement dans répertoire comme Debian');
    return true;
}

/**
 * TEST 3: mv d'un gros répertoire avec structure complexe
 */
function testMvLargeDirectoryStructure() {
    console.log('🧪 TEST EDGE: mv d\'une structure de répertoire complexe');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer une structure complexe
    testUtils.createTestDirectory(context, '/root/complex-dir');
    testUtils.createTestDirectory(context, '/root/complex-dir/subdir1');
    testUtils.createTestDirectory(context, '/root/complex-dir/subdir2');
    testUtils.createTestDirectory(context, '/root/complex-dir/subdir1/nested');
    
    // Ajouter plusieurs fichiers
    testUtils.createTestFile(context, '/root/complex-dir/file1.txt', 'contenu 1');
    testUtils.createTestFile(context, '/root/complex-dir/file2.txt', 'contenu 2');
    testUtils.createTestFile(context, '/root/complex-dir/subdir1/nested-file.txt', 'contenu nested');
    testUtils.createTestFile(context, '/root/complex-dir/subdir1/nested/deep-file.txt', 'contenu deep');
    testUtils.createTestFile(context, '/root/complex-dir/subdir2/another-file.txt', 'contenu another');
    
    // Déplacer toute la structure
    cmdMv(['complex-dir', 'moved-complex'], context);
    
    // Vérifier le succès
    const captures = getCaptures();
    assert.captureCount(0, 'mv de structure complexe doit être silencieux');
    
    // Vérifier que l'ancienne structure n'existe plus
    assert.fileNotExists(context, '/root/complex-dir', 'L\'ancienne structure ne doit plus exister');
    
    // Vérifier que toute la nouvelle structure existe
    assert.fileExists(context, '/root/moved-complex', 'Répertoire racine déplacé');
    assert.fileExists(context, '/root/moved-complex/subdir1', 'Sous-répertoire 1 déplacé');
    assert.fileExists(context, '/root/moved-complex/subdir2', 'Sous-répertoire 2 déplacé');
    assert.fileExists(context, '/root/moved-complex/subdir1/nested', 'Répertoire nested déplacé');
    
    // Vérifier tous les fichiers et leurs contenus
    assert.fileExists(context, '/root/moved-complex/file1.txt', 'file1.txt déplacé');
    assert.fileExists(context, '/root/moved-complex/file2.txt', 'file2.txt déplacé');
    assert.fileExists(context, '/root/moved-complex/subdir1/nested-file.txt', 'nested-file.txt déplacé');
    assert.fileExists(context, '/root/moved-complex/subdir1/nested/deep-file.txt', 'deep-file.txt déplacé');
    assert.fileExists(context, '/root/moved-complex/subdir2/another-file.txt', 'another-file.txt déplacé');
    
    // Vérifier les contenus
    assert.equals(context.fileSystem['/root/moved-complex/file1.txt'].content, 'contenu 1');
    assert.equals(context.fileSystem['/root/moved-complex/subdir1/nested/deep-file.txt'].content, 'contenu deep');
    
    console.log('✅ mv gère correctement les structures complexes');
    return true;
}

/**
 * TEST 4: mv avec chemins absolus et relatifs mélangés
 */
function testMvMixedAbsoluteRelativePaths() {
    console.log('🧪 TEST EDGE: mv avec chemins absolus et relatifs');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer structure de test
    testUtils.createTestDirectory(context, '/root/testdir');
    testUtils.createTestFile(context, '/root/testdir/file.txt', 'contenu test');
    testUtils.createTestFile(context, '/root/absolute-file.txt', 'contenu absolu');
    
    // Changer vers testdir
    context.getCurrentPath = () => '/root/testdir';
    
    // mv avec chemin relatif vers chemin absolu
    cmdMv(['file.txt', '/root/moved-absolute.txt'], context);
    
    let captures = getCaptures();
    assert.captureCount(0, 'mv relatif vers absolu doit être silencieux');
    
    // Vérifier le déplacement
    assert.fileNotExists(context, '/root/testdir/file.txt', 'Fichier relatif ne doit plus exister');
    assert.fileExists(context, '/root/moved-absolute.txt', 'Fichier absolu doit exister');
    
    // mv avec chemin absolu vers chemin relatif
    clearCaptures();
    cmdMv(['/root/absolute-file.txt', 'moved-relative.txt'], context);
    
    captures = getCaptures();
    assert.captureCount(0, 'mv absolu vers relatif doit être silencieux');
    
    // Vérifier le déplacement (relatif = dans le répertoire courant /root/testdir)
    assert.fileNotExists(context, '/root/absolute-file.txt', 'Fichier absolu ne doit plus exister');
    assert.fileExists(context, '/root/testdir/moved-relative.txt', 'Fichier relatif doit exister dans le bon répertoire');
    
    console.log('✅ mv gère correctement les chemins absolus et relatifs');
    return true;
}

/**
 * TEST 5: mv avec fichier vide et répertoire vide
 */
function testMvEmptyFileAndDirectory() {
    console.log('🧪 TEST EDGE: mv avec fichier vide et répertoire vide');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer fichier vide et répertoire vide
    testUtils.createTestFile(context, '/root/empty-file.txt', '');
    testUtils.createTestDirectory(context, '/root/empty-dir');
    
    // Déplacer fichier vide
    cmdMv(['empty-file.txt', 'moved-empty-file.txt'], context);
    
    let captures = getCaptures();
    assert.captureCount(0, 'mv fichier vide doit être silencieux');
    
    // Vérifier
    assert.fileNotExists(context, '/root/empty-file.txt', 'Ancien fichier vide ne doit plus exister');
    assert.fileExists(context, '/root/moved-empty-file.txt', 'Nouveau fichier vide doit exister');
    assert.equals(context.fileSystem['/root/moved-empty-file.txt'].content, '', 'Contenu vide préservé');
    
    // Déplacer répertoire vide
    clearCaptures();
    cmdMv(['empty-dir', 'moved-empty-dir'], context);
    
    captures = getCaptures();
    assert.captureCount(0, 'mv répertoire vide doit être silencieux');
    
    // Vérifier
    assert.fileNotExists(context, '/root/empty-dir', 'Ancien répertoire vide ne doit plus exister');
    assert.fileExists(context, '/root/moved-empty-dir', 'Nouveau répertoire vide doit exister');
    assert.isDirectory(context, '/root/moved-empty-dir', 'Doit rester un répertoire');
    
    console.log('✅ mv gère correctement les fichiers et répertoires vides');
    return true;
}

/**
 * TEST 6: mv avec différents types de permissions sur fichiers
 */
function testMvDifferentFilePermissions() {
    console.log('🧪 TEST EDGE: mv avec différentes permissions de fichiers');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer fichiers avec différentes permissions
    testUtils.createTestFile(context, '/root/readable.txt', 'contenu lecture');
    testUtils.createTestFile(context, '/root/writable.txt', 'contenu écriture');
    testUtils.createTestFile(context, '/root/executable.txt', 'contenu exécutable');
    
    // Définir permissions spécifiques
    cmdChmod(['444', 'readable.txt'], context);   // r--r--r--
    cmdChmod(['222', 'writable.txt'], context);   // -w--w--w-
    cmdChmod(['755', 'executable.txt'], context); // rwxr-xr-x
    
    // Déplacer chaque fichier et vérifier que les permissions sont préservées
    cmdMv(['readable.txt', 'moved-readable.txt'], context);
    cmdMv(['writable.txt', 'moved-writable.txt'], context);
    cmdMv(['executable.txt', 'moved-executable.txt'], context);
    
    // Vérifier les permissions préservées
    assert.equals(context.fileSystem['/root/moved-readable.txt'].permissions, '-r--r--r--', 'Permissions lecture préservées');
    assert.equals(context.fileSystem['/root/moved-writable.txt'].permissions, '--w--w--w-', 'Permissions écriture préservées');
    assert.equals(context.fileSystem['/root/moved-executable.txt'].permissions, '-rwxr-xr-x', 'Permissions exécution préservées');
    
    console.log('✅ mv préserve correctement toutes les permissions');
    return true;
}

// Exporter les tests
export const mvEdgeCasesTests = [
    createTest('mv - Caractères spéciaux dans chemins', testMvSpecialCharactersInPaths),
    createTest('mv - Vers répertoire avec fichier existant', testMvToDirectoryWithExistingFile),
    createTest('mv - Structure de répertoire complexe', testMvLargeDirectoryStructure),
    createTest('mv - Chemins absolus et relatifs mélangés', testMvMixedAbsoluteRelativePaths),
    createTest('mv - Fichier vide et répertoire vide', testMvEmptyFileAndDirectory),
    createTest('mv - Différentes permissions de fichiers', testMvDifferentFilePermissions)
];

export default mvEdgeCasesTests;