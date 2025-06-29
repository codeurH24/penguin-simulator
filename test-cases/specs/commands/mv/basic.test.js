// test-cases/specs/commands/mv/basic.test.js - Tests de base pour mv
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdMv } from '../../../../bin/mv/mv.js';

/**
 * Vérifie si une erreur correspond aux messages d'erreur attendus de mv
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
                       text.includes('no such file or directory');
                       
            case 'same_file':
                return text.includes('sont le même fichier') ||
                       text.includes('are the same file');
                       
            case 'exists':
                return text.includes('destination existe déjà') ||
                       text.includes('destination already exists');
                       
            case 'missing_args':
                return text.includes('source et destination requises') ||
                       text.includes('missing operand');
                       
            default:
                return false;
        }
    });
}

/**
 * Test de renommage d'un fichier simple
 */
function testSimpleFileRename() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un fichier de test
    testUtils.createTestFile(context, '/root/oldname.txt', 'contenu test');
    assert.fileExists(context, '/root/oldname.txt', 'Le fichier source devrait exister');
    assert.fileNotExists(context, '/root/newname.txt', 'Le fichier destination ne devrait pas exister');
    
    // Renommer le fichier
    cmdMv(['oldname.txt', 'newname.txt'], context);
    
    // Vérifications
    assert.fileNotExists(context, '/root/oldname.txt', 'Le fichier source ne devrait plus exister');
    assert.fileExists(context, '/root/newname.txt', 'Le fichier destination devrait exister');
    assert.isFile(context, '/root/newname.txt', 'La destination devrait être un fichier');
    
    // Vérifier que le contenu est préservé
    const file = context.fileSystem['/root/newname.txt'];
    assert.equals(file.content, 'contenu test', 'Le contenu devrait être préservé');
    
    console.log('✅ Renommage de fichier simple');
    return true;
}

/**
 * Test de déplacement d'un fichier vers un dossier
 */
function testMoveFileToDirectory() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un fichier et un dossier de destination
    testUtils.createTestFile(context, '/root/file.txt', 'contenu');
    testUtils.createTestDirectory(context, '/root/target-dir');
    
    assert.fileExists(context, '/root/file.txt', 'Le fichier source devrait exister');
    assert.isDirectory(context, '/root/target-dir', 'Le dossier destination devrait exister');
    
    // Déplacer le fichier vers le dossier
    cmdMv(['file.txt', 'target-dir'], context);
    
    // Vérifications
    assert.fileNotExists(context, '/root/file.txt', 'Le fichier source ne devrait plus exister');
    assert.fileExists(context, '/root/target-dir/file.txt', 'Le fichier devrait être dans le dossier destination');
    assert.isFile(context, '/root/target-dir/file.txt', 'Devrait être un fichier');
    
    // Vérifier que le contenu est préservé
    const file = context.fileSystem['/root/target-dir/file.txt'];
    assert.equals(file.content, 'contenu', 'Le contenu devrait être préservé');
    
    console.log('✅ Déplacement de fichier vers dossier');
    return true;
}

/**
 * Test de déplacement d'un dossier
 */
function testMoveDirectory() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un dossier source avec du contenu
    testUtils.createTestDirectory(context, '/root/source-dir');
    testUtils.createTestFile(context, '/root/source-dir/file.txt', 'contenu');
    testUtils.createTestDirectory(context, '/root/source-dir/subdir');
    
    assert.fileExists(context, '/root/source-dir', 'Le dossier source devrait exister');
    assert.fileExists(context, '/root/source-dir/file.txt', 'Le fichier dans le dossier devrait exister');
    assert.fileExists(context, '/root/source-dir/subdir', 'Le sous-dossier devrait exister');
    
    // Renommer le dossier
    cmdMv(['source-dir', 'renamed-dir'], context);
    
    // Vérifications
    assert.fileNotExists(context, '/root/source-dir', 'Le dossier source ne devrait plus exister');
    assert.fileExists(context, '/root/renamed-dir', 'Le dossier renommé devrait exister');
    assert.isDirectory(context, '/root/renamed-dir', 'Devrait être un dossier');
    
    // Vérifier que le contenu a été déplacé
    assert.fileExists(context, '/root/renamed-dir/file.txt', 'Le fichier devrait être déplacé');
    assert.fileExists(context, '/root/renamed-dir/subdir', 'Le sous-dossier devrait être déplacé');
    
    // Vérifier que l'ancien contenu n'existe plus
    assert.fileNotExists(context, '/root/source-dir/file.txt', 'L\'ancien fichier ne devrait plus exister');
    assert.fileNotExists(context, '/root/source-dir/subdir', 'L\'ancien sous-dossier ne devrait plus exister');
    
    console.log('✅ Déplacement de dossier avec contenu');
    return true;
}

/**
 * Test d'erreur : fichier source inexistant
 */
function testNonexistentSource() {
    clearCaptures();
    const context = createTestContext();
    
    // S'assurer que le fichier source n'existe pas
    assert.fileNotExists(context, '/root/nonexistent.txt', 'Le fichier source ne devrait pas exister');
    
    // Essayer de déplacer un fichier inexistant
    cmdMv(['nonexistent.txt', 'destination.txt'], context);
    
    // Vérifier qu'une erreur a été capturée
    const captures = getCaptures();
    const hasError = hasExpectedError(captures, 'not_found');
    
    assert.isTrue(hasError, 'Une erreur devrait être affichée pour un fichier source inexistant');
    
    // Vérifier qu'aucun fichier n'a été créé
    assert.fileNotExists(context, '/root/destination.txt', 'Aucun fichier destination ne devrait être créé');
    
    console.log('✅ Erreur correcte pour fichier source inexistant');
    return true;
}

/**
 * Test de comportement Debian : écrasement silencieux de la destination
 */
function testDestinationExists() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un fichier source et un fichier destination existant
    testUtils.createTestFile(context, '/root/source.txt', 'contenu source');
    testUtils.createTestFile(context, '/root/existing.txt', 'contenu existant');
    
    assert.fileExists(context, '/root/source.txt', 'Le fichier source devrait exister');
    assert.fileExists(context, '/root/existing.txt', 'Le fichier destination devrait exister');
    
    // Vérifier le contenu initial
    const initialSource = context.fileSystem['/root/source.txt'];
    const initialDest = context.fileSystem['/root/existing.txt'];
    assert.equals(initialSource.content, 'contenu source', 'Contenu source initial');
    assert.equals(initialDest.content, 'contenu existant', 'Contenu destination initial');
    
    // COMPORTEMENT DEBIAN: mv écrase silencieusement le fichier existant
    cmdMv(['source.txt', 'existing.txt'], context);
    
    // Vérifier qu'AUCUNE erreur n'a été capturée (comportement Debian)
    const captures = getCaptures();
    assert.captureCount(0, 'mv doit être silencieux lors de l\'écrasement (comportement Debian)');
    
    // COMPORTEMENT DEBIAN: Vérifications après écrasement
    assert.fileNotExists(context, '/root/source.txt', 'Le fichier source ne devrait plus exister');
    assert.fileExists(context, '/root/existing.txt', 'Le fichier destination devrait toujours exister');
    
    // ESSENTIEL: Le contenu de destination doit maintenant être celui de source
    const finalFile = context.fileSystem['/root/existing.txt'];
    assert.equals(finalFile.content, 'contenu source', 'Le contenu destination devrait être écrasé par celui de source');
    
    console.log('✅ DEBIAN CONFORME: Écrasement silencieux de destination existante');
    return true;
}

/**
 * Test d'erreur : source et destination identiques
 */
function testSameSourceAndDestination() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un fichier
    testUtils.createTestFile(context, '/root/samefile.txt', 'contenu');
    assert.fileExists(context, '/root/samefile.txt', 'Le fichier devrait exister');
    
    // Essayer de déplacer vers lui-même
    cmdMv(['samefile.txt', 'samefile.txt'], context);
    
    // Vérifier qu'une erreur a été capturée
    const captures = getCaptures();
    const hasError = hasExpectedError(captures, 'same_file');
    
    assert.isTrue(hasError, 'Une erreur devrait être affichée pour source = destination');
    
    // Le fichier devrait toujours exister et être inchangé
    assert.fileExists(context, '/root/samefile.txt', 'Le fichier devrait toujours exister');
    const file = context.fileSystem['/root/samefile.txt'];
    assert.equals(file.content, 'contenu', 'Le contenu ne devrait pas changer');
    
    console.log('✅ Erreur correcte pour source = destination');
    return true;
}

/**
 * Test d'erreur : arguments manquants
 */
function testMissingArguments() {
    clearCaptures();
    const context = createTestContext();
    
    // Test avec aucun argument
    clearCaptures();
    cmdMv([], context);
    
    let captures = getCaptures();
    let hasError = hasExpectedError(captures, 'missing_args');
    
    assert.isTrue(hasError, 'Une erreur devrait être affichée sans arguments');
    
    // Test avec un seul argument
    clearCaptures();
    cmdMv(['seul-argument'], context);
    
    captures = getCaptures();
    hasError = hasExpectedError(captures, 'missing_args');
    
    assert.isTrue(hasError, 'Une erreur devrait être affichée avec un seul argument');
    
    console.log('✅ Erreur correcte pour arguments manquants');
    return true;
}

/**
 * Test avec chemins absolus
 */
function testAbsolutePaths() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un fichier avec chemin absolu
    testUtils.createTestFile(context, '/root/absolute-test.txt', 'contenu absolu');
    assert.fileExists(context, '/root/absolute-test.txt', 'Le fichier devrait exister');
    
    // Déplacer avec chemins absolus
    cmdMv(['/root/absolute-test.txt', '/root/moved-absolute.txt'], context);
    
    // Vérifications
    assert.fileNotExists(context, '/root/absolute-test.txt', 'Le fichier source ne devrait plus exister');
    assert.fileExists(context, '/root/moved-absolute.txt', 'Le fichier destination devrait exister');
    
    const file = context.fileSystem['/root/moved-absolute.txt'];
    assert.equals(file.content, 'contenu absolu', 'Le contenu devrait être préservé');
    
    console.log('✅ Déplacement avec chemins absolus');
    return true;
}

/**
 * Test avec chemins relatifs dans sous-dossier
 */
function testRelativePathsInSubdirectory() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer une structure de dossiers
    testUtils.createTestDirectory(context, '/root/subdir');
    testUtils.createTestFile(context, '/root/subdir/file.txt', 'contenu sous-dossier');
    
    assert.fileExists(context, '/root/subdir/file.txt', 'Le fichier devrait exister');
    
    // Déplacer avec chemins relatifs
    cmdMv(['subdir/file.txt', 'moved-from-sub.txt'], context);
    
    // Vérifications
    assert.fileNotExists(context, '/root/subdir/file.txt', 'Le fichier source ne devrait plus exister');
    assert.fileExists(context, '/root/moved-from-sub.txt', 'Le fichier destination devrait exister');
    
    const file = context.fileSystem['/root/moved-from-sub.txt'];
    assert.equals(file.content, 'contenu sous-dossier', 'Le contenu devrait être préservé');
    
    console.log('✅ Déplacement avec chemins relatifs');
    return true;
}

/**
 * Test de préservation des métadonnées
 */
function testMetadataPreservation() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un fichier avec métadonnées spécifiques
    testUtils.createTestFile(context, '/root/metadata-test.txt', 'contenu test');
    const originalFile = context.fileSystem['/root/metadata-test.txt'];
    
    // Modifier quelques métadonnées pour le test
    const oldCreated = new Date(2023, 5, 15, 10, 30, 0);
    const oldAccessed = new Date(2023, 5, 16, 14, 45, 0);
    originalFile.created = oldCreated;
    originalFile.accessed = oldAccessed;
    originalFile.permissions = '-rw-r--r--';
    originalFile.owner = 'root';
    originalFile.group = 'root';
    
    // Déplacer le fichier
    cmdMv(['metadata-test.txt', 'moved-metadata.txt'], context);
    
    // Vérifier que les métadonnées sont préservées (sauf la date de modification)
    const movedFile = context.fileSystem['/root/moved-metadata.txt'];
    
    assert.equals(movedFile.content, 'contenu test', 'Le contenu devrait être préservé');
    assert.equals(movedFile.size, originalFile.size, 'La taille devrait être préservée');
    assert.equals(movedFile.created.getTime(), oldCreated.getTime(), 'La date de création devrait être préservée');
    assert.equals(movedFile.accessed.getTime(), oldAccessed.getTime(), 'La date d\'accès devrait être préservée');
    assert.equals(movedFile.permissions, '-rw-r--r--', 'Les permissions devraient être préservées');
    assert.equals(movedFile.owner, 'root', 'Le propriétaire devrait être préservé');
    assert.equals(movedFile.group, 'root', 'Le groupe devrait être préservé');
    
    // La date de modification devrait être mise à jour
    assert.isTrue(movedFile.modified > oldCreated, 'La date de modification devrait être mise à jour');
    
    console.log('✅ Métadonnées préservées lors du déplacement');
    return true;
}

/**
 * Export des tests de base pour mv
 */
export const mvBasicTests = [
    createTest('Renommage fichier simple', testSimpleFileRename),
    createTest('Déplacement fichier vers dossier', testMoveFileToDirectory),
    createTest('Déplacement dossier avec contenu', testMoveDirectory),
    createTest('Fichier source inexistant (erreur)', testNonexistentSource),
    createTest('Destination existe déjà (erreur)', testDestinationExists),
    createTest('Source = destination (erreur)', testSameSourceAndDestination),
    createTest('Arguments manquants (erreur)', testMissingArguments),
    createTest('Chemins absolus', testAbsolutePaths),
    createTest('Chemins relatifs sous-dossier', testRelativePathsInSubdirectory),
    createTest('Préservation des métadonnées', testMetadataPreservation)
];