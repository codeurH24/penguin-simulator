// test-cases/specs/commands/passwd/non-interactive.test.js - Tests passwd sans interaction
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdPasswd } from '../../../../bin/passwd.js';
import { cmdUseradd } from '../../../../bin/useradd.js';
import { changePassword } from '../../../../modules/users/user.service.js';

/**
 * Utilitaire pour obtenir l'état d'un utilisateur dans /etc/shadow
 */
function getShadowUserInfo(context, username) {
    const shadowFile = context.fileSystem['/etc/shadow'];
    if (!shadowFile || shadowFile.type !== 'file') {
        return null;
    }

    const lines = shadowFile.content.split('\n');
    const userLine = lines.find(line => line.startsWith(username + ':'));
    if (!userLine) {
        return null;
    }

    const [, passwordHash, lastChanged] = userLine.split(':');
    return { passwordHash, lastChanged };
}

/**
 * Test passwd -S avec utilisateur ayant un mot de passe
 */
function testStatusWithPassword() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un utilisateur avec mot de passe
    cmdUseradd(['testuser'], context);
    changePassword('testuser', 'mypassword', context.fileSystem, context.saveFileSystem);
    clearCaptures();
    
    // Tester passwd -S
    cmdPasswd(['-S', 'testuser'], context);
    
    const captures = getCaptures();
    assert.captureCount(1, 'passwd -S devrait produire 1 ligne de statut');
    
    const statusLine = captures[0].text;
    assert.isTrue(statusLine.includes('testuser'), 'Devrait contenir le nom d\'utilisateur');
    assert.isTrue(statusLine.includes('P'), 'Devrait indiquer P (password set)');
    
    console.log('✅ passwd -S avec mot de passe fonctionne');
    return true;
}

/**
 * Test passwd -S avec utilisateur sans mot de passe
 */
function testStatusWithoutPassword() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un utilisateur sans mot de passe
    cmdUseradd(['nopassuser'], context);
    clearCaptures();
    
    // Tester passwd -S
    cmdPasswd(['-S', 'nopassuser'], context);
    
    const captures = getCaptures();
    const statusLine = captures[0].text;
    assert.isTrue(statusLine.includes('nopassuser'), 'Devrait contenir le nom d\'utilisateur');
    assert.isTrue(statusLine.includes('L') || statusLine.includes('NP'), 'Devrait indiquer L ou NP (locked/no password)');
    
    console.log('✅ passwd -S sans mot de passe fonctionne');
    return true;
}

/**
 * Test passwd -l (verrouillage)
 */
function testLockUser() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un utilisateur avec mot de passe
    cmdUseradd(['lockuser'], context);
    changePassword('lockuser', 'password123', context.fileSystem, context.saveFileSystem);
    clearCaptures();
    
    // Verrouiller le compte
    cmdPasswd(['-l', 'lockuser'], context);
    
    // Vérifier le message de succès
    const captures = getCaptures();
    assert.captureCount(1, 'passwd -l devrait produire 1 message');
    assert.isTrue(captures[0].text.includes('verrouillé'), 'Devrait mentionner le verrouillage');
    
    // Vérifier l'état dans /etc/shadow
    const shadowInfo = getShadowUserInfo(context, 'lockuser');
    assert.isTrue(shadowInfo.passwordHash.startsWith('!'), 'Le mot de passe devrait être préfixé par !');
    
    console.log('✅ passwd -l verrouille correctement');
    return true;
}

/**
 * Test passwd -u (déverrouillage)
 */
function testUnlockUser() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer, définir mot de passe et verrouiller
    cmdUseradd(['unlockuser'], context);
    changePassword('unlockuser', 'password123', context.fileSystem, context.saveFileSystem);
    cmdPasswd(['-l', 'unlockuser'], context);
    clearCaptures();
    
    // Déverrouiller le compte
    cmdPasswd(['-u', 'unlockuser'], context);
    
    // Vérifier le message de succès
    const captures = getCaptures();
    assert.captureCount(1, 'passwd -u devrait produire 1 message');
    assert.isTrue(captures[0].text.includes('déverrouillé'), 'Devrait mentionner le déverrouillage');
    
    // Vérifier l'état dans /etc/shadow
    const shadowInfo = getShadowUserInfo(context, 'unlockuser');
    assert.isFalse(shadowInfo.passwordHash.startsWith('!'), 'Le mot de passe ne devrait plus être préfixé par !');
    
    console.log('✅ passwd -u déverrouille correctement');
    return true;
}

/**
 * Test passwd -d (suppression de mot de passe)
 */
function testDeletePassword() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un utilisateur avec mot de passe
    cmdUseradd(['deleteuser'], context);
    changePassword('deleteuser', 'password123', context.fileSystem, context.saveFileSystem);
    clearCaptures();
    
    // Supprimer le mot de passe
    cmdPasswd(['-d', 'deleteuser'], context);
    
    // Vérifier les messages
    const captures = getCaptures();
    assert.isTrue(captures.length >= 1, 'passwd -d devrait produire au moins 1 message');
    
    const hasDeleteMessage = captures.some(c => c.text.includes('supprimé'));
    const hasWarningMessage = captures.some(c => c.text.includes('Attention'));
    
    assert.isTrue(hasDeleteMessage, 'Devrait confirmer la suppression');
    assert.isTrue(hasWarningMessage, 'Devrait afficher un avertissement');
    
    // Vérifier l'état dans /etc/shadow
    const shadowInfo = getShadowUserInfo(context, 'deleteuser');
    assert.equals(shadowInfo.passwordHash, '', 'Le mot de passe devrait être vide');
    
    console.log('✅ passwd -d supprime le mot de passe');
    return true;
}

/**
 * Test passwd avec utilisateur inexistant
 */
function testNonExistentUser() {
    clearCaptures();
    const context = createTestContext();
    
    // Tester avec utilisateur inexistant
    cmdPasswd(['-S', 'inexistant'], context);
    
    const captures = getCaptures();
    const hasError = captures.some(c => c.className === 'error' && c.text.includes('n\'existe pas'));
    assert.isTrue(hasError, 'Devrait produire une erreur pour utilisateur inexistant');
    
    console.log('✅ passwd gère les utilisateurs inexistants');
    return true;
}

/**
 * Test passwd -S pour utilisateur verrouillé
 */
function testStatusLockedUser() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer, définir mot de passe et verrouiller
    cmdUseradd(['lockeduser'], context);
    changePassword('lockeduser', 'password123', context.fileSystem, context.saveFileSystem);
    cmdPasswd(['-l', 'lockeduser'], context);
    clearCaptures();
    
    // Vérifier le statut
    cmdPasswd(['-S', 'lockeduser'], context);
    
    const captures = getCaptures();
    const statusLine = captures[0].text;
    assert.isTrue(statusLine.includes('lockeduser'), 'Devrait contenir le nom d\'utilisateur');
    assert.isTrue(statusLine.includes('L'), 'Devrait indiquer L (locked)');
    
    console.log('✅ passwd -S détecte les comptes verrouillés');
    return true;
}

/**
 * Test passwd avec option invalide
 */
function testInvalidOption() {
    clearCaptures();
    const context = createTestContext();
    
    // Tester avec option invalide
    cmdPasswd(['-z', 'testuser'], context);
    
    const captures = getCaptures();
    const hasError = captures.some(c => c.className === 'error' && c.text.includes('option inconnue'));
    assert.isTrue(hasError, 'Devrait produire une erreur pour option invalide');
    
    console.log('✅ passwd rejette les options invalides');
    return true;
}

/**
 * Test passwd -l sur compte déjà verrouillé
 */
function testLockAlreadyLocked() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer et verrouiller
    cmdUseradd(['alreadylocked'], context);
    changePassword('alreadylocked', 'password123', context.fileSystem, context.saveFileSystem);
    cmdPasswd(['-l', 'alreadylocked'], context);
    clearCaptures();
    
    // Verrouiller à nouveau
    cmdPasswd(['-l', 'alreadylocked'], context);
    
    // Devrait réussir sans erreur
    const captures = getCaptures();
    const hasError = captures.some(c => c.className === 'error');
    assert.isFalse(hasError, 'Verrouiller un compte déjà verrouillé ne devrait pas produire d\'erreur');
    
    console.log('✅ passwd -l sur compte déjà verrouillé');
    return true;
}

/**
 * Test passwd -u sur compte non verrouillé
 */
function testUnlockNotLocked() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un utilisateur avec mot de passe (non verrouillé)
    cmdUseradd(['notlocked'], context);
    changePassword('notlocked', 'password123', context.fileSystem, context.saveFileSystem);
    clearCaptures();
    
    // Essayer de déverrouiller
    cmdPasswd(['-u', 'notlocked'], context);
    
    // Devrait réussir (même si déjà déverrouillé)
    const captures = getCaptures();
    assert.isTrue(captures[0].text.includes('déverrouillé'), 'Devrait confirmer le déverrouillage');
    
    console.log('✅ passwd -u sur compte non verrouillé');
    return true;
}

/**
 * Test passwd -d sur compte sans mot de passe
 */
function testDeleteNoPassword() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un utilisateur sans définir de mot de passe
    cmdUseradd(['nopass'], context);
    clearCaptures();
    
    // Essayer de supprimer le mot de passe
    cmdPasswd(['-d', 'nopass'], context);
    
    // Devrait réussir (même s'il n'y a pas de mot de passe)
    const captures = getCaptures();
    const hasDeleteMessage = captures.some(c => c.text.includes('supprimé'));
    assert.isTrue(hasDeleteMessage, 'Devrait confirmer la suppression même sans mot de passe initial');
    
    console.log('✅ passwd -d sur compte sans mot de passe');
    return true;
}

/**
 * Test séquence complète : lock → unlock → delete
 */
function testCompleteSequence() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un utilisateur avec mot de passe
    cmdUseradd(['sequence'], context);
    changePassword('sequence', 'password123', context.fileSystem, context.saveFileSystem);
    
    // Séquence: verrouiller
    clearCaptures();
    cmdPasswd(['-l', 'sequence'], context);
    let shadowInfo = getShadowUserInfo(context, 'sequence');
    assert.isTrue(shadowInfo.passwordHash.startsWith('!'), 'Devrait être verrouillé');
    
    // Déverrouiller
    clearCaptures();
    cmdPasswd(['-u', 'sequence'], context);
    shadowInfo = getShadowUserInfo(context, 'sequence');
    assert.isFalse(shadowInfo.passwordHash.startsWith('!'), 'Devrait être déverrouillé');
    
    // Supprimer
    clearCaptures();
    cmdPasswd(['-d', 'sequence'], context);
    shadowInfo = getShadowUserInfo(context, 'sequence');
    assert.equals(shadowInfo.passwordHash, '', 'Mot de passe devrait être supprimé');
    
    console.log('✅ Séquence complète lock → unlock → delete');
    return true;
}

/**
 * Export des tests passwd non-interactifs
 */
export const passwdNonInteractiveTests = [
    createTest('passwd -S avec mot de passe', testStatusWithPassword),
    createTest('passwd -S sans mot de passe', testStatusWithoutPassword),
    createTest('passwd -S utilisateur verrouillé', testStatusLockedUser),
    createTest('passwd -l verrouille compte', testLockUser),
    createTest('passwd -u déverrouille compte', testUnlockUser),
    createTest('passwd -d supprime mot de passe', testDeletePassword),
    createTest('passwd utilisateur inexistant', testNonExistentUser),
    createTest('passwd option invalide', testInvalidOption),
    createTest('passwd -l sur déjà verrouillé', testLockAlreadyLocked),
    createTest('passwd -u sur non verrouillé', testUnlockNotLocked),
    createTest('passwd -d sans mot de passe', testDeleteNoPassword),
    createTest('Séquence complète lock→unlock→delete', testCompleteSequence)
];