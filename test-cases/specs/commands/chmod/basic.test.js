// test-cases/specs/commands/chmod/basic.test.js
// Tests de base pour la commande chmod

import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdChmod } from '../../../../bin/chmod.js';
import { cmdMkdir } from '../../../../bin/mkdir.js';

/**
 * Test 1: Usage et affichage d'aide
 */
function testChmodUsage() {
    console.log('🧪 TEST BASIC: chmod - Affichage de l\'usage');
    
    clearCaptures();
    const context = createTestContext();
    
    // Tester sans arguments
    cmdChmod([], context);
    
    const captures = getCaptures();
    assert.isTrue(captures.length > 0, 'chmod sans arguments doit afficher l\'usage');
    
    const hasUsageMessage = captures.some(capture => 
        capture.className === 'error' && 
        capture.text.includes('Usage: chmod')
    );
    
    assert.isTrue(hasUsageMessage, 'Le message d\'usage doit être affiché');
    
    console.log('✅ chmod affiche correctement l\'usage');
    return true;
}

/**
 * Test 2: Mode numérique simple sur fichier
 */
function testChmodNumericModeFile() {
    console.log('🧪 TEST BASIC: chmod - Mode numérique sur fichier');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer un fichier test
    testUtils.createTestFile(context, '/root/test.txt', 'contenu test');
    
    // Appliquer mode numérique 755
    cmdChmod(['755', 'test.txt'], context);
    
    const captures = getCaptures();
    assert.captureCount(0, 'chmod doit être silencieux en cas de succès');
    
    // Vérifier les permissions
    const file = context.fileSystem['/root/test.txt'];
    assert.equals(file.permissions, '-rwxr-xr-x', 'Permissions 755 doivent être appliquées');
    
    console.log('✅ chmod mode numérique fonctionne sur fichier');
    return true;
}

/**
 * Test 3: Mode numérique simple sur répertoire
 */
function testChmodNumericModeDirectory() {
    console.log('🧪 TEST BASIC: chmod - Mode numérique sur répertoire');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer un répertoire test
    cmdMkdir(['test-dir'], context);
    
    // Appliquer mode numérique 700
    cmdChmod(['700', 'test-dir'], context);
    
    const captures = getCaptures();
    assert.captureCount(0, 'chmod doit être silencieux en cas de succès');
    
    // Vérifier les permissions
    const dir = context.fileSystem['/root/test-dir'];
    assert.equals(dir.permissions, 'drwx------', 'Permissions 700 doivent être appliquées sur répertoire');
    
    console.log('✅ chmod mode numérique fonctionne sur répertoire');
    return true;
}

/**
 * Test 4: Mode symbolique - ajout de permissions
 */
function testChmodSymbolicModeAdd() {
    console.log('🧪 TEST BASIC: chmod - Mode symbolique ajout');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer un fichier avec permissions de base
    testUtils.createTestFile(context, '/root/test.txt', 'contenu');
    cmdChmod(['644', 'test.txt'], context); // rw-r--r--
    
    // Ajouter permission d'exécution pour owner
    clearCaptures();
    cmdChmod(['u+x', 'test.txt'], context);
    
    const captures = getCaptures();
    assert.captureCount(0, 'chmod doit être silencieux en cas de succès');
    
    // Vérifier les permissions
    const file = context.fileSystem['/root/test.txt'];
    assert.equals(file.permissions, '-rwxr--r--', 'Permission x doit être ajoutée pour owner');
    
    console.log('✅ chmod mode symbolique ajout fonctionne');
    return true;
}

/**
 * Test 5: Mode symbolique - suppression de permissions
 */
function testChmodSymbolicModeRemove() {
    console.log('🧪 TEST BASIC: chmod - Mode symbolique suppression');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer un fichier avec permissions étendues
    testUtils.createTestFile(context, '/root/test.txt', 'contenu');
    cmdChmod(['755', 'test.txt'], context); // rwxr-xr-x
    
    // Retirer permission d'exécution pour tous
    clearCaptures();
    cmdChmod(['a-x', 'test.txt'], context);
    
    const captures = getCaptures();
    assert.captureCount(0, 'chmod doit être silencieux en cas de succès');
    
    // Vérifier les permissions
    const file = context.fileSystem['/root/test.txt'];
    assert.equals(file.permissions, '-rw-r--r--', 'Permission x doit être retirée pour tous');
    
    console.log('✅ chmod mode symbolique suppression fonctionne');
    return true;
}

/**
 * Test 6: Mode symbolique - assignation de permissions
 */
function testChmodSymbolicModeAssign() {
    console.log('🧪 TEST BASIC: chmod - Mode symbolique assignation');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer un fichier avec permissions aléatoires
    testUtils.createTestFile(context, '/root/test.txt', 'contenu');
    cmdChmod(['777', 'test.txt'], context); // rwxrwxrwx
    
    // Assigner permissions spécifiques pour group
    clearCaptures();
    cmdChmod(['g=r', 'test.txt'], context);
    
    const captures = getCaptures();
    assert.captureCount(0, 'chmod doit être silencieux en cas de succès');
    
    // Vérifier les permissions
    const file = context.fileSystem['/root/test.txt'];
    assert.equals(file.permissions, '-rwxr--rwx', 'Group doit avoir seulement permission r');
    
    console.log('✅ chmod mode symbolique assignation fonctionne');
    return true;
}

/**
 * Test 7: Modes multiples séparés par virgule
 */
function testChmodMultipleModes() {
    console.log('🧪 TEST BASIC: chmod - Modes multiples');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer un fichier
    testUtils.createTestFile(context, '/root/test.txt', 'contenu');
    cmdChmod(['644', 'test.txt'], context); // rw-r--r--
    
    // Appliquer plusieurs modes
    clearCaptures();
    cmdChmod(['u+x,g+w,o-r', 'test.txt'], context);
    
    const captures = getCaptures();
    assert.captureCount(0, 'chmod doit être silencieux en cas de succès');
    
    // Vérifier les permissions
    const file = context.fileSystem['/root/test.txt'];
    assert.equals(file.permissions, '-rwxrw----', 'Tous les modes doivent être appliqués');
    
    console.log('✅ chmod modes multiples fonctionne');
    return true;
}

/**
 * Test 8: Fichier inexistant
 */
function testChmodNonexistentFile() {
    console.log('🧪 TEST BASIC: chmod - Fichier inexistant');
    
    clearCaptures();
    const context = createTestContext();
    
    // Essayer chmod sur fichier inexistant
    cmdChmod(['755', 'inexistant.txt'], context);
    
    const captures = getCaptures();
    assert.isTrue(captures.length > 0, 'chmod doit afficher une erreur pour fichier inexistant');
    
    const hasError = captures.some(capture => 
        capture.className === 'error' && 
        capture.text.includes('impossible d\'accéder')
    );
    
    assert.isTrue(hasError, 'Message d\'erreur approprié doit être affiché');
    
    console.log('✅ chmod gère correctement les fichiers inexistants');
    return true;
}

/**
 * Test 9: Mode numérique invalide
 */
function testChmodInvalidNumericMode() {
    console.log('🧪 TEST BASIC: chmod - Mode numérique invalide');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer un fichier
    testUtils.createTestFile(context, '/root/test.txt', 'contenu');
    
    // Essayer mode invalide
    cmdChmod(['999', 'test.txt'], context);
    
    const captures = getCaptures();
    assert.isTrue(captures.length > 0, 'chmod doit afficher une erreur pour mode invalide');
    
    const hasError = captures.some(capture => 
        capture.className === 'error' && 
        capture.text.includes('invalide')
    );
    
    assert.isTrue(hasError, 'Message d\'erreur pour mode invalide doit être affiché');
    
    console.log('✅ chmod détecte les modes numériques invalides');
    return true;
}

/**
 * Test 10: Plusieurs fichiers
 */
function testChmodMultipleFiles() {
    console.log('🧪 TEST BASIC: chmod - Plusieurs fichiers');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer plusieurs fichiers
    testUtils.createTestFile(context, '/root/file1.txt', 'contenu1');
    testUtils.createTestFile(context, '/root/file2.txt', 'contenu2');
    testUtils.createTestFile(context, '/root/file3.txt', 'contenu3');
    
    // Appliquer chmod à tous
    cmdChmod(['755', 'file1.txt', 'file2.txt', 'file3.txt'], context);
    
    const captures = getCaptures();
    assert.captureCount(0, 'chmod doit être silencieux en cas de succès');
    
    // Vérifier que tous ont les bonnes permissions
    assert.equals(context.fileSystem['/root/file1.txt'].permissions, '-rwxr-xr-x', 'file1 doit avoir permissions 755');
    assert.equals(context.fileSystem['/root/file2.txt'].permissions, '-rwxr-xr-x', 'file2 doit avoir permissions 755');
    assert.equals(context.fileSystem['/root/file3.txt'].permissions, '-rwxr-xr-x', 'file3 doit avoir permissions 755');
    
    console.log('✅ chmod fonctionne sur plusieurs fichiers');
    return true;
}

// Exporter les tests
export const chmodBasicTests = [
    createTest('chmod - Affichage usage', testChmodUsage),
    createTest('chmod - Mode numérique fichier', testChmodNumericModeFile),
    createTest('chmod - Mode numérique répertoire', testChmodNumericModeDirectory),
    createTest('chmod - Mode symbolique ajout', testChmodSymbolicModeAdd),
    createTest('chmod - Mode symbolique suppression', testChmodSymbolicModeRemove),
    createTest('chmod - Mode symbolique assignation', testChmodSymbolicModeAssign),
    createTest('chmod - Modes multiples', testChmodMultipleModes),
    createTest('chmod - Fichier inexistant', testChmodNonexistentFile),
    createTest('chmod - Mode numérique invalide', testChmodInvalidNumericMode),
    createTest('chmod - Plusieurs fichiers', testChmodMultipleFiles)
];

export default chmodBasicTests;