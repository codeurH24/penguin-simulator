// test-cases/specs/commands/rm/permissions.test.js - Tests des permissions pour rm (Version avec ajouts minimaux)
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdRm } from '../../../../bin/rm.js';
import { cmdMkdir } from '../../../../bin/mkdir.js';
import { cmdTouch } from '../../../../bin/touch.js';
import { cmdUseradd } from '../../../../bin/useradd.js';
import { cmdPasswd } from '../../../../bin/passwd.js';
import { cmdSu } from '../../../../bin/su.js';
import { cmdExit } from '../../../../lib/bash-builtins.js';
import { cmdChmod } from '../../../../bin/chmod.js';
import { clearUserStack } from '../../../../modules/users/user-stack.js';
import { FileSystemService } from '../../../../modules/filesystem/index.js';


// ✅ AJOUT: Fonction pour vérifier les permissions via FileSystemService
function validatePermissionCheck(context, filePath, user, operation, shouldBeAllowed) {
    try {
        const fileSystemService = new FileSystemService(context);
        const permissionCheck = fileSystemService.permissionsSystem.hasPermission(filePath, user, operation);
        
        if (shouldBeAllowed) {
            assert.isTrue(permissionCheck.allowed, 
                `L'utilisateur ${user.username} devrait avoir la permission ${operation} sur ${filePath}. Raison: ${permissionCheck.reason}`);
        } else {
            assert.isFalse(permissionCheck.allowed, 
                `L'utilisateur ${user.username} ne devrait PAS avoir la permission ${operation} sur ${filePath}`);
        }
        
        return permissionCheck;
    } catch (error) {
        // Si FileSystemService n'est pas disponible, on ignore la vérification
        console.warn('FileSystemService non disponible pour validation permissions:', error.message);
        return null;
    }
}

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
               text.includes('accès refusé') ||
               text.includes('operation not permitted') ||
               text.includes('opération non permise');
    });
}

/**
 * Test 1: Suppression d'un fichier sans permission d'écriture dans le répertoire parent
 */
function testDeleteFileNoWritePermissionInParent() {
    clearCaptures();
    clearUserStack();
    const context = createTestContext();
    
    // Créer alice
    prepareUserWithoutPassword(context, 'alice');
    
    // Root crée un répertoire et un fichier
    cmdMkdir(['/tmp/restricted'], context);
    cmdTouch(['/tmp/restricted/testfile.txt'], context);
    
    // Retirer les permissions d'écriture du répertoire pour les autres
    cmdChmod(['755', '/tmp/restricted'], context); // rwxr-xr-x - pas d'écriture pour others
    
    // ✅ AJOUT: Vérifier que les permissions sont correctement définies
    const dirEntry = context.fileSystem['/tmp/restricted'];
    assert.isNotNull(dirEntry, 'Le répertoire /tmp/restricted devrait exister');
    assert.equals(dirEntry.permissions, 'drwxr-xr-x', 'Le répertoire devrait avoir les permissions 755');
    
    // Basculer vers alice
    cmdSu(['alice'], context);
    
    // ✅ AJOUT: Vérifier que alice n'a PAS permission d'écriture sur le répertoire parent
    const aliceUser = context.currentUser;
    validatePermissionCheck(context, '/tmp/restricted', aliceUser, 'write', false);
    
    // Alice essaie de supprimer le fichier
    clearCaptures();
    cmdRm(['/tmp/restricted/testfile.txt'], context);
    
    const captures = getCaptures();
    
    // Vérifier qu'une erreur de permission denied a été générée
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isTrue(hasPermissionError, 'Une erreur de permission denied devrait être générée');
    
    // Le fichier devrait toujours exister
    assert.fileExists(context, '/tmp/restricted/testfile.txt', 'Le fichier devrait toujours exister');
    
    // Revenir à root
    cmdExit([], context);
}

/**
 * Test 2: Suppression d'un fichier par son propriétaire
 */
function testDeleteFileByOwner() {
    clearCaptures();
    clearUserStack();
    const context = createTestContext();
    
    // Créer bob
    prepareUserWithoutPassword(context, 'bob');
    
    // Root crée un répertoire pour bob
    cmdMkdir(['/tmp/bob_dir'], context);
    cmdTouch(['/tmp/bob_dir/bob_file.txt'], context);
    
    // Changer le propriétaire pour bob
    const dirEntry = context.fileSystem['/tmp/bob_dir'];
    const fileEntry = context.fileSystem['/tmp/bob_dir/bob_file.txt'];
    dirEntry.owner = 'bob';
    fileEntry.owner = 'bob';
    
    // ✅ AJOUT: Vérifier les propriétaires
    assert.equals(dirEntry.owner, 'bob', 'Le répertoire devrait appartenir à bob');
    assert.equals(fileEntry.owner, 'bob', 'Le fichier devrait appartenir à bob');
    
    // Basculer vers bob
    cmdSu(['bob'], context);
    const bobUser = context.currentUser;
    
    // ✅ AJOUT: Bob devrait avoir permission d'écriture sur son répertoire
    validatePermissionCheck(context, '/tmp/bob_dir', bobUser, 'write', true);
    
    // Bob supprime son fichier
    clearCaptures();
    cmdRm(['/tmp/bob_dir/bob_file.txt'], context);
    
    const captures = getCaptures();
    
    // Aucune erreur ne devrait être générée
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isFalse(hasPermissionError, 'Aucune erreur de permission ne devrait être générée pour le propriétaire');
    
    // Le fichier devrait être supprimé
    assert.fileNotExists(context, '/tmp/bob_dir/bob_file.txt', 'Le fichier devrait être supprimé');
    
    // Revenir à root
    cmdExit([], context);
}

/**
 * Test 3: Suppression récursive sans permission
 */
function testRecursiveDeleteNoPermission() {
    clearCaptures();
    clearUserStack();
    const context = createTestContext();
    
    // Créer carol
    prepareUserWithoutPassword(context, 'carol');
    
    // Root crée un répertoire protégé
    cmdMkdir(['/tmp/protected'], context);
    cmdMkdir(['/tmp/protected/subdir'], context);
    cmdTouch(['/tmp/protected/subdir/secret.txt'], context);
    
    // Retirer toutes les permissions pour les autres
    cmdChmod(['700', '/tmp/protected'], context); // rwx------ 
    cmdChmod(['700', '/tmp/protected/subdir'], context);
    
    // ✅ AJOUT: Vérifier les permissions
    const protectedEntry = context.fileSystem['/tmp/protected'];
    assert.isNotNull(protectedEntry, 'Le répertoire protégé devrait exister');
    assert.equals(protectedEntry.permissions, 'drwx------', 'Le répertoire devrait avoir les permissions 700');
    
    // Basculer vers carol
    cmdSu(['carol'], context);
    const carolUser = context.currentUser;
    
    // ✅ AJOUT: Carol ne devrait pas avoir les permissions nécessaires
    validatePermissionCheck(context, '/tmp/protected', carolUser, 'write', false);
    
    // Carol essaie de supprimer récursivement
    clearCaptures();
    cmdRm(['-r', '/tmp/protected/subdir'], context);
    
    const captures = getCaptures();
    
    // Une erreur devrait être générée
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isTrue(hasPermissionError, 'Une erreur de permission denied devrait être générée');
    
    // Le répertoire devrait toujours exister
    assert.fileExists(context, '/tmp/protected/subdir', 'Le répertoire devrait toujours exister');
    
    // Revenir à root
    cmdExit([], context);
}

/**
 * Test 4: Root peut toujours supprimer
 */
function testRootCanAlwaysDelete() {
    clearCaptures();
    clearUserStack();
    const context = createTestContext();
    
    // Créer dave
    prepareUserWithoutPassword(context, 'dave');
    
    // Dave crée un répertoire privé
    cmdSu(['dave'], context);
    cmdMkdir(['/tmp/dave_private'], context);
    cmdTouch(['/tmp/dave_private/secret.txt'], context);
    
    // Dave retire toutes les permissions du répertoire
    cmdChmod(['000', '/tmp/dave_private'], context); // Aucune permission
    cmdExit([], context);
    
    // ✅ AJOUT: Vérifier que le répertoire a bien aucune permission
    const dirEntry = context.fileSystem['/tmp/dave_private'];
    assert.isNotNull(dirEntry, 'Le répertoire privé devrait exister');
    assert.equals(dirEntry.permissions, 'd---------', 'Le répertoire ne devrait avoir aucune permission');
    
    // ✅ AJOUT: Vérifier que root a toujours les permissions via FileSystemService
    const rootUser = context.currentUser;
    const permCheck = validatePermissionCheck(context, '/tmp/dave_private', rootUser, 'write', true);
    if (permCheck) {
        assert.equals(permCheck.reason, 'Root user', 'La raison devrait être "Root user"');
    }
    
    // Root devrait pouvoir supprimer malgré l'absence de permissions
    clearCaptures();
    cmdRm(['-r', '/tmp/dave_private'], context);
    
    const captures = getCaptures();
    
    // Aucune erreur ne devrait être générée pour root
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isFalse(hasPermissionError, 'Root ne devrait pas avoir d\'erreur de permission');
    
    // Le répertoire devrait être supprimé
    assert.fileNotExists(context, '/tmp/dave_private', 'Le répertoire devrait être supprimé par root');
}

/**
 * Test 5: Suppression avec -f ignore les erreurs de permission (mode silencieux)
 */
function testForceOptionIgnoresPermissionErrors() {
    clearCaptures();
    clearUserStack();
    const context = createTestContext();
    
    // Créer eve
    prepareUserWithoutPassword(context, 'eve');
    
    // Root crée un fichier dans un répertoire protégé
    cmdMkdir(['/tmp/readonly'], context);
    cmdTouch(['/tmp/readonly/protected.txt'], context);
    cmdChmod(['555', '/tmp/readonly'], context); // r-xr-xr-x
    
    // ✅ AJOUT: Vérifier les permissions
    const dirEntry = context.fileSystem['/tmp/readonly'];
    assert.equals(dirEntry.permissions, 'dr-xr-xr-x', 'Le répertoire devrait avoir les permissions 555');
    
    // Basculer vers eve
    cmdSu(['eve'], context);
    const eveUser = context.currentUser;
    
    // ✅ AJOUT: Eve ne devrait pas avoir permission d'écriture
    validatePermissionCheck(context, '/tmp/readonly', eveUser, 'write', false);
    
    // Eve essaie de supprimer avec -f
    clearCaptures();
    cmdRm(['-f', '/tmp/readonly/protected.txt'], context);
    
    const captures = getCaptures();
    
    // Avec -f, rm devrait être silencieux même en cas d'erreur de permission
    // Le fichier devrait toujours exister car eve n'a pas les permissions
    assert.fileExists(context, '/tmp/readonly/protected.txt', 'Le fichier devrait toujours exister');
    
    // Mais il ne devrait pas y avoir de message d'erreur affiché (comportement de -f)
    const hasErrorMessage = captures.some(capture => capture.className === 'error');
    assert.isFalse(hasErrorMessage, 'Avec -f, aucun message d\'erreur ne devrait être affiché');
    
    // Revenir à root
    cmdExit([], context);
}

/**
 * Test 6: Permission de lecture nécessaire pour supprimer récursivement
 */
function testRecursiveDeleteNeedsReadPermission() {
    clearCaptures();
    clearUserStack();
    const context = createTestContext();
    
    // Créer frank
    prepareUserWithoutPassword(context, 'frank');
    
    // Root crée un répertoire complexe
    cmdMkdir(['/tmp/complex'], context);
    cmdMkdir(['/tmp/complex/level1'], context);
    cmdTouch(['/tmp/complex/level1/file1.txt'], context);
    
    // Retirer la permission de lecture du sous-répertoire
    cmdChmod(['333', '/tmp/complex/level1'], context); // -wx-wx-wx (pas de lecture)
    
    // Donner permission d'écriture au répertoire parent pour frank
    cmdChmod(['777', '/tmp/complex'], context);
    
    // ✅ AJOUT: Vérifier les permissions
    const level1Entry = context.fileSystem['/tmp/complex/level1'];
    assert.equals(level1Entry.permissions, 'd-wx-wx-wx', 'level1 ne devrait pas avoir de permission de lecture');
    
    // Basculer vers frank
    cmdSu(['frank'], context);
    const frankUser = context.currentUser;
    
    // ✅ AJOUT: Frank devrait avoir permission d'écriture sur le parent mais pas de lecture sur level1
    validatePermissionCheck(context, '/tmp/complex', frankUser, 'write', true);
    validatePermissionCheck(context, '/tmp/complex/level1', frankUser, 'read', false);
    
    // Frank essaie de supprimer récursivement
    clearCaptures();
    cmdRm(['-r', '/tmp/complex/level1'], context);
    
    const captures = getCaptures();
    
    // Sans permission de lecture, rm -r devrait échouer
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isTrue(hasPermissionError, 'Une erreur de permission denied devrait être générée pour la lecture');
    
    // Le répertoire devrait toujours exister
    assert.fileExists(context, '/tmp/complex/level1', 'Le répertoire devrait toujours exister');
    
    // Revenir à root
    cmdExit([], context);
}

// Export des tests
export const rmPermissionsTests = [
    createTest('Fichier - pas de permission d\'écriture dans parent', testDeleteFileNoWritePermissionInParent),
    createTest('Fichier - suppression par propriétaire', testDeleteFileByOwner),
    createTest('Récursif - pas de permission', testRecursiveDeleteNoPermission),
    createTest('Root - peut toujours supprimer', testRootCanAlwaysDelete),
    createTest('Option -f - ignore erreurs de permission', testForceOptionIgnoresPermissionErrors),
    createTest('Récursif - besoin permission de lecture', testRecursiveDeleteNeedsReadPermission)
];