// test-cases/specs/commands/mv/debian-compliant.test.js
// Tests exhaustifs de conformité Debian pour la commande mv

import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdMv } from '../../../../bin/mv/mv.js';
import { cmdMkdir } from '../../../../bin/mkdir/mkdir.js';
import { cmdTouch } from '../../../../bin/touch.js';
import { cmdUseradd } from '../../../../bin/useradd.js';
import { cmdSu } from '../../../../bin/su.js';
import { cmdChmod } from '../../../../bin/chmod.js';
import { clearUserStack } from '../../../../modules/users/user-stack.js';
import { FileSystemService } from '../../../../modules/filesystem/index.js';

/**
 * Fonction utilitaire pour vérifier qu'un mv a réussi silencieusement
 */
function assertMvSuccess(captures, description) {
    assert.captureCount(0, `${description} - mv doit être silencieux en cas de succès (comportement Debian)`);
}

/**
 * Fonction utilitaire pour vérifier les messages d'erreur français
 */
function assertMvError(captures, expectedErrorPattern, description) {
    assert.isTrue(captures.length > 0, `${description} - mv doit afficher une erreur`);
    
    // Debug: afficher les messages capturés pour diagnostic
    console.log(`🔍 DEBUG ${description}:`);
    captures.forEach((capture, index) => {
        console.log(`  [${index}] ${capture.className}: "${capture.text}"`);
    });
    
    const errorFound = captures.some(capture => 
        capture.className === 'error' && 
        capture.text.match(expectedErrorPattern)
    );
    
    if (!errorFound) {
        console.log(`❌ Pattern attendu: ${expectedErrorPattern}`);
        console.log(`❌ Messages d'erreur trouvés: ${captures.filter(c => c.className === 'error').map(c => c.text).join(', ')}`);
    }
    
    assert.isTrue(errorFound, `${description} - le message d'erreur doit correspondre au pattern: ${expectedErrorPattern}`);
}

/**
 * TEST 1: Renommage simple de fichier (comportement de base Debian)
 */
function testDebianSimpleRename() {
    console.log('🧪 TEST DEBIAN: Renommage simple de fichier');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer un fichier test
    testUtils.createTestFile(context, '/root/oldname.txt', 'contenu test');
    assert.fileExists(context, '/root/oldname.txt', 'Le fichier source doit exister');
    
    // Renommer le fichier
    cmdMv(['oldname.txt', 'newname.txt'], context);
    
    // COMPORTEMENT DEBIAN: Aucune sortie en cas de succès
    const captures = getCaptures();
    assertMvSuccess(captures, 'Renommage simple');
    
    // Vérifications post-mv
    assert.fileNotExists(context, '/root/oldname.txt', 'L\'ancien fichier ne doit plus exister');
    assert.fileExists(context, '/root/newname.txt', 'Le nouveau fichier doit exister');
    assert.isFile(context, '/root/newname.txt', 'Doit rester un fichier');
    
    // Vérifier que le contenu est préservé
    const file = context.fileSystem['/root/newname.txt'];
    assert.equals(file.content, 'contenu test', 'Le contenu doit être préservé');
    
    console.log('✅ DEBIAN CONFORME: Renommage simple silencieux');
    return true;
}

/**
 * TEST 2: Déplacement d'un fichier vers un répertoire existant
 */
function testDebianMoveFileToDirectory() {
    console.log('🧪 TEST DEBIAN: Déplacement de fichier vers répertoire');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer un fichier et un répertoire
    testUtils.createTestFile(context, '/root/file.txt', 'contenu fichier');
    testUtils.createTestDirectory(context, '/root/target-dir');
    
    // Déplacer le fichier vers le répertoire
    cmdMv(['file.txt', 'target-dir'], context);
    
    // COMPORTEMENT DEBIAN: Silencieux en cas de succès
    const captures = getCaptures();
    assertMvSuccess(captures, 'Déplacement vers répertoire');
    
    // Vérifications
    assert.fileNotExists(context, '/root/file.txt', 'Le fichier source ne doit plus exister');
    assert.fileExists(context, '/root/target-dir/file.txt', 'Le fichier doit être dans le répertoire destination');
    assert.isFile(context, '/root/target-dir/file.txt', 'Doit rester un fichier');
    
    // Vérifier le contenu préservé
    const file = context.fileSystem['/root/target-dir/file.txt'];
    assert.equals(file.content, 'contenu fichier', 'Le contenu doit être préservé');
    
    console.log('✅ DEBIAN CONFORME: Déplacement vers répertoire');
    return true;
}

/**
 * TEST 3: Déplacement d'un répertoire entier
 */
function testDebianMoveDirectory() {
    console.log('🧪 TEST DEBIAN: Déplacement de répertoire entier');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer un répertoire avec contenu
    testUtils.createTestDirectory(context, '/root/source-dir');
    testUtils.createTestFile(context, '/root/source-dir/file1.txt', 'contenu 1');
    testUtils.createTestFile(context, '/root/source-dir/file2.txt', 'contenu 2');
    testUtils.createTestDirectory(context, '/root/source-dir/subdir');
    testUtils.createTestFile(context, '/root/source-dir/subdir/nested.txt', 'contenu nested');
    
    // Renommer le répertoire
    cmdMv(['source-dir', 'renamed-dir'], context);
    
    // COMPORTEMENT DEBIAN: Silencieux
    const captures = getCaptures();
    assertMvSuccess(captures, 'Déplacement de répertoire');
    
    // Vérifications structure
    assert.fileNotExists(context, '/root/source-dir', 'L\'ancien répertoire ne doit plus exister');
    assert.fileExists(context, '/root/renamed-dir', 'Le nouveau répertoire doit exister');
    assert.isDirectory(context, '/root/renamed-dir', 'Doit rester un répertoire');
    
    // Vérifier que tout le contenu a été déplacé
    assert.fileExists(context, '/root/renamed-dir/file1.txt', 'file1.txt doit être déplacé');
    assert.fileExists(context, '/root/renamed-dir/file2.txt', 'file2.txt doit être déplacé');
    assert.fileExists(context, '/root/renamed-dir/subdir', 'subdir doit être déplacé');
    assert.fileExists(context, '/root/renamed-dir/subdir/nested.txt', 'nested.txt doit être déplacé');
    
    // Vérifier les contenus
    assert.equals(context.fileSystem['/root/renamed-dir/file1.txt'].content, 'contenu 1');
    assert.equals(context.fileSystem['/root/renamed-dir/subdir/nested.txt'].content, 'contenu nested');
    
    console.log('✅ DEBIAN CONFORME: Déplacement de répertoire avec contenu');
    return true;
}

/**
 * TEST 4: Erreur fichier source inexistant (message français)
 */
function testDebianSourceNotFound() {
    console.log('🧪 TEST DEBIAN: Erreur fichier source inexistant');
    
    clearCaptures();
    const context = createTestContext();
    
    // Tenter de déplacer un fichier inexistant
    cmdMv(['inexistant.txt', 'destination.txt'], context);
    
    // COMPORTEMENT: Message d'erreur en français
    const captures = getCaptures();
    assertMvError(captures, /mv:.*Fichier ou dossier introuvable/, 'Fichier source inexistant');
    
    console.log('✅ CONFORME: Message d\'erreur pour fichier inexistant');
    return true;
}

/**
 * TEST 5: Comportement Debian - Écrasement silencieux de destination existante
 */
function testDebianDestinationExists() {
    console.log('🧪 TEST DEBIAN: Écrasement silencieux destination existante');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer deux fichiers
    testUtils.createTestFile(context, '/root/source.txt', 'contenu source');
    testUtils.createTestFile(context, '/root/dest.txt', 'contenu destination');
    
    // 🔍 DEBUG: État initial
    console.log('🔍 DEBUG - État initial:');
    console.log('  source.txt existe:', !!context.fileSystem['/root/source.txt']);
    console.log('  dest.txt existe:', !!context.fileSystem['/root/dest.txt']);
    console.log('  source.txt contenu:', context.fileSystem['/root/source.txt']?.content);
    console.log('  dest.txt contenu:', context.fileSystem['/root/dest.txt']?.content);
    
    // COMPORTEMENT DEBIAN: mv écrase silencieusement
    console.log('🔍 DEBUG - Exécution mv (écrasement attendu)...');
    cmdMv(['source.txt', 'dest.txt'], context);
    
    // Vérifier qu'AUCUNE erreur n'est générée (comportement Debian)
    const captures = getCaptures();
    console.log('🔍 DEBUG - Captures reçues:');
    console.log('  Nombre total:', captures.length);
    captures.forEach((capture, index) => {
        console.log(`  [${index}] ${capture.className}: "${capture.text}"`);
    });
    
    assertMvSuccess(captures, 'Écrasement silencieux');
    
    // 🔍 DEBUG: État final
    console.log('🔍 DEBUG - État final:');
    console.log('  source.txt existe encore:', !!context.fileSystem['/root/source.txt']);
    console.log('  dest.txt existe encore:', !!context.fileSystem['/root/dest.txt']);
    console.log('  dest.txt contenu final:', context.fileSystem['/root/dest.txt']?.content);
    
    // Vérifications conformité Debian
    assert.fileNotExists(context, '/root/source.txt', 'Le fichier source ne doit plus exister');
    assert.fileExists(context, '/root/dest.txt', 'Le fichier destination doit toujours exister');
    
    // ESSENTIEL: Le contenu de destination doit être écrasé par celui de source
    const finalFile = context.fileSystem['/root/dest.txt'];
    assert.equals(finalFile.content, 'contenu source', 'Le contenu destination doit être écrasé par source');
    
    console.log('✅ DEBIAN CONFORME: Écrasement silencieux comme le vrai mv');
    return true;
}

/**
 * TEST 6: Erreur arguments insuffisants
 */
function testDebianInsufficientArgs() {
    console.log('🧪 TEST DEBIAN: Erreur arguments insuffisants');
    
    clearCaptures();
    const context = createTestContext();
    
    // Tester avec 0 argument
    cmdMv([], context);
    
    let captures = getCaptures();
    assert.isTrue(captures.length > 0, 'mv sans arguments doit afficher une erreur');
    
    clearCaptures();
    
    // Tester avec 1 seul argument
    cmdMv(['fichier.txt'], context);
    
    captures = getCaptures();
    assertMvError(captures, /mv: source et destination requises/, 'Un seul argument');
    
    console.log('✅ DEBIAN CONFORME: Gestion des arguments insuffisants');
    return true;
}

/**
 * TEST 7: mv identique (source = destination)
 */
function testDebianSameFile() {
    console.log('🧪 TEST DEBIAN: mv vers le même fichier');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer un fichier
    testUtils.createTestFile(context, '/root/samefile.txt', 'contenu');
    
    // Essayer de le déplacer vers lui-même
    cmdMv(['samefile.txt', 'samefile.txt'], context);
    
    // COMPORTEMENT: Message spécifique "même fichier" en français
    const captures = getCaptures();
    assertMvError(captures, /mv:.*sont le même fichier/, 'Même fichier source et destination');
    
    // Vérifier que le fichier n'a pas changé
    assert.fileExists(context, '/root/samefile.txt', 'Le fichier doit toujours exister');
    assert.equals(context.fileSystem['/root/samefile.txt'].content, 'contenu', 'Le contenu ne doit pas changer');
    
    console.log('✅ CONFORME: Détection même fichier');
    return true;
}

/**
 * TEST 8: Préservation des métadonnées lors du déplacement
 */
function testDebianMetadataPreservation() {
    console.log('🧪 TEST DEBIAN: Préservation des métadonnées');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer un fichier avec des métadonnées spécifiques
    const originalDate = new Date('2023-01-01T10:00:00Z');
    testUtils.createTestFile(context, '/root/metadata-test.txt', 'test contenu');
    
    const originalFile = context.fileSystem['/root/metadata-test.txt'];
    originalFile.created = originalDate;
    originalFile.accessed = originalDate;
    originalFile.owner = 'testuser';
    originalFile.group = 'testgroup';
    originalFile.permissions = '-rw-r--r--';
    
    // Déplacer le fichier
    cmdMv(['metadata-test.txt', 'moved-file.txt'], context);
    
    // Vérifier que les métadonnées importantes sont préservées
    const movedFile = context.fileSystem['/root/moved-file.txt'];
    assert.equals(movedFile.created.getTime(), originalDate.getTime(), 'Date de création préservée');
    assert.equals(movedFile.accessed.getTime(), originalDate.getTime(), 'Date d\'accès préservée');
    assert.equals(movedFile.owner, 'testuser', 'Propriétaire préservé');
    assert.equals(movedFile.group, 'testgroup', 'Groupe préservé');
    assert.equals(movedFile.permissions, '-rw-r--r--', 'Permissions préservées');
    assert.equals(movedFile.content, 'test contenu', 'Contenu préservé');
    
    // La date de modification doit être mise à jour
    assert.isTrue(movedFile.modified > originalDate, 'Date de modification doit être mise à jour');
    
    console.log('✅ DEBIAN CONFORME: Préservation métadonnées');
    return true;
}

// Exporter les tests
export const mvDebianTests = [
    createTest('mv - Renommage simple (Debian)', testDebianSimpleRename),
    createTest('mv - Déplacement vers répertoire (Debian)', testDebianMoveFileToDirectory),
    createTest('mv - Déplacement répertoire entier (Debian)', testDebianMoveDirectory),
    createTest('mv - Erreur source inexistant (Debian)', testDebianSourceNotFound),
    createTest('mv - Écrasement silencieux destination (Debian)', testDebianDestinationExists),
    createTest('mv - Erreur arguments insuffisants (Debian)', testDebianInsufficientArgs),
    createTest('mv - Même fichier source/dest (Debian)', testDebianSameFile),
    createTest('mv - Préservation métadonnées (Debian)', testDebianMetadataPreservation)
];

export default mvDebianTests;