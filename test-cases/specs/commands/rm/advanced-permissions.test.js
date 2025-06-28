// test-cases/specs/commands/rm/advanced-permissions.test.js - Tests avancés des permissions pour rm
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdRm } from '../../../../bin/rm.js';
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
         capture.text.toLowerCase().includes('refusée'))
    );
}

/**
 * Fonction pour vérifier les permissions via FileSystemService
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
 * Test avancé 1: Sticky bit sur /tmp - protection contre suppression entre utilisateurs
 * Dans un répertoire avec sticky bit, un utilisateur ne peut supprimer que ses propres fichiers
 */
function testStickyBitProtection() {
    clearCaptures();
    clearUserStack();
    const context = createTestContext();
    
    // Créer deux utilisateurs
    prepareUserWithoutPassword(context, 'alice');
    prepareUserWithoutPassword(context, 'bob');
    
    // Vérifier que /tmp a le sticky bit (devrait être configuré par défaut)
    const tmpEntry = context.fileSystem['/tmp'];
    assert.isNotNull(tmpEntry, '/tmp devrait exister');
    assert.equals(tmpEntry.permissions, 'drwxrwxrwt', '/tmp devrait avoir le sticky bit (drwxrwxrwt)');
    
    // Alice crée un fichier dans /tmp
    cmdSu(['alice'], context);
    cmdTouch(['/tmp/alice_file.txt'], context);
    
    // Vérifier que le fichier appartient à Alice
    const aliceFile = context.fileSystem['/tmp/alice_file.txt'];
    assert.isNotNull(aliceFile, 'Le fichier d\'Alice devrait exister');
    assert.equals(aliceFile.owner, 'alice', 'Le fichier devrait appartenir à Alice');
    
    // Alice crée également un dossier dans /tmp
    cmdMkdir(['/tmp/alice_dir'], context);
    const aliceDir = context.fileSystem['/tmp/alice_dir'];
    assert.isNotNull(aliceDir, 'Le dossier d\'Alice devrait exister');
    assert.equals(aliceDir.owner, 'alice', 'Le dossier devrait appartenir à Alice');
    
    cmdExit([], context);
    
    // Bob crée aussi un fichier dans /tmp
    cmdSu(['bob'], context);
    cmdTouch(['/tmp/bob_file.txt'], context);
    
    // Vérifier que le fichier appartient à Bob
    const bobFile = context.fileSystem['/tmp/bob_file.txt'];
    assert.isNotNull(bobFile, 'Le fichier de Bob devrait exister');
    assert.equals(bobFile.owner, 'bob', 'Le fichier devrait appartenir à Bob');
    
    // ✅ TEST CRITIQUE: Bob essaie de supprimer le fichier d'Alice
    clearCaptures();
    cmdRm(['/tmp/alice_file.txt'], context);
    
    const captures = getCaptures();
    
    // Cela devrait échouer à cause du sticky bit
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isTrue(hasPermissionError, 'Bob ne devrait pas pouvoir supprimer le fichier d\'Alice dans /tmp (sticky bit)');
    
    // Le fichier d'Alice devrait toujours exister
    assert.fileExists(context, '/tmp/alice_file.txt', 'Le fichier d\'Alice devrait toujours exister');
    
    // ✅ TEST CRITIQUE: Bob essaie de supprimer le dossier d'Alice
    clearCaptures();
    cmdRm(['-r', '/tmp/alice_dir'], context);
    
    const captures1b = getCaptures();
    const hasPermissionError1b = hasPermissionDeniedError(captures1b);
    assert.isTrue(hasPermissionError1b, 'Bob ne devrait pas pouvoir supprimer le dossier d\'Alice dans /tmp (sticky bit)');
    
    // Le dossier d'Alice devrait toujours exister
    assert.fileExists(context, '/tmp/alice_dir', 'Le dossier d\'Alice devrait toujours exister');
    
    // ✅ TEST: Bob peut supprimer son propre fichier
    clearCaptures();
    cmdRm(['/tmp/bob_file.txt'], context);
    
    const captures2 = getCaptures();
    const hasPermissionError2 = hasPermissionDeniedError(captures2);
    assert.isFalse(hasPermissionError2, 'Bob devrait pouvoir supprimer son propre fichier');
    
    // Le fichier de Bob devrait être supprimé
    assert.fileNotExists(context, '/tmp/bob_file.txt', 'Le fichier de Bob devrait être supprimé');
    
    cmdExit([], context);
    
    // ✅ TEST: Root peut supprimer n'importe quel fichier même avec sticky bit
    clearCaptures();
    cmdRm(['-r', '/tmp/alice_file.txt', '/tmp/alice_dir'], context);
    
    const captures3 = getCaptures();
    const hasPermissionError3 = hasPermissionDeniedError(captures3);
    assert.isFalse(hasPermissionError3, 'Root devrait pouvoir supprimer n\'importe quel fichier même avec sticky bit');
    
    // Les fichiers d'Alice devraient maintenant être supprimés
    assert.fileNotExists(context, '/tmp/alice_file.txt', 'Le fichier d\'Alice devrait être supprimé par root');
    assert.fileNotExists(context, '/tmp/alice_dir', 'Le dossier d\'Alice devrait être supprimé par root');
}

/**
 * Test avancé 2: Suppression récursive avec permissions mixtes
 * Test d'un dossier avec sous-dossiers ayant des permissions différentes
 */
function testRecursiveMixedPermissions() {
    clearCaptures();
    clearUserStack();
    const context = createTestContext();
    
    // Créer charlie
    prepareUserWithoutPassword(context, 'charlie');
    
    // ✅ CORRECTION: Root crée la structure de base seulement
    cmdMkdir(['/home/complex'], context);
    cmdMkdir(['/home/complex/readable'], context);
    cmdMkdir(['/home/complex/protected'], context);
    cmdMkdir(['/home/complex/protected/subdir'], context);
    
    // Donner permissions différentes
    cmdChmod(['777', '/home/complex'], context);              // Accès total
    cmdChmod(['755', '/home/complex/readable'], context);     // Lecture OK pour Charlie
    cmdChmod(['000', '/home/complex/protected'], context);    // Aucune permission
    
    // ✅ NOUVEAU: Basculer vers charlie pour qu'il crée SES PROPRES fichiers
    cmdSu(['charlie'], context);
    
    // Charlie crée ses propres fichiers (qu'il pourra donc supprimer)
    cmdTouch(['/home/complex/readable/file1.txt'], context);
    
    // Charlie ne peut pas créer de fichier dans le dossier protégé (permissions 000)
    // Donc on laisse protected vide pour ce test
    
    // Vérifier les permissions
    const complexEntry = context.fileSystem['/home/complex'];
    const readableEntry = context.fileSystem['/home/complex/readable'];
    const protectedEntry = context.fileSystem['/home/complex/protected'];
    
    assert.equals(complexEntry.permissions, 'drwxrwxrwx', 'complex devrait avoir permissions 777');
    assert.equals(readableEntry.permissions, 'drwxr-xr-x', 'readable devrait avoir permissions 755');
    assert.equals(protectedEntry.permissions, 'd---------', 'protected devrait avoir permissions 000');
    
    const charlieUser = context.currentUser;
    
    // Vérifier les permissions de Charlie
    validatePermissionCheck(context, '/home/complex', charlieUser, 'write', true);
    validatePermissionCheck(context, '/home/complex/readable', charlieUser, 'read', true);
    validatePermissionCheck(context, '/home/complex/protected', charlieUser, 'read', false);
    
    // Charlie essaie de supprimer récursivement le dossier principal
    clearCaptures();
    cmdRm(['-r', '/home/complex'], context);
    
    const captures = getCaptures();
    
    // Cela devrait échouer à cause du sous-dossier protégé
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isTrue(hasPermissionError, 'La suppression devrait échouer à cause du dossier protégé');
    
    // Le dossier complex devrait toujours exister
    assert.fileExists(context, '/home/complex', 'Le dossier complex devrait toujours exister');
    assert.fileExists(context, '/home/complex/protected', 'Le dossier protégé devrait toujours exister');
    
    // ✅ NOUVEAU: Charlie peut maintenant supprimer le dossier readable (avec SES fichiers)
    clearCaptures();
    cmdRm(['-r', '/home/complex/readable'], context);
    
    const captures2 = getCaptures();
    const hasPermissionError2 = hasPermissionDeniedError(captures2);
    assert.isFalse(hasPermissionError2, 'Charlie devrait pouvoir supprimer le dossier readable avec ses propres fichiers');
    
    // Le dossier readable devrait être supprimé
    assert.fileNotExists(context, '/home/complex/readable', 'Le dossier readable devrait être supprimé');
    
    cmdExit([], context);
}

/**
 * Test avancé 3: Option -f avec wildcards et fichiers inexistants
 * L'option -f devrait être silencieuse même pour des patterns sans matches
 */
function testForceWithWildcardsAndMissingFiles() {
    clearCaptures();
    clearUserStack();
    const context = createTestContext();
    
    // Créer diana
    prepareUserWithoutPassword(context, 'diana');
    cmdSu(['diana'], context);
    
    // Test 1: Fichiers inexistants avec -f devrait être silencieux
    clearCaptures();
    cmdRm(['-f', '/tmp/nonexistent.txt'], context);
    
    const captures1 = getCaptures();
    
    // Aucun message d'erreur ne devrait être affiché
    const hasErrorMessage1 = captures1.some(capture => capture.className === 'error');
    assert.isFalse(hasErrorMessage1, 'rm -f avec fichier inexistant ne devrait pas afficher d\'erreur');
    
    // Test 2: Wildcards sans matches avec -f devrait être silencieux
    clearCaptures();
    cmdRm(['-f', '/tmp/*.nonexistent'], context);
    
    const captures2 = getCaptures();
    const hasErrorMessage2 = captures2.some(capture => capture.className === 'error');
    assert.isFalse(hasErrorMessage2, 'rm -f avec wildcard sans match ne devrait pas afficher d\'erreur');
    
    // Test 3: Multiple wildcards sans matches avec -f
    clearCaptures();
    cmdRm(['-f', '/tmp/*.missing', '/tmp/*.absent', '/tmp/*.gone'], context);
    
    const captures3 = getCaptures();
    const hasErrorMessage3 = captures3.some(capture => capture.className === 'error');
    assert.isFalse(hasErrorMessage3, 'rm -f avec multiples wildcards sans match ne devrait pas afficher d\'erreur');
    
    // Test 4: Mélange de fichiers existants et inexistants avec -f
    cmdTouch(['/tmp/existing.txt'], context);
    
    clearCaptures();
    cmdRm(['-f', '/tmp/existing.txt', '/tmp/missing.txt'], context);
    
    const captures4 = getCaptures();
    const hasErrorMessage4 = captures4.some(capture => capture.className === 'error');
    assert.isFalse(hasErrorMessage4, 'rm -f avec mélange de fichiers existants/inexistants ne devrait pas afficher d\'erreur');
    
    // Le fichier existant devrait être supprimé
    assert.fileNotExists(context, '/tmp/existing.txt', 'Le fichier existant devrait être supprimé');
    
    cmdExit([], context);
}

/**
 * Test avancé 4: Suppression récursive avec permissions sur sous-éléments individuels
 * Test où le dossier parent est accessible mais certains fichiers enfants ne le sont pas
 */
function testRecursiveWithIndividualFilePermissions() {
    clearCaptures();
    clearUserStack();
    const context = createTestContext();
    
    // Créer eve
    prepareUserWithoutPassword(context, 'eve');
    
    // Root crée une structure avec permissions granulaires
    cmdMkdir(['/tmp/granular'], context);
    cmdMkdir(['/tmp/granular/subdir'], context);
    
    cmdTouch(['/tmp/granular/public.txt'], context);
    cmdTouch(['/tmp/granular/private.txt'], context);
    cmdTouch(['/tmp/granular/subdir/file.txt'], context);
    
    // Donner permissions sur le dossier parent
    cmdChmod(['777', '/tmp/granular'], context);
    cmdChmod(['755', '/tmp/granular/subdir'], context);
    
    // Mais retirer permissions sur un fichier spécifique (simuler un fichier système)
    cmdChmod(['600', '/tmp/granular/private.txt'], context); // Seulement root
    
    // Vérifier les permissions
    const granularEntry = context.fileSystem['/tmp/granular'];
    const privateEntry = context.fileSystem['/tmp/granular/private.txt'];
    
    assert.equals(granularEntry.permissions, 'drwxrwxrwx', 'granular devrait être accessible');
    assert.equals(privateEntry.permissions, '-rw-------', 'private.txt devrait être privé');
    
    // Basculer vers eve
    cmdSu(['eve'], context);
    const eveUser = context.currentUser;
    
    // Vérifier les permissions d'Eve
    validatePermissionCheck(context, '/tmp/granular', eveUser, 'write', true);
    validatePermissionCheck(context, '/tmp/granular/private.txt', eveUser, 'read', false);
    
    // Eve essaie de supprimer récursivement
    clearCaptures();
    cmdRm(['-r', '/tmp/granular'], context);
    
    const captures = getCaptures();
    
    // Cela devrait échouer à cause du fichier privé
    const hasPermissionError = hasPermissionDeniedError(captures);
    assert.isTrue(hasPermissionError, 'La suppression devrait échouer à cause du fichier privé');
    
    // Le dossier et le fichier privé devraient toujours exister
    assert.fileExists(context, '/tmp/granular', 'Le dossier granular devrait toujours exister');
    assert.fileExists(context, '/tmp/granular/private.txt', 'Le fichier privé devrait toujours exister');
    
    // Eve peut supprimer individuellement les fichiers accessibles
    clearCaptures();
    cmdRm(['/tmp/granular/public.txt'], context);
    
    const captures2 = getCaptures();
    const hasPermissionError2 = hasPermissionDeniedError(captures2);
    assert.isFalse(hasPermissionError2, 'Eve devrait pouvoir supprimer les fichiers publics');
    
    // Le fichier public devrait être supprimé
    assert.fileNotExists(context, '/tmp/granular/public.txt', 'Le fichier public devrait être supprimé');
    
    cmdExit([], context);
}

/**
 * Test avancé 5: Comportement de -f avec permissions mixtes
 * L'option -f devrait supprimer ce qui est possible et être silencieuse pour le reste
 */
function testForceWithMixedPermissions() {
    clearCaptures();
    clearUserStack();
    const context = createTestContext();
    
    // Créer frank
    prepareUserWithoutPassword(context, 'frank');
    
    // Root crée des fichiers avec permissions différentes
    cmdMkdir(['/tmp/mixed'], context);
    cmdTouch(['/tmp/mixed/accessible.txt'], context);
    cmdTouch(['/tmp/mixed/protected.txt'], context);
    
    // Donner permissions différentes
    cmdChmod(['777', '/tmp/mixed'], context);
    cmdChmod(['666', '/tmp/mixed/accessible.txt'], context); // Accessible
    cmdChmod(['600', '/tmp/mixed/protected.txt'], context);  // Protégé
    
    // Basculer vers frank
    cmdSu(['frank'], context);
    
    // Frank utilise -f pour supprimer les deux fichiers
    clearCaptures();
    cmdRm(['-f', '/tmp/mixed/accessible.txt', '/tmp/mixed/protected.txt'], context);
    
    const captures = getCaptures();
    
    // Avec -f, aucun message d'erreur ne devrait être affiché
    const hasErrorMessage = captures.some(capture => capture.className === 'error');
    assert.isFalse(hasErrorMessage, 'rm -f ne devrait pas afficher d\'erreur même avec permissions mixtes');
    
    // Le fichier accessible devrait être supprimé
    assert.fileNotExists(context, '/tmp/mixed/accessible.txt', 'Le fichier accessible devrait être supprimé');
    
    // Le fichier protégé devrait toujours exister (mais pas d'erreur affichée)
    assert.fileExists(context, '/tmp/mixed/protected.txt', 'Le fichier protégé devrait toujours exister');
    
    cmdExit([], context);
}

// Export des tests avancés
export const rmAdvancedPermissionsTests = [
    createTest('Sticky bit - protection entre utilisateurs', testStickyBitProtection),
    createTest('Récursif - permissions mixtes sur sous-dossiers', testRecursiveMixedPermissions),
    createTest('Option -f - wildcards et fichiers inexistants', testForceWithWildcardsAndMissingFiles),
    createTest('Récursif - permissions granulaires sur fichiers', testRecursiveWithIndividualFilePermissions),
    createTest('Option -f - permissions mixtes silencieuses', testForceWithMixedPermissions)
];