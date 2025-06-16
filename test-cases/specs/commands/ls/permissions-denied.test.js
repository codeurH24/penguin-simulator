// test-cases/specs/commands/ls/permissions-denied.test.js - Tests des permissions refusées pour ls
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdLs } from '../../../../bin/ls.js';
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
               text.includes('accès interdit');
    });
}

/**
 * Fonction utilitaire pour préparer un utilisateur sans mot de passe
 * (identique à celle des tests cd)
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
 * Test 1: Alice ne peut pas lister /root (répertoire privé de root)
 */
function testAliceCannotListRootDirectory() {
    clearCaptures();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    
    // Vérifier que /root existe et a les bonnes permissions (drwx------)
    const rootDir = context.fileSystem['/root'];
    assert.isTrue(rootDir !== undefined, '/root devrait exister');
    rootDir.permissions = 'drwx------'; // Seul root peut lire/écrire/exécuter
    rootDir.owner = 'root';
    rootDir.group = 'root';
    
    // Basculer vers alice
    cmdSu(['alice'], context);
    
    // Alice essaie de lister /root
    clearCaptures();
    cmdLs(['/root'], context);
    
    // Vérifier qu'une erreur de permission a été affichée
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isTrue(hasPermissionError, 'Alice ne devrait pas pouvoir lister /root');
    
    // Revenir à root
    cmdExit([], context);
    
    console.log('✅ Alice ne peut pas lister /root');
    return true;
}

/**
 * Test 2: Alice ne peut pas lister le home privé d'un autre utilisateur
 */
function testAliceCannotListOtherUserHome() {
    clearCaptures();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    
    // Créer bob avec son répertoire home
    cmdUseradd(['-m', 'bob'], context);
    
    // Définir les permissions restrictives pour le home de bob
    const bobHome = context.fileSystem['/home/bob'];
    bobHome.permissions = 'drwx------'; // Seul bob peut accéder
    bobHome.owner = 'bob';
    bobHome.group = 'bob';
    
    // Basculer vers alice
    cmdSu(['alice'], context);
    
    // Alice essaie de lister /home/bob
    clearCaptures();
    cmdLs(['/home/bob'], context);
    
    // Vérifier qu'une erreur de permission a été affichée
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isTrue(hasPermissionError, 'Alice ne devrait pas pouvoir lister /home/bob');
    
    // Revenir à root
    cmdExit([], context);
    
    console.log('✅ Alice ne peut pas lister le home privé d\'un autre utilisateur');
    return true;
}

/**
 * Test 3: Alice ne peut pas lister un répertoire sans permission de lecture (r)
 */
function testAliceCannotListDirectoryWithoutReadPermission() {
    clearCaptures();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    
    // Créer /public_noread
    cmdMkdir(['/public_noread'], context);
    
    // Donner permission x mais pas r (others peut traverser mais pas lire)
    const publicDir = context.fileSystem['/public_noread'];
    publicDir.permissions = 'drwxrwx--x'; // rwx pour owner/group, --x pour others
    publicDir.owner = 'root';
    publicDir.group = 'root';
    
    // Créer quelques fichiers dans le répertoire
    testUtils.createTestFile(context, '/public_noread/file1.txt', 'contenu');
    testUtils.createTestFile(context, '/public_noread/file2.txt', 'contenu');
    
    // Basculer vers alice
    cmdSu(['alice'], context);
    
    // Alice essaie de lister /public_noread
    clearCaptures();
    cmdLs(['/public_noread'], context);
    
    // Vérifier qu'une erreur de permission a été affichée
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isTrue(hasPermissionError, 'Alice ne devrait pas pouvoir lister sans permission r');
    
    // Revenir à root
    cmdExit([], context);
    
    console.log('✅ Alice ne peut pas lister un répertoire sans permission de lecture');
    return true;
}

/**
 * Test 4: Alice ne peut pas lister si elle ne peut pas traverser le chemin parent
 */
function testAliceCannotListWithoutTraversePermissionOnParent() {
    clearCaptures();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    
    // Créer /restricted/accessible
    cmdMkdir(['-p', '/restricted/accessible'], context);
    
    // /restricted n'est pas traversable pour others
    const restrictedDir = context.fileSystem['/restricted'];
    restrictedDir.permissions = 'drwxrwx---'; // Pas de x pour others
    restrictedDir.owner = 'root';
    restrictedDir.group = 'root';
    
    // /restricted/accessible est lisible si on peut y arriver
    const accessibleDir = context.fileSystem['/restricted/accessible'];
    accessibleDir.permissions = 'drwxr-xr-x'; // Lisible pour tous
    accessibleDir.owner = 'root';
    accessibleDir.group = 'root';
    
    // Créer du contenu dans accessible
    testUtils.createTestFile(context, '/restricted/accessible/file.txt', 'contenu');
    
    // Basculer vers alice
    cmdSu(['alice'], context);
    
    // Alice essaie de lister /restricted/accessible
    clearCaptures();
    cmdLs(['/restricted/accessible'], context);
    
    // Vérifier qu'une erreur de permission a été affichée (à cause de /restricted)
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isTrue(hasPermissionError, 'Alice ne devrait pas pouvoir traverser /restricted');
    
    // Revenir à root
    cmdExit([], context);
    
    console.log('✅ Alice ne peut pas lister si elle ne peut pas traverser le chemin parent');
    return true;
}

/**
 * Test 5: Alice ne peut pas lister un répertoire système protégé
 */
function testAliceCannotListProtectedSystemDirectory() {
    clearCaptures();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    
    // Créer /sys/kernel (simulation d'un répertoire système)
    cmdMkdir(['-p', '/sys/kernel'], context);
    
    // Donner des permissions restrictives typiques d'un répertoire système
    const sysDir = context.fileSystem['/sys'];
    sysDir.permissions = 'dr-xr-xr-x'; // Lecture seule pour tous, mais...
    sysDir.owner = 'root';
    sysDir.group = 'root';
    
    const kernelDir = context.fileSystem['/sys/kernel'];
    kernelDir.permissions = 'dr-x------'; // Seul root peut lire
    kernelDir.owner = 'root';
    kernelDir.group = 'root';
    
    // Basculer vers alice
    cmdSu(['alice'], context);
    
    // Alice essaie de lister /sys/kernel
    clearCaptures();
    cmdLs(['/sys/kernel'], context);
    
    // Vérifier qu'une erreur de permission a été affichée
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isTrue(hasPermissionError, 'Alice ne devrait pas pouvoir lister /sys/kernel');
    
    // Revenir à root
    cmdExit([], context);
    
    console.log('✅ Alice ne peut pas lister un répertoire système protégé');
    return true;
}

/**
 * Test 6: Alice ne peut pas lister avec permission r mais sans x sur le répertoire
 */
function testAliceCannotListDirectoryWithReadButWithoutExecute() {
    clearCaptures();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    
    // Créer /readable_noexec
    cmdMkdir(['/readable_noexec'], context);
    
    // Donner permission r mais pas x (others peut voir qu'il y a quelque chose mais pas y accéder)
    const readableDir = context.fileSystem['/readable_noexec'];
    readableDir.permissions = 'drwxrwxr--'; // r-- pour others (read mais pas execute)
    readableDir.owner = 'root';
    readableDir.group = 'root';
    
    // Créer du contenu dans le répertoire
    testUtils.createTestFile(context, '/readable_noexec/secret.txt', 'secret');
    
    // Basculer vers alice
    cmdSu(['alice'], context);
    
    // Alice essaie de lister /readable_noexec
    clearCaptures();
    cmdLs(['/readable_noexec'], context);
    
    // Vérifier qu'une erreur de permission a été affichée
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isTrue(hasPermissionError, 'Alice ne devrait pas pouvoir lister sans permission x');
    
    // Revenir à root
    cmdExit([], context);
    
    console.log('✅ Alice ne peut pas lister avec r mais sans x');
    return true;
}

/**
 * Test 7: Alice peut lister avec permission r et x (test de contrôle positif)
 */
function testAliceCanListDirectoryWithCorrectPermissions() {
    clearCaptures();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    
    // Créer /public_accessible
    cmdMkdir(['/public_accessible'], context);
    
    // Donner les bonnes permissions pour alice
    const publicDir = context.fileSystem['/public_accessible'];
    publicDir.permissions = 'drwxr-xr-x'; // r-x pour others
    publicDir.owner = 'root';
    publicDir.group = 'root';
    
    // Créer du contenu visible
    testUtils.createTestFile(context, '/public_accessible/file1.txt', 'contenu1');
    testUtils.createTestFile(context, '/public_accessible/file2.txt', 'contenu2');
    testUtils.createTestDirectory(context, '/public_accessible/subdir');
    
    // Basculer vers alice
    cmdSu(['alice'], context);
    
    // Alice essaie de lister /public_accessible (devrait réussir)
    clearCaptures();
    cmdLs(['/public_accessible'], context);
    
    // Vérifier qu'aucune erreur n'a été affichée
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isFalse(hasPermissionError, 'Alice devrait pouvoir lister avec bonnes permissions');
    
    // Vérifier que le contenu est affiché
    const outputText = captures.map(c => c.text).join(' ');
    assert.isTrue(outputText.includes('file1.txt'), 'file1.txt devrait être listé');
    assert.isTrue(outputText.includes('file2.txt'), 'file2.txt devrait être listé');
    assert.isTrue(outputText.includes('subdir'), 'subdir devrait être listé');
    
    // Revenir à root
    cmdExit([], context);
    
    console.log('✅ Test de contrôle : Alice peut lister avec bonnes permissions');
    return true;
}

/**
 * Test 8: Alice peut lister son propre répertoire home
 */
function testAliceCanListOwnHomeDirectory() {
    clearCaptures();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    
    // Vérifier que le home d'alice a les bonnes permissions
    const aliceHome = context.fileSystem['/home/alice'];
    assert.isTrue(aliceHome !== undefined, '/home/alice devrait exister');
    assert.equals(aliceHome.owner, 'alice', 'alice devrait être propriétaire de son home');
    
    // Créer du contenu dans le home d'alice
    testUtils.createTestFile(context, '/home/alice/document.txt', 'mon document');
    testUtils.createTestDirectory(context, '/home/alice/dossier');
    
    // Basculer vers alice
    cmdSu(['alice'], context);
    
    // Alice liste son propre home
    clearCaptures();
    cmdLs(['/home/alice'], context);
    
    // Vérifier qu'aucune erreur n'a été affichée
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isFalse(hasPermissionError, 'Alice devrait pouvoir lister son propre home');
    
    // Vérifier que le contenu est affiché
    const outputText = captures.map(c => c.text).join(' ');
    assert.isTrue(outputText.includes('document.txt'), 'document.txt devrait être listé');
    assert.isTrue(outputText.includes('dossier'), 'dossier devrait être listé');
    
    // Revenir à root
    cmdExit([], context);
    
    console.log('✅ Alice peut lister son propre répertoire home');
    return true;
}

/**
 * Export des tests de permissions refusées pour ls
 */
export const lsPermissionDeniedTests = [
    createTest('Alice ne peut pas lister /root', testAliceCannotListRootDirectory),
    createTest('Alice ne peut pas lister le home privé d\'un autre utilisateur', testAliceCannotListOtherUserHome),
    createTest('Alice ne peut pas lister un répertoire sans permission de lecture', testAliceCannotListDirectoryWithoutReadPermission),
    createTest('Alice ne peut pas lister si elle ne peut pas traverser le chemin parent', testAliceCannotListWithoutTraversePermissionOnParent),
    createTest('Alice ne peut pas lister un répertoire système protégé', testAliceCannotListProtectedSystemDirectory),
    createTest('Alice ne peut pas lister avec r mais sans x', testAliceCannotListDirectoryWithReadButWithoutExecute),
    createTest('Alice peut lister avec bonnes permissions', testAliceCanListDirectoryWithCorrectPermissions),
    createTest('Alice peut lister son propre home', testAliceCanListOwnHomeDirectory)
];