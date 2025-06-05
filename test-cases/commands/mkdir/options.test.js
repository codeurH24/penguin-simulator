// test-cases/commands/mkdir/options.test.js - Tests des options pour mkdir
import { createTestContext, clearCaptures, getCaptures } from '../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../lib/helpers.js';
import { createTest } from '../../lib/runner.js';
import { cmdMkdir } from '../../../bin/mkdir.js';

/**
 * Test de l'option -p pour créer les répertoires parents
 */
function testParentDirectoriesOption() {
    clearCaptures();
    const context = createTestContext();
    
    // Vérifier que le chemin n'existe pas au départ
    assert.fileNotExists(context, '/root/level1', 'level1 ne devrait pas exister au départ');
    assert.fileNotExists(context, '/root/level1/level2', 'level1/level2 ne devrait pas exister au départ');
    assert.fileNotExists(context, '/root/level1/level2/level3', 'level1/level2/level3 ne devrait pas exister au départ');
    
    // Créer avec l'option -p
    cmdMkdir(['-p', 'level1/level2/level3'], context);
    
    testUtils.debugFileSystem(context, 'Après mkdir -p');
    
    // Vérifier que tous les niveaux ont été créés
    assert.fileExists(context, '/root/level1', 'level1 devrait être créé');
    assert.fileExists(context, '/root/level1/level2', 'level1/level2 devrait être créé');
    assert.fileExists(context, '/root/level1/level2/level3', 'level1/level2/level3 devrait être créé');
    
    // Vérifier que ce sont bien des dossiers
    assert.isDirectory(context, '/root/level1', 'level1 devrait être un dossier');
    assert.isDirectory(context, '/root/level1/level2', 'level1/level2 devrait être un dossier');
    assert.isDirectory(context, '/root/level1/level2/level3', 'level1/level2/level3 devrait être un dossier');
    
    console.log('✅ Option -p crée les répertoires parents');
    return true;
}

/**
 * Test de mkdir sans -p sur un chemin inexistant (erreur attendue)
 */
function testWithoutParentOption() {
    clearCaptures();
    const context = createTestContext();
    
    // Essayer de créer sans l'option -p (devrait échouer)
    cmdMkdir(['nonexistent/subfolder'], context);
    
    // Vérifier qu'une erreur a été capturée
    const captures = getCaptures();
    const hasError = captures.some(capture => 
        capture.className === 'error' && capture.text.includes('répertoire parent n\'existe pas')
    );
    
    assert.isTrue(hasError, 'Une erreur devrait être affichée sans -p');
    
    // Vérifier que le dossier n'a pas été créé
    assert.fileNotExists(context, '/root/nonexistent', 'nonexistent ne devrait pas être créé');
    assert.fileNotExists(context, '/root/nonexistent/subfolder', 'nonexistent/subfolder ne devrait pas être créé');
    
    console.log('✅ Erreur correcte sans option -p');
    return true;
}

/**
 * Test de l'option -p avec dossier déjà existant (ne devrait pas donner d'erreur)
 */
function testParentOptionWithExisting() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer d'abord un dossier normalement
    cmdMkdir(['existing-dir'], context);
    assert.fileExists(context, '/root/existing-dir', 'existing-dir devrait être créé');
    
    clearCaptures(); // Vider les captures
    
    // Essayer de le recréer avec -p (ne devrait pas donner d'erreur)
    cmdMkdir(['-p', 'existing-dir'], context);
    
    // Vérifier qu'aucune erreur n'a été capturée
    const captures = getCaptures();
    const hasError = captures.some(capture => capture.className === 'error');
    
    assert.isFalse(hasError, 'Aucune erreur ne devrait être affichée avec -p sur dossier existant');
    
    // Le dossier devrait toujours exister
    assert.fileExists(context, '/root/existing-dir', 'existing-dir devrait toujours exister');
    
    console.log('✅ Option -p silencieuse sur dossier existant');
    return true;
}

/**
 * Test de création de plusieurs chemins avec -p
 */
function testMultiplePathsWithParents() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer plusieurs chemins avec -p
    cmdMkdir(['-p', 'project1/src/main', 'project2/docs/api', 'project3/tests/unit'], context);
    
    // Vérifier que tous les chemins ont été créés
    assert.fileExists(context, '/root/project1', 'project1 devrait être créé');
    assert.fileExists(context, '/root/project1/src', 'project1/src devrait être créé');
    assert.fileExists(context, '/root/project1/src/main', 'project1/src/main devrait être créé');
    
    assert.fileExists(context, '/root/project2', 'project2 devrait être créé');
    assert.fileExists(context, '/root/project2/docs', 'project2/docs devrait être créé');
    assert.fileExists(context, '/root/project2/docs/api', 'project2/docs/api devrait être créé');
    
    assert.fileExists(context, '/root/project3', 'project3 devrait être créé');
    assert.fileExists(context, '/root/project3/tests', 'project3/tests devrait être créé');
    assert.fileExists(context, '/root/project3/tests/unit', 'project3/tests/unit devrait être créé');
    
    console.log('✅ Plusieurs chemins avec -p créés');
    return true;
}

/**
 * Test de l'option -p avec un seul niveau (comportement normal)
 */
function testParentOptionSingleLevel() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un dossier simple avec -p
    cmdMkdir(['-p', 'simple-folder'], context);
    
    assert.fileExists(context, '/root/simple-folder', 'simple-folder devrait être créé');
    assert.isDirectory(context, '/root/simple-folder', 'simple-folder devrait être un dossier');
    
    console.log('✅ Option -p fonctionne avec un seul niveau');
    return true;
}

/**
 * Test de l'option -p sans nom de dossier (erreur attendue)
 */
function testParentOptionNoArguments() {
    clearCaptures();
    const context = createTestContext();
    
    // Appeler mkdir -p sans arguments
    cmdMkdir(['-p'], context);
    
    // Vérifier qu'une erreur a été capturée
    const captures = getCaptures();
    const hasError = captures.some(capture => 
        capture.className === 'error' && capture.text.includes('nom de dossier manquant')
    );
    
    assert.isTrue(hasError, 'Une erreur devrait être affichée pour -p sans arguments');
    console.log('✅ Erreur correcte pour -p sans arguments');
    return true;
}

/**
 * Export des tests des options pour mkdir
 */
export const mkdirOptionsTests = [
    createTest('Option -p (répertoires parents)', testParentDirectoriesOption),
    createTest('Sans option -p (erreur)', testWithoutParentOption),
    createTest('Option -p sur dossier existant', testParentOptionWithExisting),
    createTest('Plusieurs chemins avec -p', testMultiplePathsWithParents),
    createTest('Option -p un seul niveau', testParentOptionSingleLevel),
    createTest('Option -p sans arguments (erreur)', testParentOptionNoArguments)
];