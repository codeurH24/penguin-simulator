// test-cases/specs/commands/cd/permissions-denied.test.js - Tests des permissions refusées pour cd
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdCd } from '../../../../lib/bash-builtins.js';
import { cmdMkdir } from '../../../../bin/mkdir/mkdir.js';
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
 * (identique à celle des tests su)
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
 * Test 1: Alice ne peut pas aller dans /root (répertoire privé de root)
 */
function testAliceCannotAccessRootDirectory() {
    clearCaptures();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    
    // Basculer vers alice
    cmdSu(['alice'], context);
    assert.equals(context.currentUser.username, 'alice', 'Devrait être alice maintenant');
    
    // Aller dans le home d'alice
    cmdCd(['/home/alice'], context);
    assert.equals(context.getCurrentPath(), '/home/alice', 'Devrait être dans /home/alice');
    
    // Vérifier que /root existe avec les bonnes permissions (drwx------)
    const rootDir = context.fileSystem['/root'];
    assert.isTrue(rootDir !== undefined, '/root devrait exister');
    assert.equals(rootDir.permissions, 'drwx------', '/root devrait avoir permissions 700');
    assert.equals(rootDir.owner, 'root', '/root devrait appartenir à root');
    
    // Alice essaie d'aller dans /root
    clearCaptures();
    cmdCd(['/root'], context);
    
    // Vérifier qu'une erreur de permission a été affichée
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isTrue(hasPermissionError, 'Alice ne devrait pas pouvoir accéder à /root');
    
    // Alice devrait toujours être dans /home/alice
    assert.equals(context.getCurrentPath(), '/home/alice', 'Alice devrait être restée dans son home');
    
    // Revenir à root
    cmdExit([], context);
    
    console.log('✅ Alice ne peut pas accéder à /root');
    return true;
}

/**
 * Test 2: Alice ne peut pas aller dans /home/bob (répertoire privé d'un autre utilisateur)
 */
function testAliceCannotAccessOtherUserHome() {
    clearCaptures();
    const context = createTestContext();
    
    // Préparer alice et bob sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    prepareUserWithoutPassword(context, 'bob');
    
    // Modifier les permissions de /home/bob pour être privé (700)
    const bobHome = context.fileSystem['/home/bob'];
    bobHome.permissions = 'drwx------';
    bobHome.owner = 'bob';
    bobHome.group = 'bob';
    
    // Basculer vers alice
    cmdSu(['alice'], context);
    assert.equals(context.currentUser.username, 'alice', 'Devrait être alice maintenant');
    
    // Aller dans le home d'alice
    cmdCd(['/home/alice'], context);
    
    // Alice essaie d'aller dans /home/bob
    clearCaptures();
    cmdCd(['/home/bob'], context);
    
    // Vérifier qu'une erreur de permission a été affichée
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isTrue(hasPermissionError, 'Alice ne devrait pas pouvoir accéder à /home/bob privé');
    
    // Alice devrait toujours être dans /home/alice
    assert.equals(context.getCurrentPath(), '/home/alice', 'Alice devrait être restée dans son home');
    
    // Revenir à root
    cmdExit([], context);
    
    console.log('✅ Alice ne peut pas accéder au home privé d\'un autre utilisateur');
    return true;
}

/**
 * Test 3: Alice ne peut pas traverser un répertoire sans permission x
 */
function testAliceCannotTraverseDirectoryWithoutExecutePerm() {
    clearCaptures();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    
    // Créer une structure /test/secret
    cmdMkdir(['-p', '/test/secret'], context);
    
    // Retirer la permission x sur /test pour les autres utilisateurs
    const testDir = context.fileSystem['/test'];
    testDir.permissions = 'drw-r--r--'; // rw-r--r-- (pas de x pour others)
    testDir.owner = 'root';
    testDir.group = 'root';
    
    // Basculer vers alice
    cmdSu(['alice'], context);
    assert.equals(context.currentUser.username, 'alice', 'Devrait être alice maintenant');
    
    // Aller dans le home d'alice
    cmdCd(['/home/alice'], context);
    
    // Alice essaie d'aller dans /test/secret (traverse /test sans permission x)
    clearCaptures();
    cmdCd(['/test/secret'], context);
    
    // Vérifier qu'une erreur de permission a été affichée
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isTrue(hasPermissionError, 'Alice ne devrait pas pouvoir traverser /test sans permission x');
    
    // Alice devrait toujours être dans /home/alice
    assert.equals(context.getCurrentPath(), '/home/alice', 'Alice devrait être restée dans son home');
    
    // Revenir à root
    cmdExit([], context);
    
    console.log('✅ Alice ne peut pas traverser un répertoire sans permission x');
    return true;
}

/**
 * Test 4: Alice ne peut pas aller dans un répertoire sans permission x même avec permission r
 */
function testAliceCannotAccessDirectoryWithoutExecuteButWithRead() {
    clearCaptures();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    
    // Créer /accessible
    cmdMkdir(['/accessible'], context);
    
    // Donner permission r mais pas x sur /accessible pour les autres
    const accessibleDir = context.fileSystem['/accessible'];
    accessibleDir.permissions = 'drw-rw-r--'; // rw-rw-r-- (r mais pas x pour others)
    accessibleDir.owner = 'root';
    accessibleDir.group = 'root';
    
    // Basculer vers alice
    cmdSu(['alice'], context);
    assert.equals(context.currentUser.username, 'alice', 'Devrait être alice maintenant');
    
    // Aller dans le home d'alice
    cmdCd(['/home/alice'], context);
    
    // Alice essaie d'aller dans /accessible (permission r mais pas x)
    clearCaptures();
    cmdCd(['/accessible'], context);
    
    // Vérifier qu'une erreur de permission a été affichée
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isTrue(hasPermissionError, 'Alice ne devrait pas pouvoir accéder sans permission x');
    
    // Alice devrait toujours être dans /home/alice
    assert.equals(context.getCurrentPath(), '/home/alice', 'Alice devrait être restée dans son home');
    
    // Revenir à root
    cmdExit([], context);
    
    console.log('✅ Alice ne peut pas accéder à un répertoire sans x même avec r');
    return true;
}

/**
 * Test 5: Alice ne peut pas aller dans un sous-répertoire de son propre home si permissions restrictives
 */
function testAliceCannotAccessRestrictiveSubdirInOwnHome() {
    clearCaptures();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    
    // Basculer vers alice
    cmdSu(['alice'], context);
    cmdCd(['/home/alice'], context);
    
    // Alice crée un répertoire dans son home
    cmdMkdir(['private'], context);
    assert.fileExists(context, '/home/alice/private', 'Le répertoire private devrait être créé');
    
    // Revenir à root pour modifier les permissions
    cmdExit([], context);
    
    // En tant que root, modifier les permissions pour retirer l'accès à alice
    const privateDir = context.fileSystem['/home/alice/private'];
    privateDir.permissions = 'drw-------'; // Pas de permissions pour alice (others)
    privateDir.owner = 'root'; // Appartient maintenant à root
    privateDir.group = 'root';
    
    // Retourner à alice
    cmdSu(['alice'], context);
    cmdCd(['/home/alice'], context);
    
    // Alice essaie d'aller dans son propre sous-répertoire maintenant privé
    clearCaptures();
    cmdCd(['private'], context);
    
    // Vérifier qu'une erreur de permission a été affichée
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isTrue(hasPermissionError, 'Alice ne devrait pas pouvoir accéder à private maintenant privé');
    
    // Alice devrait toujours être dans /home/alice
    assert.equals(context.getCurrentPath(), '/home/alice', 'Alice devrait être restée dans /home/alice');
    
    // Revenir à root
    cmdExit([], context);
    
    console.log('✅ Alice ne peut pas accéder à un sous-répertoire avec permissions restrictives');
    return true;
}

/**
 * Test 6: Alice ne peut pas aller dans un répertoire système protégé (/etc privé)
 */
function testAliceCannotAccessProtectedSystemDirectory() {
    clearCaptures();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    
    // S'assurer que /etc existe et modifier ses permissions pour être privé
    if (!context.fileSystem['/etc']) {
        cmdMkdir(['/etc'], context);
    }
    
    // Rendre /etc privé
    const etcDir = context.fileSystem['/etc'];
    etcDir.permissions = 'drwx------'; // Privé pour root seulement
    etcDir.owner = 'root';
    etcDir.group = 'root';
    
    // Basculer vers alice
    cmdSu(['alice'], context);
    cmdCd(['/home/alice'], context);
    
    // Alice essaie d'aller dans /etc
    clearCaptures();
    cmdCd(['/etc'], context);
    
    // Vérifier qu'une erreur de permission a été affichée
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isTrue(hasPermissionError, 'Alice ne devrait pas pouvoir accéder à /etc privé');
    
    // Alice devrait toujours être dans /home/alice
    assert.equals(context.getCurrentPath(), '/home/alice', 'Alice devrait être restée dans son home');
    
    // Revenir à root
    cmdExit([], context);
    
    console.log('✅ Alice ne peut pas accéder à un répertoire système protégé');
    return true;
}

/**
 * Test 7: Alice ne peut pas aller dans un chemin complexe où un répertoire intermédiaire n'a pas x
 */
function testAliceCannotAccessDeepPathWithIntermediateRestriction() {
    clearCaptures();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    
    // Créer /public/restricted/accessible
    cmdMkdir(['-p', '/public/restricted/accessible'], context);
    
    // /public est accessible
    const publicDir = context.fileSystem['/public'];
    publicDir.permissions = 'drwxr-xr-x';
    publicDir.owner = 'root';
    publicDir.group = 'root';
    
    // /public/restricted n'est pas traversable pour others
    const restrictedDir = context.fileSystem['/public/restricted'];
    restrictedDir.permissions = 'drwxrwx---'; // Pas de x pour others
    restrictedDir.owner = 'root';
    restrictedDir.group = 'root';
    
    // /public/restricted/accessible est accessible si on peut y arriver
    const accessibleDir = context.fileSystem['/public/restricted/accessible'];
    accessibleDir.permissions = 'drwxr-xr-x';
    accessibleDir.owner = 'root';
    accessibleDir.group = 'root';
    
    // Basculer vers alice
    cmdSu(['alice'], context);
    cmdCd(['/home/alice'], context);
    
    // Alice essaie d'aller dans /public/restricted/accessible
    clearCaptures();
    cmdCd(['/public/restricted/accessible'], context);
    
    // Vérifier qu'une erreur de permission a été affichée (à cause de /public/restricted)
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isTrue(hasPermissionError, 'Alice ne devrait pas pouvoir traverser /public/restricted');
    
    // Alice devrait toujours être dans /home/alice
    assert.equals(context.getCurrentPath(), '/home/alice', 'Alice devrait être restée dans son home');
    
    // Revenir à root
    cmdExit([], context);
    
    console.log('✅ Alice ne peut pas accéder à un chemin avec restriction intermédiaire');
    return true;
}

/**
 * Test 8: Alice peut accéder à un répertoire avec bonnes permissions (test de contrôle positif)
 */
function testAliceCanAccessDirectoryWithCorrectPermissions() {
    clearCaptures();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    
    // Créer /public_access
    cmdMkdir(['/public_access'], context);
    
    // Donner les bonnes permissions pour alice
    const publicDir = context.fileSystem['/public_access'];
    publicDir.permissions = 'drwxr-xr-x'; // rwxr-xr-x (others ont rx)
    publicDir.owner = 'root';
    publicDir.group = 'root';
    
    // Basculer vers alice
    cmdSu(['alice'], context);
    cmdCd(['/home/alice'], context);
    
    // Alice essaie d'aller dans /public_access (devrait réussir)
    clearCaptures();
    cmdCd(['/public_access'], context);
    
    // Vérifier qu'aucune erreur n'a été affichée
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isFalse(hasPermissionError, 'Alice devrait pouvoir accéder avec bonnes permissions');
    
    // Alice devrait maintenant être dans /public_access
    assert.equals(context.getCurrentPath(), '/public_access', 'Alice devrait être dans /public_access');
    
    // Revenir à root
    cmdExit([], context);
    
    console.log('✅ Test de contrôle : Alice peut accéder avec bonnes permissions');
    return true;
}

/**
 * Export des tests de permissions refusées pour cd
 */
export const cdPermissionDeniedTests = [
    createTest('Alice ne peut pas accéder à /root', testAliceCannotAccessRootDirectory),
    createTest('Alice ne peut pas accéder au home privé d\'un autre utilisateur', testAliceCannotAccessOtherUserHome),
    createTest('Alice ne peut pas traverser un répertoire sans permission x', testAliceCannotTraverseDirectoryWithoutExecutePerm),
    createTest('Alice ne peut pas accéder sans x même avec r', testAliceCannotAccessDirectoryWithoutExecuteButWithRead),
    createTest('Alice ne peut pas accéder à un sous-répertoire restrictif', testAliceCannotAccessRestrictiveSubdirInOwnHome),
    createTest('Alice ne peut pas accéder à un répertoire système protégé', testAliceCannotAccessProtectedSystemDirectory),
    createTest('Alice ne peut pas accéder avec restriction intermédiaire', testAliceCannotAccessDeepPathWithIntermediateRestriction),
    createTest('Test de contrôle : Alice peut accéder avec bonnes permissions', testAliceCanAccessDirectoryWithCorrectPermissions)
];