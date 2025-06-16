// test-cases/specs/commands/cat/permissions-denied.test.js - Tests des permissions refusées pour cat
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdCat } from '../../../../bin/cat.js';
import { cmdMkdir } from '../../../../bin/mkdir.js';
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
               text.includes('permission refusée') ||  // ✅ Français
               text.includes('accès refusé');
    });
}

/**
 * Fonction utilitaire pour préparer un utilisateur sans mot de passe
 * (identique à celle des tests cd, ls, mkdir)
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
 * Test 1: Alice ne peut pas lire un fichier dans /root
 */
function testAliceCannotReadFileInRoot() {
    clearCaptures();
    // IMPORTANT: Nettoyer la pile d'utilisateurs avant le test
    clearUserStack();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    
    // Créer un fichier dans /root (accessible seulement à root)
    testUtils.createTestFile(context, '/root/secret.txt', 'Contenu secret de root');
    
    // S'assurer que /root a les bonnes permissions (drwx------)
    const rootDir = context.fileSystem['/root'];
    rootDir.permissions = 'drwx------';
    rootDir.owner = 'root';
    rootDir.group = 'root';
    
    // Le fichier secret appartient à root
    const secretFile = context.fileSystem['/root/secret.txt'];
    secretFile.owner = 'root';
    secretFile.group = 'root';
    secretFile.permissions = '-rw-------';
    
    // Basculer vers alice (avec login shell)
    cmdSu(['-', 'alice'], context);
    
    // Alice essaie de lire le fichier secret
    clearCaptures();
    cmdCat(['/root/secret.txt'], context);
    
    // Vérifier qu'une erreur de permission a été affichée
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isTrue(hasPermissionError, 'Alice ne devrait pas pouvoir lire un fichier dans /root');
    
    // Revenir à root
    cmdExit([], context);
    
    // Vérifier qu'on est bien retourné à root
    assert.equals(context.currentUser.username, 'root', 'Devrait être retourné à root après exit');
    
    console.log('✅ Alice ne peut pas lire un fichier dans /root');
    return true;
}

/**
 * Test 2: Alice ne peut pas lire un fichier privé d'un autre utilisateur
 */
function testAliceCannotReadOtherUserPrivateFile() {
    clearCaptures();
    // IMPORTANT: Nettoyer la pile d'utilisateurs avant le test
    clearUserStack();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    
    // Créer un autre utilisateur (bob)
    cmdUseradd(['-m', 'bob'], context);
    cmdPasswd(['-d', 'bob'], context);
    
    // Créer un fichier privé de bob
    testUtils.createTestFile(context, '/home/bob/private.txt', 'Document privé de Bob');
    
    // Le fichier appartient à bob avec permissions restrictives
    const privateFile = context.fileSystem['/home/bob/private.txt'];
    privateFile.owner = 'bob';
    privateFile.group = 'bob';
    privateFile.permissions = '-rw-------'; // Seul bob peut lire/écrire
    
    // S'assurer que le home de bob a les bonnes permissions
    const bobHome = context.fileSystem['/home/bob'];
    bobHome.permissions = 'drwx------'; // Seul bob peut accéder
    bobHome.owner = 'bob';
    bobHome.group = 'bob';
    
    // Basculer vers alice
    cmdSu(['-', 'alice'], context);
    
    // Alice essaie de lire le fichier privé de bob
    clearCaptures();
    cmdCat(['/home/bob/private.txt'], context);
    
    // Vérifier qu'une erreur de permission a été affichée
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isTrue(hasPermissionError, 'Alice ne devrait pas pouvoir lire le fichier privé de bob');
    
    // Revenir à root
    cmdExit([], context);
    
    // Vérifier qu'on est bien retourné à root
    assert.equals(context.currentUser.username, 'root', 'Devrait être retourné à root après exit');
    
    console.log('✅ Alice ne peut pas lire un fichier privé d\'un autre utilisateur');
    return true;
}

/**
 * Test 3: Alice ne peut pas lire un fichier sans permission de lecture
 */
function testAliceCannotReadFileWithoutReadPermission() {
    clearCaptures();
    // IMPORTANT: Nettoyer la pile d'utilisateurs avant le test
    clearUserStack();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    
    // S'assurer que le home d'alice a les bonnes permissions
    const aliceHome = context.fileSystem['/home/alice'];
    aliceHome.owner = 'alice';
    aliceHome.group = 'alice';
    aliceHome.permissions = 'drwx------'; // Alice peut accéder à son home
    
    // Créer un fichier dans le home d'alice
    testUtils.createTestFile(context, '/home/alice/no-read.txt', 'Fichier sans lecture');
    
    // Retirer la permission de lecture pour alice (propriétaire)
    const noReadFile = context.fileSystem['/home/alice/no-read.txt'];
    noReadFile.owner = 'alice';
    noReadFile.group = 'alice';
    noReadFile.permissions = '--w-------'; // Pas de lecture, même pour le propriétaire
    
    // Basculer vers alice
    cmdSu(['-', 'alice'], context);
    
    // 🔍 DEBUG: Vérifier où se trouve alice
    console.log('🔍 DEBUG - Après su alice:');
    console.log('   Utilisateur:', context.currentUser.username);
    console.log('   Répertoire courant:', context.getCurrentPath());
    console.log('   Fichier existe dans filesystem?', !!context.fileSystem['/home/alice/no-read.txt']);
    
    // Alice essaie de lire son propre fichier sans permission
    clearCaptures();
    cmdCat(['no-read.txt'], context);
    
    // 🔍 DEBUG: Analyser les captures
    const captures = getCaptures();
    console.log('🔍 DEBUG Test 3 - Captures:', captures.length);
    captures.forEach((capture, i) => {
        console.log(`   Capture ${i}: [${capture.className}] "${capture.text}"`);
    });
    
    // Vérifier qu'une erreur de permission a été affichée
    const hasPermissionError = hasPermissionDeniedError(captures);
    console.log('🔍 DEBUG - hasPermissionDeniedError:', hasPermissionError);
    
    assert.isTrue(hasPermissionError, 'Alice ne devrait pas pouvoir lire un fichier sans permission de lecture');
    
    // Revenir à root
    cmdExit([], context);
    
    // Vérifier qu'on est bien retourné à root
    assert.equals(context.currentUser.username, 'root', 'Devrait être retourné à root après exit');
    
    console.log('✅ Alice ne peut pas lire un fichier sans permission de lecture');
    return true;
}

/**
 * Test 4: Alice ne peut pas lire un fichier dans un répertoire non traversable
 */
function testAliceCannotReadFileInNonTraversableDirectory() {
    clearCaptures();
    // IMPORTANT: Nettoyer la pile d'utilisateurs avant le test
    clearUserStack();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    
    // Créer une structure de répertoires
    cmdMkdir(['-p', '/restricted/accessible'], context);
    testUtils.createTestFile(context, '/restricted/accessible/file.txt', 'Contenu du fichier');
    
    // /restricted n'est pas traversable pour others
    const restrictedDir = context.fileSystem['/restricted'];
    restrictedDir.permissions = 'drwxrwx---'; // Pas de x pour others
    restrictedDir.owner = 'root';
    restrictedDir.group = 'root';
    
    // Le fichier est lisible si on peut y arriver
    const accessibleFile = context.fileSystem['/restricted/accessible/file.txt'];
    accessibleFile.permissions = '-rw-r--r--'; // Lisible pour tous
    accessibleFile.owner = 'root';
    accessibleFile.group = 'root';
    
    // Basculer vers alice
    cmdSu(['-', 'alice'], context);
    
    // Alice essaie de lire le fichier (mais ne peut pas traverser /restricted)
    clearCaptures();
    cmdCat(['/restricted/accessible/file.txt'], context);
    
    // Vérifier qu'une erreur de permission a été affichée
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isTrue(hasPermissionError, 'Alice ne devrait pas pouvoir traverser /restricted');
    
    // Revenir à root
    cmdExit([], context);
    
    // Vérifier qu'on est bien retourné à root
    assert.equals(context.currentUser.username, 'root', 'Devrait être retourné à root après exit');
    
    console.log('✅ Alice ne peut pas lire un fichier si elle ne peut pas traverser le répertoire parent');
    return true;
}

/**
 * Test 5: Alice ne peut pas lire un fichier système protégé
 */
function testAliceCannotReadProtectedSystemFile() {
    clearCaptures();
    // IMPORTANT: Nettoyer la pile d'utilisateurs avant le test
    clearUserStack();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    
    // Créer un fichier système sensible (simulation de /etc/shadow par exemple)
    testUtils.createTestFile(context, '/etc/sensitive.conf', 'Configuration sensible');
    
    // Le fichier a des permissions très restrictives
    const sensitiveFile = context.fileSystem['/etc/sensitive.conf'];
    sensitiveFile.permissions = '-r--------'; // Seul root peut lire
    sensitiveFile.owner = 'root';
    sensitiveFile.group = 'root';
    
    // Basculer vers alice
    cmdSu(['-', 'alice'], context);
    
    // Alice essaie de lire le fichier système sensible
    clearCaptures();
    cmdCat(['/etc/sensitive.conf'], context);
    
    // Vérifier qu'une erreur de permission a été affichée
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isTrue(hasPermissionError, 'Alice ne devrait pas pouvoir lire un fichier système protégé');
    
    // Revenir à root
    cmdExit([], context);
    
    // Vérifier qu'on est bien retourné à root
    assert.equals(context.currentUser.username, 'root', 'Devrait être retourné à root après exit');
    
    console.log('✅ Alice ne peut pas lire un fichier système protégé');
    return true;
}

/**
 * Test 6: Alice essaie de lire un répertoire avec cat (erreur appropriée)
 */
function testAliceCannotCatDirectory() {
    clearCaptures();
    // IMPORTANT: Nettoyer la pile d'utilisateurs avant le test
    clearUserStack();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    
    // S'assurer que le home d'alice a les bonnes permissions
    const aliceHome = context.fileSystem['/home/alice'];
    aliceHome.owner = 'alice';
    aliceHome.group = 'alice';
    aliceHome.permissions = 'drwx------'; // Alice peut accéder à son home
    
    // Créer un répertoire accessible
    cmdMkdir(['/home/alice/testdir'], context);
    const testDir = context.fileSystem['/home/alice/testdir'];
    testDir.owner = 'alice';
    testDir.group = 'alice';
    testDir.permissions = 'drwxr-xr-x';
    
    // Basculer vers alice
    cmdSu(['-', 'alice'], context);
    
    // Alice essaie d'utiliser cat sur un répertoire
    clearCaptures();
    cmdCat(['testdir'], context);
    
    // Vérifier qu'une erreur appropriée a été affichée
    const captures = getCaptures();
    const hasDirectoryError = captures.some(capture => 
        capture.className === 'error' && 
        (capture.text.toLowerCase().includes('is a directory') ||
         capture.text.toLowerCase().includes('n\'est pas un fichier'))
    );
    assert.isTrue(hasDirectoryError, 'cat devrait indiquer qu\'un répertoire "Is a directory" ou "N\'est pas un fichier"');
    
    // Revenir à root
    cmdExit([], context);
    
    // Vérifier qu'on est bien retourné à root
    assert.equals(context.currentUser.username, 'root', 'Devrait être retourné à root après exit');
    
    console.log('✅ cat refuse de lire un répertoire avec un message approprié');
    return true;
}

/**
 * Test de contrôle: Alice peut lire un fichier avec les bonnes permissions
 */
function testAliceCanReadFileWithCorrectPermissions() {
    clearCaptures();
    // IMPORTANT: Nettoyer la pile d'utilisateurs avant le test
    clearUserStack();
    const context = createTestContext();
    
    // Préparer alice sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    
    // S'assurer que le home d'alice a les bonnes permissions
    const aliceHome = context.fileSystem['/home/alice'];
    aliceHome.owner = 'alice';
    aliceHome.group = 'alice';
    aliceHome.permissions = 'drwx------'; // Alice peut accéder à son home
    
    // Créer un fichier public lisible
    testUtils.createTestFile(context, '/home/alice/public.txt', 'Contenu public');
    
    // Le fichier appartient à alice avec bonnes permissions
    const publicFile = context.fileSystem['/home/alice/public.txt'];
    publicFile.owner = 'alice';
    publicFile.group = 'alice';
    publicFile.permissions = '-rw-r--r--'; // Alice peut lire/écrire, others peuvent lire
    
    // Basculer vers alice
    cmdSu(['-', 'alice'], context);
    
    // Alice lit son fichier public
    clearCaptures();
    cmdCat(['public.txt'], context);
    
    // Vérifier qu'aucune erreur de permission n'a été affichée
    const captures = getCaptures();
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isFalse(hasPermissionError, 'Alice devrait pouvoir lire son fichier avec bonnes permissions');
    
    // Vérifier que le contenu a été affiché
    const hasContent = captures.some(capture => 
        capture.text.includes('Contenu public')
    );
    assert.isTrue(hasContent, 'Le contenu du fichier devrait être affiché');
    
    // Revenir à root
    cmdExit([], context);
    
    // Vérifier qu'on est bien retourné à root
    assert.equals(context.currentUser.username, 'root', 'Devrait être retourné à root après exit');
    
    console.log('✅ Test de contrôle : Alice peut lire un fichier avec les bonnes permissions');
    return true;
}

/**
 * Export des tests de permissions refusées pour cat
 */
export const catPermissionDeniedTests = [
    createTest('Alice ne peut pas lire un fichier dans /root', testAliceCannotReadFileInRoot),
    createTest('Alice ne peut pas lire un fichier privé d\'un autre utilisateur', testAliceCannotReadOtherUserPrivateFile),
    createTest('Alice ne peut pas lire un fichier sans permission de lecture', testAliceCannotReadFileWithoutReadPermission),
    createTest('Alice ne peut pas lire un fichier dans un répertoire non traversable', testAliceCannotReadFileInNonTraversableDirectory),
    createTest('Alice ne peut pas lire un fichier système protégé', testAliceCannotReadProtectedSystemFile),
    createTest('Alice ne peut pas utiliser cat sur un répertoire', testAliceCannotCatDirectory),
    createTest('Test de contrôle : Alice peut lire avec bonnes permissions', testAliceCanReadFileWithCorrectPermissions)
];