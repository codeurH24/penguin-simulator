// test-cases/commands/touch/options.test.js - Tests des options pour touch
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdTouch } from '../../../../bin/touch.js';

/**
 * Test de l'option -c (no-create)
 */
function testNoCreateOption() {
    clearCaptures();
    const context = createTestContext();
    
    // Vérifier qu'aucun fichier n'existe au départ
    assert.fileNotExists(context, '/root/nonexistent.txt', 'Le fichier ne devrait pas exister au départ');
    
    // Utiliser touch -c sur un fichier inexistant
    cmdTouch(['-c', 'nonexistent.txt'], context);
    
    // Vérifier que le fichier n'a pas été créé
    assert.fileNotExists(context, '/root/nonexistent.txt', 'Le fichier ne devrait pas être créé avec -c');
    
    // Créer un fichier existant pour tester la mise à jour
    testUtils.createTestFile(context, '/root/existing.txt', 'contenu');
    const oldTime = new Date(Date.now() - 5000); // 5 secondes avant
    context.fileSystem['/root/existing.txt'].modified = oldTime;
    context.fileSystem['/root/existing.txt'].accessed = oldTime;
    
    // Utiliser touch -c sur un fichier existant
    cmdTouch(['-c', 'existing.txt'], context);
    
    // Vérifier que les dates ont été mises à jour
    const updatedFile = context.fileSystem['/root/existing.txt'];
    assert.isTrue(updatedFile.modified > oldTime, 'La date de modification devrait être mise à jour');
    assert.isTrue(updatedFile.accessed > oldTime, 'La date d\'accès devrait être mise à jour');
    
    console.log('✅ Option -c (no-create) fonctionne');
    return true;
}

/**
 * Test de l'option -a (access time only)
 */
function testAccessTimeOnlyOption() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un fichier avec des dates anciennes
    testUtils.createTestFile(context, '/root/access-test.txt', 'contenu');
    const oldTime = new Date(Date.now() - 10000); // 10 secondes avant
    context.fileSystem['/root/access-test.txt'].modified = oldTime;
    context.fileSystem['/root/access-test.txt'].accessed = oldTime;
    
    const originalModified = context.fileSystem['/root/access-test.txt'].modified;
    
    // Utiliser touch -a
    cmdTouch(['-a', 'access-test.txt'], context);
    
    const updatedFile = context.fileSystem['/root/access-test.txt'];
    
    // Vérifier que seule la date d'accès a été mise à jour
    assert.isTrue(updatedFile.accessed > oldTime, 'La date d\'accès devrait être mise à jour');
    assert.equals(updatedFile.modified.getTime(), originalModified.getTime(), 'La date de modification ne devrait pas changer');
    
    console.log('✅ Option -a (access time only) fonctionne');
    return true;
}

/**
 * Test de l'option -m (modify time only)
 */
function testModifyTimeOnlyOption() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un fichier avec des dates anciennes
    testUtils.createTestFile(context, '/root/modify-test.txt', 'contenu');
    const oldTime = new Date(Date.now() - 10000); // 10 secondes avant
    context.fileSystem['/root/modify-test.txt'].modified = oldTime;
    context.fileSystem['/root/modify-test.txt'].accessed = oldTime;
    
    const originalAccessed = context.fileSystem['/root/modify-test.txt'].accessed;
    
    // Utiliser touch -m
    cmdTouch(['-m', 'modify-test.txt'], context);
    
    const updatedFile = context.fileSystem['/root/modify-test.txt'];
    
    // Vérifier que seule la date de modification a été mise à jour
    assert.isTrue(updatedFile.modified > oldTime, 'La date de modification devrait être mise à jour');
    assert.equals(updatedFile.accessed.getTime(), originalAccessed.getTime(), 'La date d\'accès ne devrait pas changer');
    
    console.log('✅ Option -m (modify time only) fonctionne');
    return true;
}

/**
 * Test de l'option -r (reference file)
 */
function testReferenceFileOption() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un fichier de référence avec des dates spécifiques
    testUtils.createTestFile(context, '/root/reference.txt', 'référence');
    const refTime = new Date(2023, 5, 15, 10, 30, 0); // 15 juin 2023, 10:30
    context.fileSystem['/root/reference.txt'].modified = refTime;
    context.fileSystem['/root/reference.txt'].accessed = refTime;
    
    // Créer un fichier cible avec des dates différentes
    testUtils.createTestFile(context, '/root/target.txt', 'cible');
    const nowTime = new Date();
    context.fileSystem['/root/target.txt'].modified = nowTime;
    context.fileSystem['/root/target.txt'].accessed = nowTime;
    
    // Utiliser touch -r pour copier les dates
    cmdTouch(['-r', 'reference.txt', 'target.txt'], context);
    
    const targetFile = context.fileSystem['/root/target.txt'];
    
    // Vérifier que les dates ont été copiées
    assert.equals(targetFile.modified.getTime(), refTime.getTime(), 'La date de modification devrait être copiée');
    assert.equals(targetFile.accessed.getTime(), refTime.getTime(), 'La date d\'accès devrait être copiée');
    
    console.log('✅ Option -r (reference file) fonctionne');
    return true;
}

/**
 * Test de l'option -r avec fichier de référence inexistant
 */
function testReferenceFileNotFound() {
    clearCaptures();
    const context = createTestContext();
    
    // S'assurer qu'aucun fichier n'existe au départ (nettoyage complet)
    delete context.fileSystem['/root/nonexistent-ref.txt'];
    delete context.fileSystem['/root/target.txt'];
    
    // Vérifications préliminaires
    assert.fileNotExists(context, '/root/nonexistent-ref.txt', 'Le fichier de référence ne devrait pas exister au départ');
    assert.fileNotExists(context, '/root/target.txt', 'Le fichier cible ne devrait pas exister au départ');
    
    // Essayer d'utiliser un fichier de référence inexistant
    cmdTouch(['-r', 'nonexistent-ref.txt', 'target.txt'], context);
    
    // Vérifier qu'une erreur a été capturée
    const captures = getCaptures();
    const hasError = captures.some(capture => 
        capture.className === 'error' && capture.text.includes('Fichier de référence introuvable')
    );
    
    assert.isTrue(hasError, 'Une erreur devrait être affichée pour un fichier de référence inexistant');
    
    // VÉRIFICATION CRITIQUE : le fichier cible ne doit PAS être créé
    assert.fileNotExists(context, '/root/target.txt', 'Le fichier cible ne devrait pas être créé quand le fichier de référence n\'existe pas');
    
    console.log('✅ Erreur correcte pour fichier de référence inexistant');
    return true;
}

/**
 * Test de combinaisons d'options
 */
function testCombinedOptions() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un fichier avec des dates anciennes
    const testFile = 'combined-options-test.txt';
    testUtils.createTestFile(context, `/root/${testFile}`, 'contenu');
    const oldTime = new Date(Date.now() - 10000); // 10 secondes avant
    context.fileSystem[`/root/${testFile}`].modified = oldTime;
    context.fileSystem[`/root/${testFile}`].accessed = oldTime;
    
    const originalModified = new Date(context.fileSystem[`/root/${testFile}`].modified);
    const originalAccessed = new Date(context.fileSystem[`/root/${testFile}`].accessed);
    
    // Tester -am (access time + modify time ensemble)
    clearCaptures();
    cmdTouch(['-am', testFile], context);
    
    const updatedFile = context.fileSystem[`/root/${testFile}`];
    
    // Avec -am, les DEUX dates devraient être mises à jour
    assert.isTrue(updatedFile.accessed > originalAccessed, 'La date d\'accès devrait être mise à jour avec -am');
    assert.isTrue(updatedFile.modified > originalModified, 'La date de modification devrait être mise à jour avec -am');
    
    console.log('✅ Combinaisons d\'options fonctionnent');
    return true;
}

/**
 * Test avec option invalide
 */
function testInvalidOption() {
    clearCaptures();
    const context = createTestContext();
    
    // Les options invalides sont filtrées silencieusement dans l'implémentation actuelle
    // Mais on peut tester qu'aucun fichier n'est créé si toutes les options sont invalides
    cmdTouch(['-z'], context); // Option inexistante
    
    // Vérifier qu'aucune erreur n'est générée mais qu'aucun fichier n'est créé non plus
    const captures = getCaptures();
    const hasError = captures.some(capture => 
        capture.className === 'error' && capture.text.includes('aucun fichier spécifié')
    );
    
    assert.isTrue(hasError, 'Une erreur devrait être affichée car aucun fichier n\'est spécifié après filtrage des options');
    
    console.log('✅ Gestion des options invalides');
    return true;
}

/**
 * Test de création de nouveau fichier avec option -r
 */
function testNewFileWithReference() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un fichier de référence
    testUtils.createTestFile(context, '/root/ref.txt', 'référence');
    const refTime = new Date(2023, 5, 15, 14, 30, 0);
    context.fileSystem['/root/ref.txt'].modified = refTime;
    context.fileSystem['/root/ref.txt'].accessed = refTime;
    
    // Créer un nouveau fichier avec les dates de référence
    cmdTouch(['-r', 'ref.txt', 'new-with-ref.txt'], context);
    
    assert.fileExists(context, '/root/new-with-ref.txt', 'Le nouveau fichier devrait être créé');
    
    const newFile = context.fileSystem['/root/new-with-ref.txt'];
    
    // Vérifier que les dates de référence ont été appliquées
    assert.equals(newFile.modified.getTime(), refTime.getTime(), 'La date de modification devrait correspondre à la référence');
    assert.equals(newFile.accessed.getTime(), refTime.getTime(), 'La date d\'accès devrait correspondre à la référence');
    
    console.log('✅ Nouveau fichier avec référence fonctionne');
    return true;
}

/**
 * Export des tests des options pour touch
 */
export const touchOptionsTests = [
    createTest('Option -c (no-create)', testNoCreateOption),
    createTest('Option -a (access time only)', testAccessTimeOnlyOption),
    createTest('Option -m (modify time only)', testModifyTimeOnlyOption),
    createTest('Option -r (reference file)', testReferenceFileOption),
    createTest('Fichier de référence inexistant (erreur)', testReferenceFileNotFound),
    createTest('Combinaisons d\'options', testCombinedOptions),
    createTest('Option invalide', testInvalidOption),
    createTest('Nouveau fichier avec référence', testNewFileWithReference)
];