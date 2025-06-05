// test-cases/specs/commands/rm/options.test.js - Tests des options pour rm (version finale)
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
                       text.includes('cannot remove') ||
                       text.includes('aucun fichier ne correspond au motif');
                       
            case 'is_directory':
                return text.includes('est un répertoire') ||
                       text.includes('is a directory');
                       
            default:
                return false;
        }
    });
}

/**
 * Test de l'option -r (récursif) avec dossier contenant des fichiers
 */
function testRecursiveWithFiles() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer une structure de dossiers avec des fichiers
    testUtils.createTestDirectory(context, '/root/parent');
    testUtils.createTestDirectory(context, '/root/parent/child');
    testUtils.createTestFile(context, '/root/parent/file1.txt', 'contenu1');
    testUtils.createTestFile(context, '/root/parent/file2.txt', 'contenu2');
    testUtils.createTestFile(context, '/root/parent/child/nested.txt', 'contenu nested');
    
    // Vérifier que tout existe
    assert.fileExists(context, '/root/parent', 'parent devrait exister');
    assert.fileExists(context, '/root/parent/child', 'parent/child devrait exister');
    assert.fileExists(context, '/root/parent/file1.txt', 'parent/file1.txt devrait exister');
    assert.fileExists(context, '/root/parent/file2.txt', 'parent/file2.txt devrait exister');
    assert.fileExists(context, '/root/parent/child/nested.txt', 'parent/child/nested.txt devrait exister');
    
    testUtils.debugFileSystem(context, 'Avant rm -r');
    
    // Supprimer récursivement
    cmdRm(['-r', 'parent'], context);
    
    testUtils.debugFileSystem(context, 'Après rm -r');
    
    // Vérifier que tout a été supprimé
    assert.fileNotExists(context, '/root/parent', 'parent devrait être supprimé');
    assert.fileNotExists(context, '/root/parent/child', 'parent/child devrait être supprimé');
    assert.fileNotExists(context, '/root/parent/file1.txt', 'parent/file1.txt devrait être supprimé');
    assert.fileNotExists(context, '/root/parent/file2.txt', 'parent/file2.txt devrait être supprimé');
    assert.fileNotExists(context, '/root/parent/child/nested.txt', 'parent/child/nested.txt devrait être supprimé');
    
    console.log('✅ Suppression récursive avec fichiers');
    return true;
}

/**
 * Test de l'option -f (forcer) avec fichiers inexistants
 */
function testForceOptionWithNonexistentFiles() {
    clearCaptures();
    const context = createTestContext();
    
    // S'assurer qu'aucun fichier n'existe
    assert.fileNotExists(context, '/root/nonexistent1.txt', 'nonexistent1.txt ne devrait pas exister');
    assert.fileNotExists(context, '/root/nonexistent2.txt', 'nonexistent2.txt ne devrait pas exister');
    
    // Essayer de supprimer avec -f
    cmdRm(['-f', 'nonexistent1.txt', 'nonexistent2.txt'], context);
    
    // Avec -f, aucune erreur ne devrait être affichée
    const captures = getCaptures();
    const hasError = captures.some(capture => capture.className === 'error');
    
    assert.isFalse(hasError, 'Aucune erreur ne devrait être affichée avec -f');
    
    console.log('✅ Option -f masque les erreurs pour fichiers inexistants');
    return true;
}

/**
 * Test de l'option -f sans fichiers existants vs avec fichiers existants
 */
function testForceOptionMixedFiles() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer seulement un fichier
    testUtils.createTestFile(context, '/root/exists.txt', 'contenu');
    assert.fileExists(context, '/root/exists.txt', 'exists.txt devrait exister');
    assert.fileNotExists(context, '/root/notexists.txt', 'notexists.txt ne devrait pas exister');
    
    // Supprimer les deux avec -f
    cmdRm(['-f', 'exists.txt', 'notexists.txt'], context);
    
    // Le fichier existant devrait être supprimé
    assert.fileNotExists(context, '/root/exists.txt', 'exists.txt devrait être supprimé');
    
    // Aucune erreur ne devrait être affichée
    const captures = getCaptures();
    const hasError = captures.some(capture => capture.className === 'error');
    
    assert.isFalse(hasError, 'Aucune erreur ne devrait être affichée avec -f');
    
    console.log('✅ Option -f fonctionne avec fichiers mixtes');
    return true;
}

/**
 * Test des options combinées -rf
 */
function testCombinedRecursiveForce() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer une structure avec un dossier qui existe et un qui n'existe pas
    testUtils.createTestDirectory(context, '/root/existing-dir');
    testUtils.createTestFile(context, '/root/existing-dir/file.txt', 'contenu');
    
    assert.fileExists(context, '/root/existing-dir', 'existing-dir devrait exister');
    assert.fileExists(context, '/root/existing-dir/file.txt', 'existing-dir/file.txt devrait exister');
    assert.fileNotExists(context, '/root/nonexistent-dir', 'nonexistent-dir ne devrait pas exister');
    
    // Supprimer les deux avec -rf
    cmdRm(['-rf', 'existing-dir', 'nonexistent-dir'], context);
    
    // Le dossier existant devrait être supprimé
    assert.fileNotExists(context, '/root/existing-dir', 'existing-dir devrait être supprimé');
    assert.fileNotExists(context, '/root/existing-dir/file.txt', 'existing-dir/file.txt devrait être supprimé');
    
    // Aucune erreur ne devrait être affichée
    const captures = getCaptures();
    const hasError = captures.some(capture => capture.className === 'error');
    
    assert.isFalse(hasError, 'Aucune erreur ne devrait être affichée avec -rf');
    
    console.log('✅ Options combinées -rf fonctionnent');
    return true;
}

/**
 * Test des wildcards avec *
 */
function testWildcardAsterisk() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer plusieurs fichiers avec différentes extensions
    testUtils.createTestFile(context, '/root/test1.txt', 'contenu1');
    testUtils.createTestFile(context, '/root/test2.txt', 'contenu2');
    testUtils.createTestFile(context, '/root/test3.log', 'contenu3');
    testUtils.createTestFile(context, '/root/other.txt', 'contenu4');
    testUtils.createTestFile(context, '/root/README.md', 'contenu5');
    
    assert.fileExists(context, '/root/test1.txt', 'test1.txt devrait exister');
    assert.fileExists(context, '/root/test2.txt', 'test2.txt devrait exister');
    assert.fileExists(context, '/root/test3.log', 'test3.log devrait exister');
    assert.fileExists(context, '/root/other.txt', 'other.txt devrait exister');
    assert.fileExists(context, '/root/README.md', 'README.md devrait exister');
    
    // Supprimer tous les fichiers .txt avec wildcard
    cmdRm(['*.txt'], context);
    
    // Vérifier que seuls les .txt ont été supprimés
    assert.fileNotExists(context, '/root/test1.txt', 'test1.txt devrait être supprimé');
    assert.fileNotExists(context, '/root/test2.txt', 'test2.txt devrait être supprimé');
    assert.fileNotExists(context, '/root/other.txt', 'other.txt devrait être supprimé');
    
    // Les autres fichiers devraient toujours exister
    assert.fileExists(context, '/root/test3.log', 'test3.log devrait toujours exister');
    assert.fileExists(context, '/root/README.md', 'README.md devrait toujours exister');
    
    console.log('✅ Wildcard * fonctionne');
    return true;
}

/**
 * Test des wildcards avec pattern spécifique
 */
function testWildcardPattern() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer plusieurs fichiers avec des noms différents
    testUtils.createTestFile(context, '/root/data1.txt', 'contenu1');
    testUtils.createTestFile(context, '/root/data2.txt', 'contenu2');
    testUtils.createTestFile(context, '/root/data3.txt', 'contenu3');
    testUtils.createTestFile(context, '/root/info1.txt', 'contenu4');
    testUtils.createTestFile(context, '/root/backup.txt', 'contenu5');
    
    // Supprimer seulement les fichiers data* avec wildcard
    cmdRm(['data*.txt'], context);
    
    // Vérifier que seuls les data*.txt ont été supprimés
    assert.fileNotExists(context, '/root/data1.txt', 'data1.txt devrait être supprimé');
    assert.fileNotExists(context, '/root/data2.txt', 'data2.txt devrait être supprimé');
    assert.fileNotExists(context, '/root/data3.txt', 'data3.txt devrait être supprimé');
    
    // Les autres fichiers devraient toujours exister
    assert.fileExists(context, '/root/info1.txt', 'info1.txt devrait toujours exister');
    assert.fileExists(context, '/root/backup.txt', 'backup.txt devrait toujours exister');
    
    console.log('✅ Wildcard avec pattern spécifique fonctionne');
    return true;
}

/**
 * Test des wildcards avec ? (caractère unique)
 */
function testWildcardQuestionMark() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer des fichiers avec des patterns spécifiques
    testUtils.createTestFile(context, '/root/file1.txt', 'contenu1');
    testUtils.createTestFile(context, '/root/file2.txt', 'contenu2');
    testUtils.createTestFile(context, '/root/file3.txt', 'contenu3');
    testUtils.createTestFile(context, '/root/file10.txt', 'contenu4'); // Plus d'un caractère
    testUtils.createTestFile(context, '/root/data.txt', 'contenu5');
    
    // Supprimer avec pattern file?.txt (un seul caractère)
    cmdRm(['file?.txt'], context);
    
    // Vérifier que seuls les fichiers à un caractère ont été supprimés
    assert.fileNotExists(context, '/root/file1.txt', 'file1.txt devrait être supprimé');
    assert.fileNotExists(context, '/root/file2.txt', 'file2.txt devrait être supprimé');
    assert.fileNotExists(context, '/root/file3.txt', 'file3.txt devrait être supprimé');
    
    // Les autres fichiers devraient toujours exister
    assert.fileExists(context, '/root/file10.txt', 'file10.txt devrait toujours exister (2 caractères)');
    assert.fileExists(context, '/root/data.txt', 'data.txt devrait toujours exister');
    
    console.log('✅ Wildcard ? fonctionne');
    return true;
}

/**
 * Test des wildcards sans matches
 */
function testWildcardNoMatches() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer quelques fichiers qui ne matchent pas le pattern
    testUtils.createTestFile(context, '/root/file.txt', 'contenu1');
    testUtils.createTestFile(context, '/root/data.log', 'contenu2');
    
    // Essayer un pattern qui ne matche rien
    cmdRm(['*.pdf'], context);
    
    // Vérifier qu'une erreur a été émise
    const captures = getCaptures();
    const hasError = hasExpectedError(captures, 'not_found');
    
    assert.isTrue(hasError, 'Une erreur devrait être émise pour un pattern sans matches');
    
    // Les fichiers existants devraient toujours exister
    assert.fileExists(context, '/root/file.txt', 'file.txt devrait toujours exister');
    assert.fileExists(context, '/root/data.log', 'data.log devrait toujours exister');
    
    console.log('✅ Wildcard sans matches gère l\'erreur correctement');
    return true;
}

/**
 * Test des wildcards avec -f (pas d'erreur si aucun match)
 */
function testWildcardNoMatchesWithForce() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer quelques fichiers qui ne matchent pas le pattern
    testUtils.createTestFile(context, '/root/file.txt', 'contenu1');
    testUtils.createTestFile(context, '/root/data.log', 'contenu2');
    
    // Essayer un pattern qui ne matche rien avec -f
    cmdRm(['-f', '*.pdf'], context);
    
    // Avec -f, aucune erreur ne devrait être émise
    const captures = getCaptures();
    const hasError = captures.some(capture => capture.className === 'error');
    
    assert.isFalse(hasError, 'Aucune erreur ne devrait être émise avec -f même sans matches');
    
    // Les fichiers existants devraient toujours exister
    assert.fileExists(context, '/root/file.txt', 'file.txt devrait toujours exister');
    assert.fileExists(context, '/root/data.log', 'data.log devrait toujours exister');
    
    console.log('✅ Wildcard sans matches avec -f ne génère pas d\'erreur');
    return true;
}

/**
 * Test de suppression récursive avec wildcards
 */
function testRecursiveWithWildcards() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer plusieurs dossiers avec du contenu
    testUtils.createTestDirectory(context, '/root/project1');
    testUtils.createTestDirectory(context, '/root/project2');
    testUtils.createTestDirectory(context, '/root/backup');
    testUtils.createTestFile(context, '/root/project1/file1.txt', 'contenu1');
    testUtils.createTestFile(context, '/root/project2/file2.txt', 'contenu2');
    testUtils.createTestFile(context, '/root/backup/save.txt', 'contenu3');
    
    // Supprimer récursivement tous les dossiers project*
    cmdRm(['-r', 'project*'], context);
    
    // Vérifier que seuls les dossiers project* ont été supprimés
    assert.fileNotExists(context, '/root/project1', 'project1 devrait être supprimé');
    assert.fileNotExists(context, '/root/project2', 'project2 devrait être supprimé');
    assert.fileNotExists(context, '/root/project1/file1.txt', 'project1/file1.txt devrait être supprimé');
    assert.fileNotExists(context, '/root/project2/file2.txt', 'project2/file2.txt devrait être supprimé');
    
    // Le dossier backup devrait toujours exister
    assert.fileExists(context, '/root/backup', 'backup devrait toujours exister');
    assert.fileExists(context, '/root/backup/save.txt', 'backup/save.txt devrait toujours exister');
    
    console.log('✅ Suppression récursive avec wildcards fonctionne');
    return true;
}

/**
 * Export des tests des options pour rm
 */
export const rmOptionsTests = [
    createTest('Option -r (récursif) avec fichiers', testRecursiveWithFiles),
    createTest('Option -f avec fichiers inexistants', testForceOptionWithNonexistentFiles),
    createTest('Option -f avec fichiers mixtes', testForceOptionMixedFiles),
    createTest('Options combinées -rf', testCombinedRecursiveForce),
    createTest('Wildcard * (astérisque)', testWildcardAsterisk),
    createTest('Wildcard avec pattern spécifique', testWildcardPattern),
    createTest('Wildcard ? (point d\'interrogation)', testWildcardQuestionMark),
    createTest('Wildcard sans matches (erreur)', testWildcardNoMatches),
    createTest('Wildcard sans matches avec -f', testWildcardNoMatchesWithForce),
    createTest('Récursif avec wildcards', testRecursiveWithWildcards)
];