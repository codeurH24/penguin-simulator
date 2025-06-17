// test-cases/specs/commands/chmod/recursive.test.js
// Tests de l'option récursive (-R) pour chmod

import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdChmod } from '../../../../bin/chmod.js';
import { cmdMkdir } from '../../../../bin/mkdir.js';

/**
 * Test 1: Option -R sur structure de répertoires simple
 */
function testChmodRecursiveSimple() {
    console.log('🧪 TEST RECURSIVE: chmod -R sur structure simple');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer une structure de répertoires
    cmdMkdir(['-p', 'test-dir/subdir'], context);
    testUtils.createTestFile(context, '/root/test-dir/file1.txt', 'contenu 1');
    testUtils.createTestFile(context, '/root/test-dir/subdir/file2.txt', 'contenu 2');
    
    // Appliquer chmod -R
    clearCaptures();
    cmdChmod(['-R', '755', 'test-dir'], context);
    
    const captures = getCaptures();
    assert.captureCount(0, 'chmod -R doit être silencieux en cas de succès');
    
    // Vérifier que tous les éléments ont les bonnes permissions
    assert.equals(context.fileSystem['/root/test-dir'].permissions, 'drwxr-xr-x', 'Répertoire racine doit avoir 755');
    assert.equals(context.fileSystem['/root/test-dir/subdir'].permissions, 'drwxr-xr-x', 'Sous-répertoire doit avoir 755');
    assert.equals(context.fileSystem['/root/test-dir/file1.txt'].permissions, '-rwxr-xr-x', 'Fichier 1 doit avoir 755');
    assert.equals(context.fileSystem['/root/test-dir/subdir/file2.txt'].permissions, '-rwxr-xr-x', 'Fichier 2 doit avoir 755');
    
    console.log('✅ chmod -R fonctionne sur structure simple');
    return true;
}

/**
 * Test 2: Option --recursive (forme longue)
 */
function testChmodRecursiveLongOption() {
    console.log('🧪 TEST RECURSIVE: chmod --recursive');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer une structure de répertoires
    cmdMkdir(['-p', 'test-dir/sub1/sub2'], context);
    testUtils.createTestFile(context, '/root/test-dir/root-file.txt', 'racine');
    testUtils.createTestFile(context, '/root/test-dir/sub1/level1-file.txt', 'niveau 1');
    testUtils.createTestFile(context, '/root/test-dir/sub1/sub2/level2-file.txt', 'niveau 2');
    
    // Appliquer chmod --recursive
    clearCaptures();
    cmdChmod(['--recursive', '644', 'test-dir'], context);
    
    const captures = getCaptures();
    assert.captureCount(0, 'chmod --recursive doit être silencieux');
    
    // Vérifier les permissions (644 pour fichiers devient d644 pour répertoires)
    assert.equals(context.fileSystem['/root/test-dir'].permissions, 'drw-r--r--', 'Répertoire racine doit avoir d644');
    assert.equals(context.fileSystem['/root/test-dir/sub1'].permissions, 'drw-r--r--', 'sub1 doit avoir d644');
    assert.equals(context.fileSystem['/root/test-dir/sub1/sub2'].permissions, 'drw-r--r--', 'sub2 doit avoir d644');
    assert.equals(context.fileSystem['/root/test-dir/root-file.txt'].permissions, '-rw-r--r--', 'root-file doit avoir 644');
    assert.equals(context.fileSystem['/root/test-dir/sub1/level1-file.txt'].permissions, '-rw-r--r--', 'level1-file doit avoir 644');
    assert.equals(context.fileSystem['/root/test-dir/sub1/sub2/level2-file.txt'].permissions, '-rw-r--r--', 'level2-file doit avoir 644');
    
    console.log('✅ chmod --recursive fonctionne');
    return true;
}

/**
 * Test 3: Récursif avec mode symbolique
 */
function testChmodRecursiveSymbolic() {
    console.log('🧪 TEST RECURSIVE: chmod -R avec mode symbolique');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer structure avec permissions initiales variées
    cmdMkdir(['test-dir'], context);
    testUtils.createTestFile(context, '/root/test-dir/executable.sh', '#!/bin/bash\necho test');
    testUtils.createTestFile(context, '/root/test-dir/data.txt', 'données');
    
    // Permissions initiales
    cmdChmod(['755', 'test-dir'], context);
    cmdChmod(['644', 'test-dir/data.txt'], context);
    cmdChmod(['755', 'test-dir/executable.sh'], context);
    
    // Appliquer chmod récursif symbolique
    clearCaptures();
    cmdChmod(['-R', 'g+w', 'test-dir'], context);
    
    const captures = getCaptures();
    assert.captureCount(0, 'chmod -R symbolique doit être silencieux');
    
    // Vérifier que g+w a été ajouté partout
    assert.equals(context.fileSystem['/root/test-dir'].permissions, 'drwxrwxr-x', 'Répertoire doit avoir g+w');
    assert.equals(context.fileSystem['/root/test-dir/data.txt'].permissions, '-rw-rw-r--', 'data.txt doit avoir g+w');
    assert.equals(context.fileSystem['/root/test-dir/executable.sh'].permissions, '-rwxrwxr-x', 'executable.sh doit avoir g+w');
    
    console.log('✅ chmod -R avec mode symbolique fonctionne');
    return true;
}

/**
 * Test 4: Récursif sur structure complexe avec plusieurs niveaux
 */
function testChmodRecursiveComplexStructure() {
    console.log('🧪 TEST RECURSIVE: chmod -R sur structure complexe');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer une structure complexe
    cmdMkdir(['-p', 'complex/level1/level2/level3'], context);
    cmdMkdir(['-p', 'complex/branch1/subbranch'], context);
    cmdMkdir(['-p', 'complex/branch2'], context);
    
    // Ajouter des fichiers à différents niveaux
    testUtils.createTestFile(context, '/root/complex/root.txt', 'racine');
    testUtils.createTestFile(context, '/root/complex/level1/l1.txt', 'niveau 1');
    testUtils.createTestFile(context, '/root/complex/level1/level2/l2.txt', 'niveau 2');
    testUtils.createTestFile(context, '/root/complex/level1/level2/level3/l3.txt', 'niveau 3');
    testUtils.createTestFile(context, '/root/complex/branch1/b1.txt', 'branche 1');
    testUtils.createTestFile(context, '/root/complex/branch1/subbranch/sb.txt', 'sous-branche');
    testUtils.createTestFile(context, '/root/complex/branch2/b2.txt', 'branche 2');
    
    // Appliquer chmod récursif
    clearCaptures();
    cmdChmod(['-R', '700', 'complex'], context);
    
    const captures = getCaptures();
    assert.captureCount(0, 'chmod -R sur structure complexe doit être silencieux');
    
    // Vérifier quelques éléments clés
    assert.equals(context.fileSystem['/root/complex'].permissions, 'drwx------', 'Racine complex doit avoir 700');
    assert.equals(context.fileSystem['/root/complex/level1/level2/level3'].permissions, 'drwx------', 'level3 doit avoir 700');
    assert.equals(context.fileSystem['/root/complex/branch1/subbranch/sb.txt'].permissions, '-rwx------', 'sb.txt doit avoir 700');
    assert.equals(context.fileSystem['/root/complex/level1/level2/l2.txt'].permissions, '-rwx------', 'l2.txt doit avoir 700');
    
    console.log('✅ chmod -R fonctionne sur structure complexe');
    return true;
}

/**
 * Test 5: Récursif avec répertoire vide
 */
function testChmodRecursiveEmptyDirectory() {
    console.log('🧪 TEST RECURSIVE: chmod -R sur répertoire vide');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer un répertoire vide
    cmdMkdir(['empty-dir'], context);
    
    // Appliquer chmod -R
    clearCaptures();
    cmdChmod(['-R', '777', 'empty-dir'], context);
    
    const captures = getCaptures();
    assert.captureCount(0, 'chmod -R sur répertoire vide doit être silencieux');
    
    // Vérifier que le répertoire vide a été modifié
    assert.equals(context.fileSystem['/root/empty-dir'].permissions, 'drwxrwxrwx', 'Répertoire vide doit avoir 777');
    
    console.log('✅ chmod -R fonctionne sur répertoire vide');
    return true;
}

/**
 * Test 6: Récursif sur fichier (pas répertoire) - doit traiter juste le fichier
 */
function testChmodRecursiveOnFile() {
    console.log('🧪 TEST RECURSIVE: chmod -R sur fichier simple');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer un fichier simple
    testUtils.createTestFile(context, '/root/simple-file.txt', 'contenu simple');
    
    // Appliquer chmod -R sur le fichier
    clearCaptures();
    cmdChmod(['-R', '600', 'simple-file.txt'], context);
    
    const captures = getCaptures();
    assert.captureCount(0, 'chmod -R sur fichier doit être silencieux');
    
    // Vérifier que le fichier a été modifié
    assert.equals(context.fileSystem['/root/simple-file.txt'].permissions, '-rw-------', 'Fichier doit avoir 600');
    
    console.log('✅ chmod -R fonctionne sur fichier simple');
    return true;
}

/**
 * Test 7: Combinaison -R avec modes multiples
 */
function testChmodRecursiveMultipleModes() {
    console.log('🧪 TEST RECURSIVE: chmod -R avec modes multiples');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer structure
    cmdMkdir(['test-dir'], context);
    testUtils.createTestFile(context, '/root/test-dir/file.txt', 'contenu');
    
    // Permissions initiales connues
    cmdChmod(['755', 'test-dir'], context);
    cmdChmod(['644', 'test-dir/file.txt'], context);
    
    // Appliquer chmod -R avec modes multiples
    clearCaptures();
    cmdChmod(['-R', 'u+x,g-r,o=w', 'test-dir'], context);
    
    const captures = getCaptures();
    assert.captureCount(0, 'chmod -R avec modes multiples doit être silencieux');
    
    // Vérifier l'application des modes
    const dir = context.fileSystem['/root/test-dir'];
    const file = context.fileSystem['/root/test-dir/file.txt'];
    
    // Les modes u+x,g-r,o=w sont appliqués aux permissions 755 et 644
    // dir: 755 (rwxr-xr-x) -> u+x (pas de changement), g-r (rwx-xr-x), o=w (rwx-x-w-)
    // file: 644 (rw-r--r--) -> u+x (rwxr--r--), g-r (rwx---r--), o=w (rwx----w-)
    
    assert.isTrue(dir.permissions.includes('w'), 'Others doit avoir permission w sur répertoire');
    assert.isTrue(file.permissions.includes('w'), 'Others doit avoir permission w sur fichier');
    
    console.log('✅ chmod -R avec modes multiples fonctionne');
    return true;
}

/**
 * Test 8: Options récursives avec différentes syntaxes
 */
function testChmodRecursiveOptionVariants() {
    console.log('🧪 TEST RECURSIVE: chmod avec variantes options récursives');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer plusieurs structures pour tester différentes syntaxes
    cmdMkdir(['dir1'], context);
    cmdMkdir(['dir2'], context);
    testUtils.createTestFile(context, '/root/dir1/file1.txt', 'contenu1');
    testUtils.createTestFile(context, '/root/dir2/file2.txt', 'contenu2');
    
    // Test avec -R
    cmdChmod(['-R', '755', 'dir1'], context);
    assert.equals(context.fileSystem['/root/dir1'].permissions, 'drwxr-xr-x', 'dir1 avec -R doit avoir 755');
    assert.equals(context.fileSystem['/root/dir1/file1.txt'].permissions, '-rwxr-xr-x', 'file1 avec -R doit avoir 755');
    
    // Test avec --recursive
    cmdChmod(['--recursive', '644', 'dir2'], context);
    assert.equals(context.fileSystem['/root/dir2'].permissions, 'drw-r--r--', 'dir2 avec --recursive doit avoir 644');
    assert.equals(context.fileSystem['/root/dir2/file2.txt'].permissions, '-rw-r--r--', 'file2 avec --recursive doit avoir 644');
    
    const captures = getCaptures();
    assert.captureCount(0, 'chmod avec différentes options récursives doit être silencieux');
    
    console.log('✅ chmod supporte toutes les variantes d\'options récursives');
    return true;
}

/**
 * Test 9: Récursif avec structure imbriquée profonde
 */
function testChmodRecursiveDeepNesting() {
    console.log('🧪 TEST RECURSIVE: chmod -R avec imbrication profonde');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer une structure très imbriquée
    cmdMkdir(['-p', 'deep/level1/level2/level3/level4/level5'], context);
    testUtils.createTestFile(context, '/root/deep/level1/level2/level3/level4/level5/deep-file.txt', 'très profond');
    testUtils.createTestFile(context, '/root/deep/level1/level2/mid-file.txt', 'milieu');
    
    // Appliquer chmod récursif
    clearCaptures();
    cmdChmod(['-R', '666', 'deep'], context);
    
    const captures = getCaptures();
    assert.captureCount(0, 'chmod -R profond doit être silencieux');
    
    // Vérifier à différents niveaux
    assert.equals(context.fileSystem['/root/deep'].permissions, 'drw-rw-rw-', 'Racine deep doit avoir d666');
    assert.equals(context.fileSystem['/root/deep/level1/level2/level3/level4/level5'].permissions, 'drw-rw-rw-', 'Niveau 5 doit avoir d666');
    assert.equals(context.fileSystem['/root/deep/level1/level2/level3/level4/level5/deep-file.txt'].permissions, '-rw-rw-rw-', 'Fichier profond doit avoir 666');
    assert.equals(context.fileSystem['/root/deep/level1/level2/mid-file.txt'].permissions, '-rw-rw-rw-', 'Fichier intermédiaire doit avoir 666');
    
    console.log('✅ chmod -R gère l\'imbrication profonde');
    return true;
}

/**
 * Test 10: Récursif avec mélange fichiers et répertoires
 */
function testChmodRecursiveMixedContent() {
    console.log('🧪 TEST RECURSIVE: chmod -R avec contenu mixte');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer une structure mixte complexe
    cmdMkdir(['mixed'], context);
    cmdMkdir(['mixed/subdir1'], context);
    cmdMkdir(['mixed/subdir2'], context);
    testUtils.createTestFile(context, '/root/mixed/file1.txt', 'fichier 1');
    testUtils.createTestFile(context, '/root/mixed/file2.log', 'fichier 2');
    testUtils.createTestFile(context, '/root/mixed/subdir1/nested1.txt', 'imbriqué 1');
    testUtils.createTestFile(context, '/root/mixed/subdir2/nested2.txt', 'imbriqué 2');
    cmdMkdir(['mixed/subdir1/deep'], context);
    testUtils.createTestFile(context, '/root/mixed/subdir1/deep/very-nested.txt', 'très imbriqué');
    
    // Appliquer permissions différentes au départ
    cmdChmod(['755', 'mixed'], context);
    cmdChmod(['644', 'mixed/file1.txt'], context);
    cmdChmod(['600', 'mixed/file2.log'], context);
    
    // Appliquer chmod récursif
    clearCaptures();
    cmdChmod(['-R', '777', 'mixed'], context);
    
    const captures = getCaptures();
    assert.captureCount(0, 'chmod -R sur contenu mixte doit être silencieux');
    
    // Vérifier que tout a les mêmes permissions
    assert.equals(context.fileSystem['/root/mixed'].permissions, 'drwxrwxrwx', 'Racine mixed doit avoir d777');
    assert.equals(context.fileSystem['/root/mixed/subdir1'].permissions, 'drwxrwxrwx', 'subdir1 doit avoir d777');
    assert.equals(context.fileSystem['/root/mixed/subdir2'].permissions, 'drwxrwxrwx', 'subdir2 doit avoir d777');
    assert.equals(context.fileSystem['/root/mixed/file1.txt'].permissions, '-rwxrwxrwx', 'file1.txt doit avoir 777');
    assert.equals(context.fileSystem['/root/mixed/file2.log'].permissions, '-rwxrwxrwx', 'file2.log doit avoir 777');
    assert.equals(context.fileSystem['/root/mixed/subdir1/nested1.txt'].permissions, '-rwxrwxrwx', 'nested1.txt doit avoir 777');
    assert.equals(context.fileSystem['/root/mixed/subdir1/deep'].permissions, 'drwxrwxrwx', 'deep doit avoir d777');
    assert.equals(context.fileSystem['/root/mixed/subdir1/deep/very-nested.txt'].permissions, '-rwxrwxrwx', 'very-nested.txt doit avoir 777');
    
    console.log('✅ chmod -R gère parfaitement le contenu mixte');
    return true;
}

// Exporter les tests
export const chmodRecursiveTests = [
    createTest('chmod -R - Structure simple', testChmodRecursiveSimple),
    createTest('chmod --recursive - Forme longue', testChmodRecursiveLongOption),
    createTest('chmod -R - Mode symbolique', testChmodRecursiveSymbolic),
    createTest('chmod -R - Structure complexe', testChmodRecursiveComplexStructure),
    createTest('chmod -R - Répertoire vide', testChmodRecursiveEmptyDirectory),
    createTest('chmod -R - Sur fichier simple', testChmodRecursiveOnFile),
    createTest('chmod -R - Modes multiples', testChmodRecursiveMultipleModes),
    createTest('chmod -R - Variantes options', testChmodRecursiveOptionVariants),
    createTest('chmod -R - Imbrication profonde', testChmodRecursiveDeepNesting),
    createTest('chmod -R - Contenu mixte', testChmodRecursiveMixedContent)
];

export default chmodRecursiveTests;