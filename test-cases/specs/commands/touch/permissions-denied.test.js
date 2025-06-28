// test-cases/specs/commands/touch/permissions-denied.test.js - Tests des permissions refusées pour touch
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdTouch } from '../../../../bin/touch.js';
import { cmdMkdir } from '../../../../bin/mkdir/mkdir.js';
import { cmdUseradd } from '../../../../bin/useradd.js';
import { cmdPasswd } from '../../../../bin/passwd.js';
import { cmdSu } from '../../../../bin/su.js';
import { cmdExit } from '../../../../lib/bash-builtins.js';
import { clearUserStack } from '../../../../modules/users/user-stack.js';
import { FileSystemService } from '../../../../modules/filesystem/index.js';

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
               text.includes('accès refusé') ||
               text.includes('permission refusée');
    });
}

/**
 * Fonction utilitaire pour préparer un utilisateur sans mot de passe
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
 * Test 1: Alice ne peut pas créer de fichier dans /root (répertoire privé de root)
 */
function testAliceCannotCreateFileInRoot() {
    clearCaptures();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    
    // Vérifier que /root existe avec les bonnes permissions (drwx------)
    const rootDir = context.fileSystem['/root'];
    assert.isTrue(rootDir !== undefined, '/root devrait exister');
    assert.equals(rootDir.permissions, 'drwx------', '/root devrait avoir les permissions drwx------');
    assert.equals(rootDir.owner, 'root', '/root devrait appartenir à root');
    
    // Basculer vers alice
    cmdSu(['alice'], context);
    
    // Alice essaie de créer un fichier dans /root
    clearCaptures();
    cmdTouch(['/root/alice_file.txt'], context);
    
    // Vérifier qu'une erreur de permission a été affichée
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isTrue(hasPermissionError, 'Alice ne devrait pas pouvoir créer un fichier dans /root');
    
    // Vérifier que le fichier n'a pas été créé
    const createdFile = context.fileSystem['/root/alice_file.txt'];
    assert.isTrue(createdFile === undefined, 'Le fichier ne devrait pas avoir été créé');
    
    // Revenir à root
    cmdExit([], context);
    
    console.log('✅ Alice ne peut pas créer un fichier dans /root');
    return true;
}

/**
 * Test 2: Alice ne peut pas modifier un fichier qui ne lui appartient pas (en lecture seule)
 */
function testAliceCannotModifyReadOnlyFile() {
    clearCaptures();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    
    // Root crée un fichier en lecture seule
    testUtils.createTestFile(context, '/tmp/readonly_file.txt', 'contenu initial');
    
    // Changer les permissions du fichier pour qu'il soit en lecture seule pour tous
    const fs = new FileSystemService(context);
    const fileEntry = context.fileSystem['/tmp/readonly_file.txt'];
    fileEntry.permissions = '-r--r--r--'; // Lecture seule pour tous
    fileEntry.owner = 'root';
    fileEntry.group = 'root';
    
    // Basculer vers alice
    cmdSu(['alice'], context);
    
    // Alice essaie de modifier les dates du fichier en lecture seule
    clearCaptures();
    cmdTouch(['/tmp/readonly_file.txt'], context);
    
    // Vérifier qu'une erreur de permission a été affichée
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isTrue(hasPermissionError, 'Alice ne devrait pas pouvoir modifier un fichier en lecture seule');
    
    // Revenir à root
    cmdExit([], context);
    
    console.log('✅ Alice ne peut pas modifier un fichier en lecture seule');
    return true;
}

/**
 * Test 3: Alice ne peut pas créer de fichier dans un répertoire sans permission d'écriture
 */
function testAliceCannotCreateFileInNoWriteDirectory() {
    clearCaptures();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');

    // Root crée un répertoire sans permission d'écriture pour alice
    cmdMkdir(['/tmp/no_write_dir'], context);
    
    // Vérifier que le répertoire a été créé
    assert.fileExists(context, '/tmp/no_write_dir', 'Le répertoire devrait être créé');
    
    const dirEntry = context.fileSystem['/tmp/no_write_dir'];
    if (dirEntry) {
        dirEntry.permissions = 'dr-xr-xr-x'; // Lecture + exécution seulement
        dirEntry.owner = 'root';
        dirEntry.group = 'root';
    } else {
        console.error('❌ Répertoire non créé par mkdir');
        return false;
    }
    
    // Basculer vers alice
    cmdSu(['alice'], context);
    
    // Alice essaie de créer un fichier dans ce répertoire
    clearCaptures();
    cmdTouch(['/tmp/no_write_dir/alice_file.txt'], context);
    
    // Vérifier qu'une erreur de permission a été affichée
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isTrue(hasPermissionError, 'Alice ne devrait pas pouvoir créer un fichier dans un répertoire sans permission d\'écriture');
    
    // Vérifier que le fichier n'a pas été créé
    const createdFile = context.fileSystem['/tmp/no_write_dir/alice_file.txt'];
    assert.isTrue(createdFile === undefined, 'Le fichier ne devrait pas avoir été créé');
    
    // Revenir à root
    cmdExit([], context);
    
    console.log('✅ Alice ne peut pas créer un fichier dans un répertoire sans permission d\'écriture');
    return true;
}

/**
 * Test 4: Alice peut modifier ses propres fichiers
 */
function testAliceCanModifyHerOwnFiles() {
    clearCaptures();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    
    // Basculer vers alice
    cmdSu(['alice'], context);
    
    // Alice crée son propre fichier dans son home
    clearCaptures();
    cmdTouch(['/home/alice/my_file.txt'], context);
    
    // Le fichier devrait être créé avec succès
    assert.fileExists(context, '/home/alice/my_file.txt', 'Alice devrait pouvoir créer un fichier dans son home');
    
    // Vérifier qu'aucune erreur n'a été affichée
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isFalse(hasPermissionError, 'Alice devrait pouvoir créer un fichier dans son home sans erreur');
    
    // Alice modifie les dates de son fichier
    clearCaptures();
    
    
    console.log('DEBUG H24 testAlice context', context);
    cmdTouch(['/home/alice/my_file.txt'], context);
    
    // Cela devrait fonctionner sans erreur
    const modifyCaptures = getCaptures();
    const hasModifyError = hasPermissionDeniedError(modifyCaptures);
    assert.isFalse(hasModifyError, 'Alice devrait pouvoir modifier les dates de son propre fichier');
    
    // Revenir à root
    cmdExit([], context);
    
    console.log('✅ Alice peut modifier ses propres fichiers');
    return true;
}

/**
 * Test 5: Alice ne peut pas utiliser un fichier de référence qu'elle ne peut pas lire
 */
function testAliceCannotUseUnreadableReferenceFile() {
    clearCaptures();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    
    // Root crée un fichier de référence sans permission de lecture pour alice
    testUtils.createTestFile(context, '/tmp/secret_reference.txt', 'secret content');
    const refFileEntry = context.fileSystem['/tmp/secret_reference.txt'];
    refFileEntry.permissions = '-rw-------'; // Lecture/écriture pour root seulement
    refFileEntry.owner = 'root';
    refFileEntry.group = 'root';
    
    // Basculer vers alice
    cmdSu(['alice'], context);
    
    // Alice essaie d'utiliser ce fichier comme référence
    clearCaptures();
    cmdTouch(['-r', '/tmp/secret_reference.txt', '/home/alice/test_file.txt'], context);
    
    // Vérifier qu'une erreur de fichier de référence a été affichée
    const captures = getCaptures();
    const hasReferenceError = captures.some(capture => 
        capture.className === 'error' && 
        capture.text.includes('Fichier de référence introuvable')
    );
    assert.isTrue(hasReferenceError, 'Alice ne devrait pas pouvoir utiliser un fichier de référence qu\'elle ne peut pas lire');
    
    // Vérifier que le fichier cible n'a pas été créé
    const targetFile = context.fileSystem['/home/alice/test_file.txt'];
    assert.isTrue(targetFile === undefined, 'Le fichier cible ne devrait pas avoir été créé');
    
    // Revenir à root
    cmdExit([], context);
    
    console.log('✅ Alice ne peut pas utiliser un fichier de référence non lisible');
    return true;
}

/**
 * Test 6: Touch avec option -c (no-create) respecte les permissions
 */
function testTouchNoCreateRespectsPermissions() {
    clearCaptures();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    
    // Basculer vers alice
    cmdSu(['alice'], context);
    
    // Alice essaie de toucher un fichier inexistant dans /root avec -c
    clearCaptures();
    cmdTouch(['-c', '/root/nonexistent_file.txt'], context);
    
    // Avec -c, aucune erreur ne devrait être affichée même si pas de permissions
    const captures = getCaptures();
    const hasAnyError = captures.some(capture => capture.className === 'error');
    assert.isFalse(hasAnyError, 'Touch avec -c ne devrait pas afficher d\'erreur même sans permissions');
    
    // Le fichier ne devrait pas être créé
    const createdFile = context.fileSystem['/root/nonexistent_file.txt'];
    assert.isTrue(createdFile === undefined, 'Le fichier ne devrait pas être créé avec -c');
    
    // Revenir à root
    cmdExit([], context);
    
    console.log('✅ Touch avec -c respecte les permissions sans erreur');
    return true;
}

/**
 * Test 7: Alice peut utiliser un fichier de référence lisible
 */
function testAliceCanUseReadableReferenceFile() {
    clearCaptures();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    
    // Root crée un fichier de référence lisible par tous
    testUtils.createTestFile(context, '/tmp/public_reference.txt', 'public content');
    const refFileEntry = context.fileSystem['/tmp/public_reference.txt'];
    refFileEntry.permissions = '-rw-r--r--'; // Lisible par tous
    refFileEntry.owner = 'root';
    refFileEntry.group = 'root';
    
    // Basculer vers alice
    cmdSu(['alice'], context);
    
    // Alice utilise ce fichier comme référence pour créer un fichier dans son home
    clearCaptures();
    cmdTouch(['-r', '/tmp/public_reference.txt', '/home/alice/referenced_file.txt'], context);
    
    // Cela devrait fonctionner sans erreur
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isFalse(hasPermissionError, 'Alice devrait pouvoir utiliser un fichier de référence lisible');
    
    // Le fichier cible devrait être créé
    assert.fileExists(context, '/home/alice/referenced_file.txt', 'Le fichier référencé devrait être créé');
    
    // Revenir à root
    cmdExit([], context);
    
    console.log('✅ Alice peut utiliser un fichier de référence lisible');
    return true;
}

/**
 * Nettoie la pile des utilisateurs après chaque test
 */
function cleanupAfterTest() {
    clearUserStack();
    clearCaptures();
}

/**
 * Export des tests de permissions pour touch
 */
export const touchPermissionsTests = [
    createTest('Alice ne peut pas créer dans /root', testAliceCannotCreateFileInRoot),
    createTest('Alice ne peut pas modifier fichier lecture seule', testAliceCannotModifyReadOnlyFile),
    createTest('Alice ne peut pas créer dans répertoire sans écriture', testAliceCannotCreateFileInNoWriteDirectory),
    createTest('Alice peut modifier ses propres fichiers', testAliceCanModifyHerOwnFiles),
    createTest('Alice ne peut pas utiliser référence non lisible', testAliceCannotUseUnreadableReferenceFile),
    createTest('Touch -c respecte permissions sans erreur', testTouchNoCreateRespectsPermissions),
    createTest('Alice peut utiliser référence lisible', testAliceCanUseReadableReferenceFile)
].map(test => {
    // Ajouter le cleanup après chaque test
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