// test-cases/specs/commands/touch/advanced-permissions.test.js - Tests de permissions avancés pour touch
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdTouch } from '../../../../bin/touch.js';
import { cmdMkdir } from '../../../../bin/mkdir/mkdir.js';
import { cmdUseradd } from '../../../../bin/useradd.js';
import { cmdPasswd } from '../../../../bin/passwd.js';
import { cmdSu } from '../../../../bin/su.js';
import { cmdExit } from '../../../../lib/bash-builtins.js';
import { cmdChmod } from '../../../../bin/chmod.js';
import { clearUserStack } from '../../../../modules/users/user-stack.js';
import { FileSystemService } from '../../../../modules/filesystem/index.js';

/**
 * Fonction utilitaire pour préparer un utilisateur sans mot de passe
 */
function prepareUserWithoutPassword(context, username) {
    cmdUseradd(['-m', username], context);
    cmdPasswd(['-d', username], context);
    clearCaptures();
    return context;
}

/**
 * Vérifie si une erreur de permission denied a été capturée
 */
function hasPermissionDeniedError(captures) {
    return captures.some(capture => {
        if (capture.className !== 'error') return false;
        const text = capture.text.toLowerCase();
        return text.includes('permission denied') || 
               text.includes('permission refusée') ||
               text.includes('accès refusé');
    });
}

/**
 * Test 1: Fichier appartenant au même groupe - permissions de groupe
 */
function testGroupPermissionsAllow() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer alice
    prepareUserWithoutPassword(context, 'alice');
    
    // Root crée un fichier avec permissions de groupe permettant l'écriture
    testUtils.createTestFile(context, '/tmp/group_writable.txt', 'contenu groupe');
    const fileEntry = context.fileSystem['/tmp/group_writable.txt'];
    fileEntry.permissions = '-rw-rw-r--'; // Lecture/écriture pour propriétaire et groupe
    fileEntry.owner = 'root';
    fileEntry.group = 'alice'; // Le fichier appartient au groupe alice
    
    // Basculer vers alice
    cmdSu(['alice'], context);
    
    // Alice devrait pouvoir modifier le fichier car il appartient à son groupe
    clearCaptures();
    cmdTouch(['/tmp/group_writable.txt'], context);
    
    // Cela devrait fonctionner sans erreur
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isFalse(hasPermissionError, 'Alice devrait pouvoir modifier un fichier appartenant à son groupe');
    
    cmdExit([], context);
    
    console.log('✅ Permissions de groupe permettent la modification');
    return true;
}

/**
 * Test 2: Fichier n'appartenant pas au groupe - permissions refusées
 */
function testGroupPermissionsDeny() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer alice
    prepareUserWithoutPassword(context, 'alice');
    
    // Root crée un fichier appartenant au groupe root avec permissions de groupe restreintes
    testUtils.createTestFile(context, '/tmp/restricted_group_file.txt', 'contenu groupe');
    const fileEntry = context.fileSystem['/tmp/restricted_group_file.txt'];
    fileEntry.permissions = '-rw-rw----'; // Lecture/écriture pour propriétaire et groupe seulement, rien pour others
    fileEntry.owner = 'root';
    fileEntry.group = 'root'; // Le fichier appartient au groupe root, pas alice
    
    // Basculer vers alice
    cmdSu(['alice'], context);
    
    // Alice ne devrait pas pouvoir modifier le fichier car elle n'appartient pas au groupe root
    clearCaptures();
    cmdTouch(['/tmp/restricted_group_file.txt'], context);
    
    // Cela devrait échouer avec une erreur de permission
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isTrue(hasPermissionError, 'Alice ne devrait pas pouvoir modifier un fichier d\'un autre groupe');
    
    cmdExit([], context);
    
    console.log('✅ Permissions de groupe bloquent les non-membres');
    return true;
}

/**
 * Test 3: Permissions "others" - utilisateur quelconque peut lire fichier public
 */
function testOthersPermissionsAllow() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer alice
    prepareUserWithoutPassword(context, 'alice');
    
    // Root crée un fichier public (lisible par tous)
    testUtils.createTestFile(context, '/tmp/public_file.txt', 'contenu public');
    const fileEntry = context.fileSystem['/tmp/public_file.txt'];
    fileEntry.permissions = '-rw-r--r--'; // Lecture pour others
    fileEntry.owner = 'root';
    fileEntry.group = 'root';
    
    // Basculer vers alice
    cmdSu(['alice'], context);
    
    // Alice peut utiliser ce fichier comme référence (lecture seule)
    clearCaptures();
    cmdTouch(['-r', '/tmp/public_file.txt', '/home/alice/copy_dates.txt'], context);
    
    // Cela devrait fonctionner
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isFalse(hasPermissionError, 'Alice devrait pouvoir lire un fichier public comme référence');
    
    // Le fichier cible devrait être créé
    assert.fileExists(context, '/home/alice/copy_dates.txt', 'Le fichier avec dates copiées devrait être créé');
    
    cmdExit([], context);
    
    console.log('✅ Permissions "others" permettent la lecture');
    return true;
}

/**
 * Test 4: Répertoire avec permissions restrictives - utilisateur ne peut pas créer
 */
function testRestrictiveDirectoryPermissions() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer alice et bob
    prepareUserWithoutPassword(context, 'alice');
    prepareUserWithoutPassword(context, 'bob');
    
    // Root crée un répertoire avec permissions restrictives
    cmdMkdir(['/tmp/restricted'], context);
    
    // Vérifier que le répertoire a été créé
    assert.fileExists(context, '/tmp/restricted', 'Le répertoire devrait être créé');
    
    const dirEntry = context.fileSystem['/tmp/restricted'];
    if (dirEntry) {
        dirEntry.permissions = 'drwxr--r--'; // Pas d'écriture pour others
        dirEntry.owner = 'root';
        dirEntry.group = 'root';
    } else {
        console.error('❌ Répertoire non créé par mkdir');
        return false;
    }
    
    // Alice crée d'abord un fichier pour tester la modification
    cmdSu(['alice'], context);
    clearCaptures();
    
    // Alice essaie de créer un fichier dans le répertoire restrictif
    cmdTouch(['/tmp/restricted/alice_file.txt'], context);
    
    // Cela devrait échouer
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isTrue(hasPermissionError, 'Alice ne devrait pas pouvoir créer dans un répertoire restrictif');
    
    // Vérifier que le fichier n'a pas été créé
    const createdFile = context.fileSystem['/tmp/restricted/alice_file.txt'];
    assert.isTrue(createdFile === undefined, 'Le fichier ne devrait pas avoir été créé');
    
    cmdExit([], context);
    
    console.log('✅ Répertoire restrictif bloque la création');
    return true;
}

/**
 * Test 5: Fichier appartenant à un autre utilisateur - accès interdit
 */
function testOtherUserFilePermissions() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer alice et bob
    prepareUserWithoutPassword(context, 'alice');
    prepareUserWithoutPassword(context, 'bob');
    
    // Alice crée un fichier dans /tmp
    cmdSu(['alice'], context);
    cmdTouch(['/tmp/alice_private.txt'], context);
    
    // Vérifier que le fichier a été créé
    assert.fileExists(context, '/tmp/alice_private.txt', 'Le fichier devrait être créé');
    
    // Modifier les permissions pour le rendre privé
    const aliceFile = context.fileSystem['/tmp/alice_private.txt'];
    if (aliceFile) {
        aliceFile.permissions = '-rw-------'; // Accessible à alice seulement
        aliceFile.owner = 'alice';
        aliceFile.group = 'alice';
    } else {
        console.error('❌ Fichier non créé par touch');
        cmdExit([], context);
        return false;
    }
    
    cmdExit([], context);
    
    // Bob essaie de modifier le fichier privé d'alice
    cmdSu(['bob'], context);
    clearCaptures();
    cmdTouch(['/tmp/alice_private.txt'], context);
    
    // Cela devrait échouer car bob n'a pas les permissions
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isTrue(hasPermissionError, 'Bob ne devrait pas pouvoir modifier le fichier privé d\'alice');
    
    cmdExit([], context);
    
    console.log('✅ Fichiers privés d\'autres utilisateurs protégés');
    return true;
}

/**
 * Test 6: Root peut toujours modifier les fichiers (privilèges administrateur)
 */
function testRootCanModifyAllFiles() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer alice
    prepareUserWithoutPassword(context, 'alice');
    
    // Alice crée un fichier privé
    cmdSu(['alice'], context);
    cmdTouch(['/tmp/private_file.txt'], context);
    
    // Vérifier que le fichier a été créé
    assert.fileExists(context, '/tmp/private_file.txt', 'Le fichier devrait être créé');
    
    const privateFile = context.fileSystem['/tmp/private_file.txt'];
    if (privateFile) {
        privateFile.permissions = '-rw-------'; // Accessible à alice seulement
        privateFile.owner = 'alice';
        privateFile.group = 'alice';
    } else {
        console.error('❌ Fichier non créé par touch');
        cmdExit([], context);
        return false;
    }
    
    cmdExit([], context);
    
    // Root essaie de modifier le fichier privé d'alice
    clearCaptures();
    cmdTouch(['/tmp/private_file.txt'], context);
    
    // Root devrait pouvoir modifier le fichier même s'il appartient à alice
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isFalse(hasPermissionError, 'Root devrait pouvoir modifier tous les fichiers');
    
    console.log('✅ Root peut modifier tous les fichiers (privilèges administrateur)');
    return true;
}

/**
 * Nettoie après chaque test
 */
function cleanupAfterTest() {
    clearUserStack();
    clearCaptures();
}

/**
 * Export des tests de permissions avancés pour touch
 */
export const touchAdvancedPermissionsTests = [
    createTest('Permissions de groupe permettent modification', testGroupPermissionsAllow),
    createTest('Permissions de groupe bloquent non-membres', testGroupPermissionsDeny),
    createTest('Permissions "others" permettent lecture', testOthersPermissionsAllow),
    createTest('Répertoire restrictif bloque création', testRestrictiveDirectoryPermissions),
    createTest('Fichiers autres utilisateurs protégés', testOtherUserFilePermissions),
    createTest('Root peut modifier tous fichiers', testRootCanModifyAllFiles)
].map(test => {
    const originalTestFn = test.fn;
    test.fn = () => {
        try {
            return originalTestFn();
        } finally {
            cleanupAfterTest();
        }
    };
    return test;
});