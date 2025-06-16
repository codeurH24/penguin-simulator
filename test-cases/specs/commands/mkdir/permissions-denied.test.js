// test-cases/specs/commands/mkdir/permissions-denied.test.js - Tests des permissions refusées pour mkdir
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdMkdir } from '../../../../bin/mkdir.js';
import { cmdUseradd } from '../../../../bin/useradd.js';
import { cmdPasswd } from '../../../../bin/passwd.js';
import { cmdSu } from '../../../../bin/su.js';
import { cmdExit } from '../../../../lib/bash-builtins.js';

/**
 * Vérifie si une erreur de permission denied a été capturée
 * @param {Array} captures - Messages capturés
 * @returns {boolean} - true si erreur de permission détectée
 */
function hasPermissionDeniedError(captures) {
    return captures.some(capture => {
        if (capture.className !== 'error') return false;
        
        const text = capture.text.toLowerCase();
        return text.includes('permission denied') || 
               text.includes('access denied') ||
               text.includes('permission refusée') ||
               text.includes('accès interdit') ||
               text.includes('operation not permitted') ||
               text.includes('opération non autorisée');
    });
}

/**
 * Fonction utilitaire pour préparer un utilisateur sans mot de passe
 * (identique à celle des tests cd et ls)
 * @param {Object} context - Contexte du test
 * @param {string} username - Nom d'utilisateur à créer
 */
function prepareUserWithoutPassword(context, username) {
    // Créer l'utilisateur avec -m pour créer le home
    cmdUseradd(['-m', username], context);
    
    // Supprimer son mot de passe avec passwd -d
    cmdPasswd(['-d', username], context);
    
    // Vérifier que le mot de passe est bien vide dans /etc/shadow
    const shadowFile = context.fileSystem['/etc/shadow'];
    const lines = shadowFile.content.split('\n');
    const userLine = lines.find(line => line.startsWith(username + ':'));
    
    if (userLine) {
        const [, passwordHash] = userLine.split(':');
        assert.equals(passwordHash, '', `Le mot de passe de ${username} devrait être vide après passwd -d`);
    }
    
    // Nettoyer les captures pour le vrai test
    clearCaptures();
    return context;
}

/**
 * Test 1: Alice ne peut pas créer un répertoire dans /root
 */
function testAliceCannotCreateDirectoryInRoot() {
    clearCaptures();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    
    // Vérifier que /root existe avec les bonnes permissions
    const rootDir = context.fileSystem['/root'];
    assert.isTrue(rootDir !== undefined, '/root devrait exister');
    assert.equals(rootDir.permissions, 'drwx------', '/root devrait avoir les permissions drwx------');
    assert.equals(rootDir.owner, 'root', '/root devrait appartenir à root');
    
    // Basculer vers alice
    cmdSu(['alice'], context);
    
    // Alice essaie de créer un répertoire dans /root
    clearCaptures();
    cmdMkdir(['/root/test_dir'], context);
    
    // Vérifier qu'une erreur de permission a été affichée
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isTrue(hasPermissionError, 'Alice ne devrait pas pouvoir créer dans /root');
    
    // Vérifier que le répertoire n'a pas été créé
    const createdDir = context.fileSystem['/root/test_dir'];
    assert.isTrue(createdDir === undefined, 'Le répertoire ne devrait pas avoir été créé');
    
    // Revenir à root
    cmdExit([], context);
    
    console.log('✅ Alice ne peut pas créer un répertoire dans /root');
    return true;
}

/**
 * Test 2: Alice ne peut pas créer un répertoire dans le home d'un autre utilisateur
 */
function testAliceCannotCreateDirectoryInOtherUserHome() {
    clearCaptures();
    const context = createTestContext();
    
    // Préparer alice et bob sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    prepareUserWithoutPassword(context, 'bob');
    
    // Vérifier que le home de bob existe avec les bonnes permissions
    const bobHome = context.fileSystem['/home/bob'];
    assert.isTrue(bobHome !== undefined, '/home/bob devrait exister');
    assert.equals(bobHome.permissions, 'drwxr-xr-x', '/home/bob devrait avoir les permissions drwxr-xr-x');
    assert.equals(bobHome.owner, 'bob', '/home/bob devrait appartenir à bob');
    
    // Basculer vers alice
    cmdSu(['alice'], context);
    
    // Alice essaie de créer un répertoire dans le home de bob
    clearCaptures();
    cmdMkdir(['/home/bob/alice_folder'], context);
    
    // Vérifier qu'une erreur de permission a été affichée
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isTrue(hasPermissionError, 'Alice ne devrait pas pouvoir créer dans le home de bob');
    
    // Vérifier que le répertoire n'a pas été créé
    const createdDir = context.fileSystem['/home/bob/alice_folder'];
    assert.isTrue(createdDir === undefined, 'Le répertoire ne devrait pas avoir été créé');
    
    // Revenir à root
    cmdExit([], context);
    
    console.log('✅ Alice ne peut pas créer un répertoire dans le home d\'un autre utilisateur');
    return true;
}

/**
 * Test 3: Alice ne peut pas créer un répertoire dans un dossier avec permissions read-only
 */
function testAliceCannotCreateDirectoryInReadOnlyFolder() {
    clearCaptures();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    
    // Créer un répertoire /readonly_dir avec permissions read-only pour others
    cmdMkdir(['/readonly_dir'], context);
    const readonlyDir = context.fileSystem['/readonly_dir'];
    readonlyDir.permissions = 'drwxr--r--'; // pas de write pour others
    readonlyDir.owner = 'root';
    readonlyDir.group = 'root';
    
    // Basculer vers alice
    cmdSu(['alice'], context);
    
    // Alice essaie de créer un répertoire dans /readonly_dir
    clearCaptures();
    cmdMkdir(['/readonly_dir/new_folder'], context);
    
    // Vérifier qu'une erreur de permission a été affichée
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isTrue(hasPermissionError, 'Alice ne devrait pas pouvoir créer dans un dossier read-only');
    
    // Vérifier que le répertoire n'a pas été créé
    const createdDir = context.fileSystem['/readonly_dir/new_folder'];
    assert.isTrue(createdDir === undefined, 'Le répertoire ne devrait pas avoir été créé');
    
    // Revenir à root
    cmdExit([], context);
    
    console.log('✅ Alice ne peut pas créer un répertoire dans un dossier read-only');
    return true;
}

/**
 * Test 4: Alice ne peut pas créer un répertoire avec option -p dans un chemin restrictif
 */
function testAliceCannotCreateDirectoryWithParentsInRestrictivePath() {
    clearCaptures();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    
    // Créer /restricted avec permissions très restrictives
    cmdMkdir(['/restricted'], context);
    const restrictedDir = context.fileSystem['/restricted'];
    restrictedDir.permissions = 'drwx------'; // aucun accès pour others
    restrictedDir.owner = 'root';
    restrictedDir.group = 'root';
    
    // Basculer vers alice
    cmdSu(['alice'], context);
    
    // Alice essaie de créer un chemin complet avec -p dans /restricted
    clearCaptures();
    cmdMkdir(['-p', '/restricted/deep/nested/folder'], context);
    
    // Vérifier qu'une erreur de permission a été affichée
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isTrue(hasPermissionError, 'Alice ne devrait pas pouvoir créer avec -p dans un chemin restrictif');
    
    // Vérifier qu'aucun répertoire n'a été créé
    const deepDir = context.fileSystem['/restricted/deep'];
    assert.isTrue(deepDir === undefined, 'Aucun répertoire intermédiaire ne devrait avoir été créé');
    
    // Revenir à root
    cmdExit([], context);
    
    console.log('✅ Alice ne peut pas créer un répertoire avec -p dans un chemin restrictif');
    return true;
}

/**
 * Test 5: Alice ne peut pas créer un répertoire dans /etc (répertoire système)
 */
function testAliceCannotCreateDirectoryInSystemDirectory() {
    clearCaptures();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    
    // Vérifier que /etc existe avec les bonnes permissions
    const etcDir = context.fileSystem['/etc'];
    assert.isTrue(etcDir !== undefined, '/etc devrait exister');
    assert.equals(etcDir.owner, 'root', '/etc devrait appartenir à root');
    
    // Basculer vers alice
    cmdSu(['alice'], context);
    
    // Alice essaie de créer un répertoire dans /etc
    clearCaptures();
    cmdMkdir(['/etc/alice_config'], context);
    
    // Vérifier qu'une erreur de permission a été affichée
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isTrue(hasPermissionError, 'Alice ne devrait pas pouvoir créer dans /etc');
    
    // Vérifier que le répertoire n'a pas été créé
    const createdDir = context.fileSystem['/etc/alice_config'];
    assert.isTrue(createdDir === undefined, 'Le répertoire ne devrait pas avoir été créé');
    
    // Revenir à root
    cmdExit([], context);
    
    console.log('✅ Alice ne peut pas créer un répertoire dans /etc');
    return true;
}

/**
 * Test 6: Alice ne peut pas créer un répertoire dans un dossier sans permission execute
 */
function testAliceCannotCreateDirectoryWithoutExecutePermission() {
    clearCaptures();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    
    // Créer /no_execute avec permissions read mais pas execute pour others
    cmdMkdir(['/no_execute'], context);
    const noExecuteDir = context.fileSystem['/no_execute'];
    noExecuteDir.permissions = 'drwxr--r--'; // r-- pour others (pas de x)
    noExecuteDir.owner = 'root';
    noExecuteDir.group = 'root';
    
    // Basculer vers alice
    cmdSu(['alice'], context);
    
    // Alice essaie de créer un répertoire dans /no_execute
    clearCaptures();
    cmdMkdir(['/no_execute/new_dir'], context);
    
    // Vérifier qu'une erreur de permission a été affichée
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isTrue(hasPermissionError, 'Alice ne devrait pas pouvoir créer sans permission execute');
    
    // Vérifier que le répertoire n'a pas été créé
    const createdDir = context.fileSystem['/no_execute/new_dir'];
    assert.isTrue(createdDir === undefined, 'Le répertoire ne devrait pas avoir été créé');
    
    // Revenir à root
    cmdExit([], context);
    
    console.log('✅ Alice ne peut pas créer un répertoire sans permission execute');
    return true;
}

/**
 * Test 7: Test de contrôle - Alice peut créer un répertoire dans son propre home
 */
function testAliceCanCreateDirectoryInOwnHome() {
    clearCaptures();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    
    // Vérifier que le home d'alice existe et qu'elle en est propriétaire
    const aliceHome = context.fileSystem['/home/alice'];
    assert.isTrue(aliceHome !== undefined, '/home/alice devrait exister');
    assert.equals(aliceHome.owner, 'alice', '/home/alice devrait appartenir à alice');
    
    // Basculer vers alice
    cmdSu(['alice'], context);
    
    // Alice crée un répertoire dans son home
    clearCaptures();
    cmdMkdir(['/home/alice/my_folder'], context);
    
    // Vérifier qu'aucune erreur de permission n'a été affichée
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isFalse(hasPermissionError, 'Alice devrait pouvoir créer dans son propre home');
    
    // Vérifier que le répertoire a été créé
    const createdDir = context.fileSystem['/home/alice/my_folder'];
    assert.isTrue(createdDir !== undefined, 'Le répertoire devrait avoir été créé');
    assert.equals(createdDir.type, 'dir', 'L\'entrée créée devrait être un répertoire');
    assert.equals(createdDir.owner, 'alice', 'Le répertoire devrait appartenir à alice');
    
    // Revenir à root
    cmdExit([], context);
    
    console.log('✅ Test de contrôle : Alice peut créer un répertoire dans son propre home');
    return true;
}

/**
 * Test 8: Test de contrôle - Alice peut créer un répertoire avec bonnes permissions
 */
function testAliceCanCreateDirectoryWithCorrectPermissions() {
    clearCaptures();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    
    // Créer /writable_for_all avec permissions complètes pour others
    cmdMkdir(['/writable_for_all'], context);
    const writableDir = context.fileSystem['/writable_for_all'];
    writableDir.permissions = 'drwxrwxrwx'; // rwx pour others
    writableDir.owner = 'root';
    writableDir.group = 'root';
    
    // Basculer vers alice
    cmdSu(['alice'], context);
    
    // Alice crée un répertoire dans /writable_for_all
    clearCaptures();
    cmdMkdir(['/writable_for_all/alice_dir'], context);
    
    // Vérifier qu'aucune erreur de permission n'a été affichée
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isFalse(hasPermissionError, 'Alice devrait pouvoir créer avec bonnes permissions');
    
    // Vérifier que le répertoire a été créé
    const createdDir = context.fileSystem['/writable_for_all/alice_dir'];
    assert.isTrue(createdDir !== undefined, 'Le répertoire devrait avoir été créé');
    assert.equals(createdDir.type, 'dir', 'L\'entrée créée devrait être un répertoire');
    
    // Revenir à root
    cmdExit([], context);
    
    console.log('✅ Test de contrôle : Alice peut créer un répertoire avec bonnes permissions');
    return true;
}

/**
 * Export des tests de permissions refusées pour mkdir
 */
export const mkdirPermissionDeniedTests = [
    createTest('Alice ne peut pas créer un répertoire dans /root', testAliceCannotCreateDirectoryInRoot),
    createTest('Alice ne peut pas créer un répertoire dans le home d\'un autre utilisateur', testAliceCannotCreateDirectoryInOtherUserHome),
    createTest('Alice ne peut pas créer un répertoire dans un dossier read-only', testAliceCannotCreateDirectoryInReadOnlyFolder),
    createTest('Alice ne peut pas créer un répertoire avec -p dans un chemin restrictif', testAliceCannotCreateDirectoryWithParentsInRestrictivePath),
    createTest('Alice ne peut pas créer un répertoire dans /etc', testAliceCannotCreateDirectoryInSystemDirectory),
    createTest('Alice ne peut pas créer un répertoire sans permission execute', testAliceCannotCreateDirectoryWithoutExecutePermission),
    createTest('Test de contrôle : Alice peut créer un répertoire dans son propre home', testAliceCanCreateDirectoryInOwnHome),
    createTest('Test de contrôle : Alice peut créer un répertoire avec bonnes permissions', testAliceCanCreateDirectoryWithCorrectPermissions)
];