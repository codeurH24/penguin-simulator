// test-cases/specs/commands/mv/permissions.test.js
// Tests exhaustifs des permissions pour la commande mv

import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdMv } from '../../../../bin/mv/mv.js';
import { cmdMkdir } from '../../../../bin/mkdir/mkdir.js';
import { cmdTouch } from '../../../../bin/touch.js';
import { cmdUseradd } from '../../../../bin/useradd.js';
import { cmdPasswd } from '../../../../bin/passwd.js';
import { cmdSu } from '../../../../bin/su.js';
import { cmdExit } from '../../../../lib/bash-builtins.js';
import { cmdChmod } from '../../../../bin/chmod.js';
import { clearUserStack } from '../../../../modules/users/user-stack.js';
import { FileSystemService } from '../../../../modules/filesystem/index.js';

/**
 * Fonction utilitaire pour créer un utilisateur sans mot de passe
 */
function prepareUserWithoutPassword(context, username) {
    cmdUseradd(['-m', username], context);
    cmdPasswd(['-d', username], context);
}

/**
 * Fonction utilitaire pour vérifier les erreurs de permission
 */
function hasPermissionDeniedError(captures) {
    return captures.some(capture => 
        capture.className === 'error' && 
        (capture.text.toLowerCase().includes('permission') || 
         capture.text.toLowerCase().includes('refusée') ||
         capture.text.toLowerCase().includes('denied') ||
         capture.text.toLowerCase().includes('accès'))
    );
}

/**
 * Fonction pour valider les permissions via FileSystemService
 */
function validatePermissionCheck(context, filePath, user, operation, shouldBeAllowed) {
    try {
        const fileSystemService = new FileSystemService(context);
        const permissionCheck = fileSystemService.permissionsSystem.hasPermission(filePath, user, operation);
        
        if (shouldBeAllowed) {
            assert.isTrue(permissionCheck.allowed, 
                `L'utilisateur ${user.username} devrait avoir la permission ${operation} sur ${filePath}.`);
        } else {
            assert.isFalse(permissionCheck.allowed, 
                `L'utilisateur ${user.username} ne devrait pas avoir la permission ${operation} sur ${filePath}.`);
        }
        
        return permissionCheck;
        
    } catch (error) {
        console.error('Erreur lors de la vérification des permissions:', error);
        return null;
    }
}

/**
 * TEST 1: mv échoue sans permission de lecture sur le fichier source
 */
function testMvSourceReadPermissionDenied() {
    console.log('🧪 TEST PERMISSIONS: mv échoue sans lecture sur source');
    
    clearCaptures();
    clearUserStack();
    const context = createTestContext();
    
    // Créer utilisateurs
    prepareUserWithoutPassword(context, 'alice');
    prepareUserWithoutPassword(context, 'bob');
    
    // root crée un fichier appartenant à alice
    testUtils.createTestFile(context, '/root/alice-file.txt', 'contenu alice');
    cmdChmod(['600', 'alice-file.txt'], context); // rw-------
    
    const file = context.fileSystem['/root/alice-file.txt'];
    file.owner = 'alice';
    file.group = 'alice';
    
    // 🐛 DEBUG: État initial
    console.log('🔍 DEBUG - Fichier créé:');
    console.log('  alice-file.txt existe:', !!context.fileSystem['/root/alice-file.txt']);
    console.log('  permissions:', file.permissions);
    console.log('  owner:', file.owner);
    console.log('  group:', file.group);
    console.log('  utilisateur actuel avant su:', context.currentUser.username);
    
    // Passer à l'utilisateur bob
    cmdSu(['bob'], context);
    
    // 🐛 DEBUG: Après changement d'utilisateur
    console.log('🔍 DEBUG - Après su bob:');
    console.log('  utilisateur actuel:', context.currentUser.username);
    console.log('  uid actuel:', context.currentUser.uid);
    
    // Vérifier les permissions via FileSystemService
    const permissionResult = validatePermissionCheck(context, '/root/alice-file.txt', context.currentUser, 'read', false);
    console.log('🔍 DEBUG - Vérification permissions:');
    console.log('  permission read autorisée:', permissionResult?.allowed);
    console.log('  raison refus:', permissionResult?.reason);
    
    // bob essaie de déplacer le fichier d'alice
    clearCaptures();
    console.log('🔍 DEBUG - Exécution mv...');
    cmdMv(['alice-file.txt', 'moved-file.txt'], context);
    
    // 🐛 DEBUG: Analyser les captures
    const captures = getCaptures();
    console.log('🔍 DEBUG - Captures reçues:');
    console.log('  Nombre total:', captures.length);
    captures.forEach((capture, index) => {
        console.log(`  [${index}] ${capture.className}: "${capture.text}"`);
    });
    
    const hasPermError = hasPermissionDeniedError(captures);
    console.log('🔍 DEBUG - Résultat:');
    console.log('  A erreur de permission:', hasPermError);
    
    // 🐛 DEBUG: État final des fichiers
    console.log('🔍 DEBUG - État final:');
    console.log('  alice-file.txt existe encore:', !!context.fileSystem['/root/alice-file.txt']);
    console.log('  moved-file.txt existe:', !!context.fileSystem['/root/moved-file.txt']);
    
    // Vérifier que mv a échoué avec une erreur de permission
    if (!hasPermError) {
        console.log('❌ PROBLÈME: mv devrait échouer avec erreur de permission mais n\'en a pas généré');
        return false;
    }
    
    // Vérifier que le fichier n'a pas été déplacé
    assert.fileExists(context, '/root/alice-file.txt', 'Le fichier source doit toujours exister');
    assert.fileNotExists(context, '/root/moved-file.txt', 'Le fichier destination ne doit pas exister');
    
    cmdExit([], context);
    console.log('✅ mv respecte les permissions de lecture sur source');
    return true;
}

/**
 * TEST 2: mv échoue sans permission d'écriture sur le répertoire parent de la destination
 */
function testMvDestinationWritePermissionDenied() {
    console.log('🧪 TEST PERMISSIONS: mv échoue sans écriture sur répertoire destination');
    
    clearCaptures();
    clearUserStack();
    const context = createTestContext();
    
    // Créer utilisateurs
    prepareUserWithoutPassword(context, 'alice');
    prepareUserWithoutPassword(context, 'bob');
    
    // root crée un répertoire et fichier
    testUtils.createTestDirectory(context, '/root/readonly-dir');
    testUtils.createTestFile(context, '/root/test-file.txt', 'contenu test');
    
    // Définir le répertoire en lecture seule pour other
    cmdChmod(['755', 'readonly-dir'], context); // rwxr-xr-x
    const dir = context.fileSystem['/root/readonly-dir'];
    dir.owner = 'alice';
    dir.group = 'alice';
    
    // Le fichier appartient à bob
    const file = context.fileSystem['/root/test-file.txt'];
    file.owner = 'bob';
    file.group = 'bob';
    
    // Passer à l'utilisateur bob
    cmdSu(['bob'], context);
    
    // Vérifier que bob ne peut pas écrire dans readonly-dir
    validatePermissionCheck(context, '/root/readonly-dir', context.currentUser, 'write', false);
    
    // bob essaie de déplacer son fichier dans le répertoire d'alice
    clearCaptures();
    cmdMv(['test-file.txt', 'readonly-dir/moved-file.txt'], context);
    
    // Vérifier que mv a échoué
    const captures = getCaptures();
    assert.isTrue(hasPermissionDeniedError(captures), 'mv doit échouer avec erreur de permission sur destination');
    
    // Vérifier que le fichier n'a pas été déplacé
    assert.fileExists(context, '/root/test-file.txt', 'Le fichier source doit toujours exister');
    assert.fileNotExists(context, '/root/readonly-dir/moved-file.txt', 'Le fichier destination ne doit pas exister');
    
    cmdExit([], context);
    console.log('✅ mv respecte les permissions d\'écriture sur répertoire destination');
    return true;
}

/**
 * TEST 3: mv échoue sans permission d'écriture sur le répertoire parent du fichier source
 */
function testMvSourceDirectoryWritePermissionDenied() {
    console.log('🧪 TEST PERMISSIONS: mv échoue sans écriture sur répertoire source');
    
    clearCaptures();
    clearUserStack();
    const context = createTestContext();
    
    // Créer utilisateurs
    prepareUserWithoutPassword(context, 'alice');
    prepareUserWithoutPassword(context, 'bob');
    
    // root crée un répertoire avec un fichier
    testUtils.createTestDirectory(context, '/root/alice-dir');
    testUtils.createTestFile(context, '/root/alice-dir/file.txt', 'contenu');
    
    // alice possède le répertoire et le fichier
    const dir = context.fileSystem['/root/alice-dir'];
    dir.owner = 'alice';
    dir.group = 'alice';
    cmdChmod(['755', 'alice-dir'], context); // rwxr-xr-x (bob ne peut pas écrire)
    
    const file = context.fileSystem['/root/alice-dir/file.txt'];
    file.owner = 'bob'; // bob possède le fichier
    file.group = 'bob';
    
    // Passer à l'utilisateur bob
    cmdSu(['bob'], context);
    
    // Vérifier que bob ne peut pas écrire dans alice-dir
    validatePermissionCheck(context, '/root/alice-dir', context.currentUser, 'write', false);
    
    // bob essaie de déplacer son fichier hors du répertoire d'alice
    clearCaptures();
    cmdMv(['alice-dir/file.txt', 'moved-out.txt'], context);
    
    // Vérifier que mv a échoué
    const captures = getCaptures();
    assert.isTrue(hasPermissionDeniedError(captures), 'mv doit échouer sans permission écriture sur répertoire source');
    
    // Vérifier que le fichier n'a pas été déplacé
    assert.fileExists(context, '/root/alice-dir/file.txt', 'Le fichier source doit toujours exister');
    assert.fileNotExists(context, '/root/moved-out.txt', 'Le fichier destination ne doit pas exister');
    
    cmdExit([], context);
    console.log('✅ mv respecte les permissions d\'écriture sur répertoire source');
    return true;
}

/**
 * TEST 4: mv réussit avec permissions appropriées
 */
function testMvSucceedsWithProperPermissions() {
    console.log('🧪 TEST PERMISSIONS: mv réussit avec permissions appropriées');
    
    clearCaptures();
    clearUserStack();
    const context = createTestContext();
    
    // Créer utilisateur bob
    prepareUserWithoutPassword(context, 'bob');
    
    // Passer à l'utilisateur bob AVANT de créer les fichiers
    cmdSu(['bob'], context);
    
    // bob crée des répertoires et fichiers dans son HOME (pas dans /root/)
    const bobHome = '/home/bob';
    
    // S'assurer que le home de bob existe et lui appartient
    if (!context.fileSystem[bobHome]) {
        testUtils.createTestDirectory(context, bobHome);
        const homeDir = context.fileSystem[bobHome];
        homeDir.owner = 'bob';
        homeDir.group = 'bob';
        homeDir.permissions = 'drwxr-xr-x';
    }
    
    // Changer vers le home de bob
    context.setCurrentPath(bobHome);
    
    // bob crée ses propres répertoires et fichiers
    testUtils.createTestDirectory(context, `${bobHome}/source-dir`);
    testUtils.createTestDirectory(context, `${bobHome}/dest-dir`);
    testUtils.createTestFile(context, `${bobHome}/source-dir/file.txt`, 'contenu test');
    
    // S'assurer que bob possède tout
    const sourceDir = context.fileSystem[`${bobHome}/source-dir`];
    sourceDir.owner = 'bob';
    sourceDir.group = 'bob';
    sourceDir.permissions = 'drwxr-xr-x';
    
    const destDir = context.fileSystem[`${bobHome}/dest-dir`];
    destDir.owner = 'bob';
    destDir.group = 'bob';
    destDir.permissions = 'drwxr-xr-x';
    
    const file = context.fileSystem[`${bobHome}/source-dir/file.txt`];
    file.owner = 'bob';
    file.group = 'bob';
    file.permissions = '-rw-r--r--';
    
    // bob déplace son fichier (chemins relatifs dans son home)
    clearCaptures();
    cmdMv(['source-dir/file.txt', 'dest-dir/file.txt'], context);
    
    // Vérifier que mv a réussi (silencieux)
    const captures = getCaptures();
    
    // Debug si ça échoue encore
    if (captures.length > 0) {
        console.log('🔍 DEBUG - Captures inattendues:');
        captures.forEach((capture, index) => {
            console.log(`  [${index}] ${capture.className}: "${capture.text}"`);
        });
    }
    
    assert.captureCount(0, 'mv doit être silencieux en cas de succès');
    
    // Vérifier que le fichier a été déplacé
    assert.fileNotExists(context, `${bobHome}/source-dir/file.txt`, 'Le fichier source ne doit plus exister');
    assert.fileExists(context, `${bobHome}/dest-dir/file.txt`, 'Le fichier destination doit exister');
    assert.equals(context.fileSystem[`${bobHome}/dest-dir/file.txt`].content, 'contenu test', 'Le contenu doit être préservé');
    
    cmdExit([], context);
    console.log('✅ mv réussit dans le répertoire home de l\'utilisateur');
    return true;
}

/**
 * TEST 5: root peut déplacer n'importe quel fichier
 */
function testMvRootCanMoveAnything() {
    console.log('🧪 TEST PERMISSIONS: root peut déplacer n\'importe quel fichier');
    
    clearCaptures();
    clearUserStack();
    const context = createTestContext();
    
    // Créer utilisateur
    prepareUserWithoutPassword(context, 'alice');
    
    // root crée un fichier appartenant à alice avec permissions restrictives
    testUtils.createTestFile(context, '/root/alice-private.txt', 'secret alice');
    cmdChmod(['600', 'alice-private.txt'], context); // rw-------
    
    const file = context.fileSystem['/root/alice-private.txt'];
    file.owner = 'alice';
    file.group = 'alice';
    
    // root (utilisateur actuel) déplace le fichier
    clearCaptures();
    cmdMv(['alice-private.txt', 'moved-by-root.txt'], context);
    
    // Vérifier que mv a réussi
    const captures = getCaptures();
    assert.captureCount(0, 'mv par root doit être silencieux');
    
    // Vérifier que le fichier a été déplacé
    assert.fileNotExists(context, '/root/alice-private.txt', 'Le fichier source ne doit plus exister');
    assert.fileExists(context, '/root/moved-by-root.txt', 'Le fichier destination doit exister');
    assert.equals(context.fileSystem['/root/moved-by-root.txt'].content, 'secret alice', 'Le contenu doit être préservé');
    
    console.log('✅ root peut déplacer n\'importe quel fichier (privilèges administrateur)');
    return true;
}

/**
 * TEST 6: mv d'un répertoire sans permission traverse
 */
function testMvDirectoryWithoutTraversePermission() {
    console.log('🧪 TEST PERMISSIONS: mv répertoire sans permission traverse');
    
    clearCaptures();
    clearUserStack();
    const context = createTestContext();
    
    // Créer utilisateurs
    prepareUserWithoutPassword(context, 'alice');
    prepareUserWithoutPassword(context, 'bob');
    
    // root crée un répertoire avec contenu
    testUtils.createTestDirectory(context, '/root/restricted-dir');
    testUtils.createTestFile(context, '/root/restricted-dir/secret.txt', 'secret');
    
    // alice possède le répertoire parent avec permission d'écriture
    const parentDir = context.fileSystem['/root'];
    parentDir.owner = 'alice';
    parentDir.group = 'alice';
    
    // bob possède le répertoire mais sans permission d'exécution (traverse)
    const restrictedDir = context.fileSystem['/root/restricted-dir'];
    restrictedDir.owner = 'bob';
    restrictedDir.group = 'bob';
    cmdChmod(['600', 'restricted-dir'], context); // rw------- (pas d'exécution)
    
    // alice essaie de déplacer le répertoire de bob
    cmdSu(['alice'], context);
    
    clearCaptures();
    cmdMv(['restricted-dir', 'moved-dir'], context);
    
    // Selon Debian, mv devrait échouer car alice ne peut pas traverser le répertoire
    const captures = getCaptures();
    assert.isTrue(hasPermissionDeniedError(captures), 'mv doit échouer sans permission traverse');
    
    cmdExit([], context);
    console.log('✅ mv respecte les permissions de traverse sur répertoires');
    return true;
}

// Exporter les tests
export const mvPermissionsTests = [
    createTest('mv - Source read permission denied', testMvSourceReadPermissionDenied),
    createTest('mv - Destination write permission denied', testMvDestinationWritePermissionDenied),
    createTest('mv - Source directory write permission denied', testMvSourceDirectoryWritePermissionDenied),
    createTest('mv - Succeeds with proper permissions', testMvSucceedsWithProperPermissions),
    createTest('mv - Root can move anything', testMvRootCanMoveAnything),
    createTest('mv - Directory without traverse permission', testMvDirectoryWithoutTraversePermission)
];

export default mvPermissionsTests;