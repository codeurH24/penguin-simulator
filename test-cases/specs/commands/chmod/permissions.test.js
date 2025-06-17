// test-cases/specs/commands/chmod/permissions.test.js
// Tests de permissions pour la commande chmod

import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdChmod } from '../../../../bin/chmod.js';
import { cmdUseradd } from '../../../../bin/useradd.js';
import { cmdPasswd } from '../../../../bin/passwd.js';
import { cmdSu } from '../../../../bin/su.js';
import { cmdExit } from '../../../../lib/bash-builtins.js';
import { clearUserStack } from '../../../../modules/users/user-stack.js';

/**
 * Fonction utilitaire pour créer un utilisateur sans mot de passe
 */
function prepareUserWithoutPassword(context, username) {
    cmdUseradd(['-m', username], context);
    cmdPasswd(['-d', username], context);
    
    const shadowFile = context.fileSystem['/etc/shadow'];
    const lines = shadowFile.content.split('\n');
    const userLine = lines.find(line => line.startsWith(username + ':'));
    
    if (userLine) {
        const [, passwordHash] = userLine.split(':');
        assert.equals(passwordHash, '', `Le mot de passe de ${username} devrait être vide après passwd -d`);
    }
    
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
               text.includes('access denied') ||
               text.includes('permission refusée') ||
               text.includes('opération non permise') ||
               text.includes('operation not permitted');
    });
}

/**
 * Test 1: Propriétaire peut modifier les permissions de ses fichiers
 */
function testOwnerCanChmodOwnFiles() {
    console.log('🧪 TEST PERMISSIONS: Propriétaire peut modifier ses fichiers');
    
    clearCaptures();
    clearUserStack();
    const context = createTestContext();
    
    // Créer utilisateur alice
    prepareUserWithoutPassword(context, 'alice');
    
    // Passer à alice
    cmdSu(['alice'], context);
    
    // Alice crée un fichier
    testUtils.createTestFile(context, '/home/alice/mon-fichier.txt', 'contenu alice');
    const file = context.fileSystem['/home/alice/mon-fichier.txt'];
    file.owner = 'alice';
    file.group = 'alice';
    
    // Alice modifie les permissions de son fichier
    clearCaptures();
    cmdChmod(['755', '/home/alice/mon-fichier.txt'], context);
    
    const captures = getCaptures();
    assert.captureCount(0, 'Le propriétaire doit pouvoir modifier les permissions de ses fichiers');
    
    // Vérifier que les permissions ont été changées
    const updatedFile = context.fileSystem['/home/alice/mon-fichier.txt'];
    assert.equals(updatedFile.permissions, '-rwxr-xr-x', 'Les permissions doivent être mises à jour');
    
    cmdExit([], context);
    console.log('✅ Propriétaire peut bien modifier ses permissions');
    return true;
}

/**
 * Test 2: Utilisateur ne peut pas modifier les permissions des fichiers d'autrui
 */
function testUserCannotChmodOthersFiles() {
    console.log('🧪 TEST PERMISSIONS: Utilisateur ne peut pas modifier fichiers d\'autrui');
    
    clearCaptures();
    clearUserStack();
    const context = createTestContext();
    
    // Créer utilisateurs alice et bob
    prepareUserWithoutPassword(context, 'alice');
    prepareUserWithoutPassword(context, 'bob');
    
    // root crée un fichier appartenant à alice
    testUtils.createTestFile(context, '/tmp/alice-file.txt', 'contenu alice');
    const file = context.fileSystem['/tmp/alice-file.txt'];
    file.owner = 'alice';
    file.group = 'alice';
    
    // bob essaie de modifier les permissions du fichier d'alice
    cmdSu(['bob'], context);
    
    clearCaptures();
    cmdChmod(['777', '/tmp/alice-file.txt'], context);
    
    const captures = getCaptures();
    assert.isTrue(hasPermissionDeniedError(captures), 'bob ne doit pas pouvoir modifier les permissions du fichier d\'alice');
    
    // Vérifier que les permissions n'ont pas changé
    const unchangedFile = context.fileSystem['/tmp/alice-file.txt'];
    assert.equals(unchangedFile.permissions, '-rw-r--r--', 'Les permissions ne doivent pas avoir changé');
    
    cmdExit([], context);
    console.log('✅ Utilisateur ne peut pas modifier les permissions d\'autrui');
    return true;
}

/**
 * Test 3: root peut modifier les permissions de n'importe quel fichier
 */
function testRootCanChmodAnyFile() {
    console.log('🧪 TEST PERMISSIONS: root peut modifier n\'importe quel fichier');
    
    clearCaptures();
    clearUserStack();
    const context = createTestContext();
    
    // Créer utilisateur alice
    prepareUserWithoutPassword(context, 'alice');
    
    // Passer à alice pour créer un fichier
    cmdSu(['alice'], context);
    testUtils.createTestFile(context, '/home/alice/alice-file.txt', 'contenu alice');
    const file = context.fileSystem['/home/alice/alice-file.txt'];
    file.owner = 'alice';
    file.group = 'alice';
    cmdExit([], context);
    
    // root modifie les permissions du fichier d'alice
    clearCaptures();
    cmdChmod(['700', '/home/alice/alice-file.txt'], context);
    
    const captures = getCaptures();
    assert.captureCount(0, 'root doit pouvoir modifier les permissions de n\'importe quel fichier');
    
    // Vérifier que les permissions ont été changées
    const updatedFile = context.fileSystem['/home/alice/alice-file.txt'];
    assert.equals(updatedFile.permissions, '-rwx------', 'root doit pouvoir changer les permissions');
    
    console.log('✅ root peut bien modifier toutes les permissions');
    return true;
}

/**
 * Test 4: Permissions sur répertoires - propriétaire peut modifier
 */
function testOwnerCanChmodOwnDirectories() {
    console.log('🧪 TEST PERMISSIONS: Propriétaire peut modifier ses répertoires');
    
    clearCaptures();
    clearUserStack();
    const context = createTestContext();
    
    // Créer utilisateur alice
    prepareUserWithoutPassword(context, 'alice');
    
    // Passer à alice
    cmdSu(['alice'], context);
    
    // Alice crée un répertoire (simulation en définissant le propriétaire)
    testUtils.createTestDirectory(context, '/home/alice/mon-dossier');
    const dir = context.fileSystem['/home/alice/mon-dossier'];
    dir.owner = 'alice';
    dir.group = 'alice';
    
    // Alice modifie les permissions de son répertoire
    clearCaptures();
    cmdChmod(['750', '/home/alice/mon-dossier'], context);
    
    const captures = getCaptures();
    assert.captureCount(0, 'Le propriétaire doit pouvoir modifier les permissions de ses répertoires');
    
    // Vérifier que les permissions ont été changées
    const updatedDir = context.fileSystem['/home/alice/mon-dossier'];
    assert.equals(updatedDir.permissions, 'drwxr-x---', 'Les permissions du répertoire doivent être mises à jour');
    
    cmdExit([], context);
    console.log('✅ Propriétaire peut bien modifier les permissions de ses répertoires');
    return true;
}

/**
 * Test 5: Modification de permissions sur plusieurs fichiers avec permissions mixtes
 */
function testChmodMixedPermissionsMultipleFiles() {
    console.log('🧪 TEST PERMISSIONS: chmod sur plusieurs fichiers avec permissions mixtes');
    
    clearCaptures();
    clearUserStack();
    const context = createTestContext();
    
    // Créer utilisateurs
    prepareUserWithoutPassword(context, 'alice');
    prepareUserWithoutPassword(context, 'bob');
    
    // root crée des fichiers avec différents propriétaires
    testUtils.createTestFile(context, '/tmp/alice-file.txt', 'alice');
    testUtils.createTestFile(context, '/tmp/bob-file.txt', 'bob');
    testUtils.createTestFile(context, '/tmp/root-file.txt', 'root');
    
    // Définir les propriétaires
    context.fileSystem['/tmp/alice-file.txt'].owner = 'alice';
    context.fileSystem['/tmp/alice-file.txt'].group = 'alice';
    context.fileSystem['/tmp/bob-file.txt'].owner = 'bob';
    context.fileSystem['/tmp/bob-file.txt'].group = 'bob';
    
    // alice essaie de modifier les permissions de tous les fichiers
    cmdSu(['alice'], context);
    
    clearCaptures();
    cmdChmod(['755', '/tmp/alice-file.txt', '/tmp/bob-file.txt', '/tmp/root-file.txt'], context);
    
    const captures = getCaptures();
    
    // Alice devrait avoir des erreurs pour les fichiers qu'elle ne possède pas
    const permissionErrors = captures.filter(capture => 
        capture.className === 'error' && 
        capture.text.includes('Opération non permise')
    );
    
    assert.isTrue(permissionErrors.length >= 2, 'Alice doit avoir des erreurs pour bob-file et root-file');
    
    // Vérifier que seul son fichier a été modifié
    assert.equals(context.fileSystem['/tmp/alice-file.txt'].permissions, '-rwxr-xr-x', 'Alice doit pouvoir modifier son fichier');
    assert.equals(context.fileSystem['/tmp/bob-file.txt'].permissions, '-rw-r--r--', 'Le fichier de bob ne doit pas changer');
    assert.equals(context.fileSystem['/tmp/root-file.txt'].permissions, '-rw-r--r--', 'Le fichier de root ne doit pas changer');
    
    cmdExit([], context);
    console.log('✅ chmod respecte les permissions sur fichiers multiples');
    return true;
}

/**
 * Test 6: Tentative de chmod avec mode symbolique par utilisateur non autorisé
 */
function testSymbolicModePermissionDenied() {
    console.log('🧪 TEST PERMISSIONS: Mode symbolique refusé pour utilisateur non autorisé');
    
    clearCaptures();
    clearUserStack();
    const context = createTestContext();
    
    // Créer utilisateurs
    prepareUserWithoutPassword(context, 'alice');
    prepareUserWithoutPassword(context, 'bob');
    
    // root crée un fichier appartenant à alice
    testUtils.createTestFile(context, '/tmp/restricted.txt', 'contenu restreint');
    const file = context.fileSystem['/tmp/restricted.txt'];
    file.owner = 'alice';
    file.group = 'alice';
    
    // bob essaie d'utiliser le mode symbolique
    cmdSu(['bob'], context);
    
    clearCaptures();
    cmdChmod(['u+x,g-r,o=w', '/tmp/restricted.txt'], context);
    
    const captures = getCaptures();
    assert.isTrue(hasPermissionDeniedError(captures), 'bob ne doit pas pouvoir utiliser chmod sur le fichier d\'alice');
    
    // Vérifier que les permissions n'ont pas changé
    const unchangedFile = context.fileSystem['/tmp/restricted.txt'];
    assert.equals(unchangedFile.permissions, '-rw-r--r--', 'Les permissions ne doivent pas avoir changé');
    
    cmdExit([], context);
    console.log('✅ Mode symbolique respecte bien les permissions');
    return true;
}

/**
 * Test 7: Vérification des permissions avant application sur fichier inexistant
 */
function testPermissionCheckNonexistentFile() {
    console.log('🧪 TEST PERMISSIONS: Vérification permissions sur fichier inexistant');
    
    clearCaptures();
    clearUserStack();
    const context = createTestContext();
    
    // Créer utilisateur alice
    prepareUserWithoutPassword(context, 'alice');
    cmdSu(['alice'], context);
    
    // alice essaie chmod sur un fichier inexistant
    clearCaptures();
    cmdChmod(['755', '/nonexistent/path/file.txt'], context);
    
    const captures = getCaptures();
    assert.isTrue(captures.length > 0, 'chmod doit afficher une erreur pour fichier inexistant');
    
    const hasError = captures.some(capture => 
        capture.className === 'error' && 
        capture.text.includes('impossible d\'accéder')
    );
    
    assert.isTrue(hasError, 'Message d\'erreur approprié doit être affiché');
    
    cmdExit([], context);
    console.log('✅ chmod gère bien les fichiers inexistants');
    return true;
}

/**
 * Test 8: Permissions avec groupes - utilisateur du même groupe
 */
function testGroupPermissionsChmod() {
    console.log('🧪 TEST PERMISSIONS: Permissions de groupe pour chmod');
    
    clearCaptures();
    clearUserStack();
    const context = createTestContext();
    
    // Créer utilisateurs
    prepareUserWithoutPassword(context, 'alice');
    prepareUserWithoutPassword(context, 'bob');
    
    // root crée un fichier appartenant à alice avec groupe alice
    testUtils.createTestFile(context, '/tmp/group-file.txt', 'contenu groupe');
    const file = context.fileSystem['/tmp/group-file.txt'];
    file.owner = 'alice';
    file.group = 'alice';
    
    // bob n'est pas propriétaire donc ne peut pas modifier même s'il est dans le groupe
    cmdSu(['bob'], context);
    
    clearCaptures();
    cmdChmod(['755', '/tmp/group-file.txt'], context);
    
    const captures = getCaptures();
    // Selon le comportement Unix standard, seul le propriétaire ou root peut modifier les permissions
    assert.isTrue(hasPermissionDeniedError(captures), 'Membre du groupe ne peut pas modifier permissions (comportement Unix)');
    
    cmdExit([], context);
    console.log('✅ Permissions de groupe respectées pour chmod');
    return true;
}

/**
 * Test 9: chmod récursif avec permissions mixtes
 */
function testRecursiveChmodWithMixedPermissions() {
    console.log('🧪 TEST PERMISSIONS: chmod -R avec permissions mixtes');
    
    clearCaptures();
    clearUserStack();
    const context = createTestContext();
    
    // Créer utilisateurs
    prepareUserWithoutPassword(context, 'alice');
    prepareUserWithoutPassword(context, 'bob');
    
    // root crée une structure avec des propriétaires mixtes
    testUtils.createTestDirectory(context, '/tmp/mixed-ownership');
    testUtils.createTestDirectory(context, '/tmp/mixed-ownership/alice-dir');
    testUtils.createTestFile(context, '/tmp/mixed-ownership/root-file.txt', 'root');
    testUtils.createTestFile(context, '/tmp/mixed-ownership/alice-dir/alice-file.txt', 'alice');
    testUtils.createTestFile(context, '/tmp/mixed-ownership/alice-dir/bob-file.txt', 'bob');
    
    // Définir propriétaires
    const aliceDir = context.fileSystem['/tmp/mixed-ownership/alice-dir'];
    aliceDir.owner = 'alice';
    aliceDir.group = 'alice';
    
    const aliceFile = context.fileSystem['/tmp/mixed-ownership/alice-dir/alice-file.txt'];
    aliceFile.owner = 'alice';
    aliceFile.group = 'alice';
    
    const bobFile = context.fileSystem['/tmp/mixed-ownership/alice-dir/bob-file.txt'];
    bobFile.owner = 'bob';
    bobFile.group = 'bob';
    
    // alice essaie chmod récursif
    cmdSu(['alice'], context);
    
    clearCaptures();
    cmdChmod(['-R', '755', '/tmp/mixed-ownership/alice-dir'], context);
    
    const captures = getCaptures();
    
    // Alice devrait avoir des erreurs pour les fichiers qu'elle ne possède pas
    const permissionErrors = captures.filter(capture => 
        capture.className === 'error' && 
        capture.text.includes('Opération non permise')
    );
    
    assert.isTrue(permissionErrors.length > 0, 'Alice doit avoir des erreurs pour les fichiers non possédés');
    
    // Vérifier que seuls ses fichiers ont été modifiés
    assert.equals(aliceDir.permissions, 'drwxr-xr-x', 'Le répertoire d\'alice doit être modifié');
    assert.equals(aliceFile.permissions, '-rwxr-xr-x', 'Le fichier d\'alice doit être modifié');
    
    // Le fichier de bob ne doit pas changer
    assert.equals(bobFile.permissions, '-rw-r--r--', 'Le fichier de bob ne doit pas changer');
    
    cmdExit([], context);
    console.log('✅ chmod -R respecte les permissions sur structure mixte');
    return true;
}

/**
 * Test 10: Protection contre escalade de privilèges
 */
function testPrivilegeEscalationProtection() {
    console.log('🧪 TEST PERMISSIONS: Protection contre escalade de privilèges');
    
    clearCaptures();
    clearUserStack();
    const context = createTestContext();
    
    // Créer utilisateur alice
    prepareUserWithoutPassword(context, 'alice');
    
    // root crée des fichiers système sensibles
    testUtils.createTestFile(context, '/etc/passwd-backup', 'contenu sensible');
    testUtils.createTestFile(context, '/etc/shadow-backup', 'hashes sensibles');
    
    // alice essaie de modifier les permissions de fichiers système
    cmdSu(['alice'], context);
    
    clearCaptures();
    cmdChmod(['777', '/etc/passwd-backup'], context);
    
    let captures = getCaptures();
    assert.isTrue(hasPermissionDeniedError(captures), 'alice ne doit pas pouvoir modifier /etc/passwd-backup');
    
    clearCaptures();
    cmdChmod(['777', '/etc/shadow-backup'], context);
    
    captures = getCaptures();
    assert.isTrue(hasPermissionDeniedError(captures), 'alice ne doit pas pouvoir modifier /etc/shadow-backup');
    
    // Vérifier que les permissions restent inchangées
    assert.equals(context.fileSystem['/etc/passwd-backup'].permissions, '-rw-r--r--', '/etc/passwd-backup doit garder ses permissions');
    assert.equals(context.fileSystem['/etc/shadow-backup'].permissions, '-rw-r--r--', '/etc/shadow-backup doit garder ses permissions');
    
    cmdExit([], context);
    console.log('✅ Protection contre escalade de privilèges fonctionnelle');
    return true;
}

// Exporter les tests
export const chmodPermissionsTests = [
    createTest('chmod - Propriétaire peut modifier ses fichiers', testOwnerCanChmodOwnFiles),
    createTest('chmod - Utilisateur ne peut pas modifier fichiers d\'autrui', testUserCannotChmodOthersFiles),
    createTest('chmod - root peut modifier n\'importe quel fichier', testRootCanChmodAnyFile),
    createTest('chmod - Propriétaire peut modifier ses répertoires', testOwnerCanChmodOwnDirectories),
    createTest('chmod - Permissions mixtes sur fichiers multiples', testChmodMixedPermissionsMultipleFiles),
    createTest('chmod - Mode symbolique avec permission refusée', testSymbolicModePermissionDenied),
    createTest('chmod - Fichier inexistant', testPermissionCheckNonexistentFile),
    createTest('chmod - Permissions de groupe', testGroupPermissionsChmod),
    createTest('chmod - Récursif avec permissions mixtes', testRecursiveChmodWithMixedPermissions),
    createTest('chmod - Protection escalade privilèges', testPrivilegeEscalationProtection)
];

export default chmodPermissionsTests;