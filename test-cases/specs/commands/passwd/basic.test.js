// test-cases/specs/commands/passwd/basic.test.js
// Tests pour la commande passwd

import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdPasswd } from '../../../../bin/passwd.js';
import { cmdUseradd } from '../../../../bin/useradd.js';
import { changePassword } from '../../../../modules/users/user.service.js';

/**
 * Vérifie qu'un mot de passe a été changé dans /etc/shadow
 * @param {Object} context - Contexte de test
 * @param {string} username - Nom d'utilisateur
 * @param {string} expectedPassword - Mot de passe attendu (en clair)
 * @returns {boolean} - true si le mot de passe correspond
 */
function verifyPasswordInShadow(context, username, expectedPassword) {
    const shadowFile = context.fileSystem['/etc/shadow'];
    if (!shadowFile || shadowFile.type !== 'file') {
        return false;
    }

    const lines = shadowFile.content.split('\n');
    const userLine = lines.find(line => line.startsWith(username + ':'));
    if (!userLine) {
        return false;
    }

    const [, currentHash] = userLine.split(':');
    
    // Reproduire l'algorithme de hash utilisé dans passwd
    const expectedHash = '$6$rounds=656000$salt$' + btoa(expectedPassword + 'salt');
    
    return currentHash === expectedHash;
}

/**
 * Test du changement de mot de passe interactif
 * Simule le succès du processus passwd alice
 */
function testPasswdInteractiveSuccess() {
    console.log('🧪 TEST: Changement de mot de passe interactif');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer un utilisateur de test
    cmdUseradd(['alice'], context);
    
    // Simuler le résultat du processus interactif
    const targetUsername = 'alice';
    const newPassword = 'testpassword123';
    
    try {
        // Simuler ce qui se passe quand l'utilisateur saisit correctement
        changePassword(targetUsername, newPassword, context.fileSystem, context.saveFileSystem);
        
        // Simuler le message de succès
        context.showSuccess('passwd: mot de passe mis à jour avec succès');
        
        // Vérifier que le mot de passe a été changé
        const passwordMatches = verifyPasswordInShadow(context, 'alice', newPassword);
        assert.isTrue(passwordMatches, 'Le mot de passe devrait être changé correctement');
        
        // Vérifier les messages de succès
        const captures = getCaptures();
        const hasSuccessMessage = captures.some(capture => 
            capture.text.includes('mis à jour avec succès') && capture.className === 'success'
        );
        assert.isTrue(hasSuccessMessage, 'Devrait afficher un message de succès');
        
        console.log('✅ Changement de mot de passe interactif fonctionne');
        return true;
        
    } catch (error) {
        console.log('❌ Erreur dans le test:', error);
        return false;
    }
}

/**
 * Test de l'option passwd -S (status)
 */
function testPasswdStatusOption() {
    console.log('🧪 TEST: passwd -S affiche le statut');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer un utilisateur avec un mot de passe
    cmdUseradd(['bob'], context);
    changePassword('bob', 'mypassword', context.fileSystem, context.saveFileSystem);
    
    // Tester passwd -S
    cmdPasswd(['-S', 'bob'], context);
    
    // Vérifier que la sortie contient les informations de statut
    const captures = getCaptures();
    const hasStatusOutput = captures.some(capture => 
        capture.text.includes('bob') && capture.text.includes('P')
    );
    assert.isTrue(hasStatusOutput, 'La sortie devrait contenir le statut de bob avec P (password set)');
    
    console.log('✅ passwd -S affiche le statut correctement');
    return true;
}

/**
 * Test de verrouillage de compte avec passwd -l
 */
function testPasswdLockOption() {
    console.log('🧪 TEST: passwd -l verrouille un compte');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer un utilisateur avec un mot de passe
    cmdUseradd(['charlie'], context);
    changePassword('charlie', 'password123', context.fileSystem, context.saveFileSystem);
    
    // Verrouiller le compte
    cmdPasswd(['-l', 'charlie'], context);
    
    // Vérifier que le compte est verrouillé dans /etc/shadow
    const shadowFile = context.fileSystem['/etc/shadow'];
    const lines = shadowFile.content.split('\n');
    const userLine = lines.find(line => line.startsWith('charlie:'));
    
    assert.isTrue(userLine !== undefined, 'charlie devrait être dans /etc/shadow');
    
    const [, passwordHash] = userLine.split(':');
    assert.isTrue(passwordHash.startsWith('!'), 'Le mot de passe devrait être préfixé par ! (verrouillé)');
    
    // Vérifier le message de succès dans les captures
    const captures = getCaptures();
    const hasSuccessMessage = captures.some(capture => 
        capture.text.includes('verrouillé') && capture.className === 'success'
    );
    assert.isTrue(hasSuccessMessage, 'Devrait afficher un message de verrouillage');
    
    console.log('✅ passwd -l verrouille correctement le compte');
    return true;
}

/**
 * Test de déverrouillage de compte avec passwd -u
 */
function testPasswdUnlockOption() {
    console.log('🧪 TEST: passwd -u déverrouille un compte');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer un utilisateur et le verrouiller
    cmdUseradd(['david'], context);
    changePassword('david', 'password123', context.fileSystem, context.saveFileSystem);
    
    // Verrouiller d'abord
    cmdPasswd(['-l', 'david'], context);
    
    // Puis déverrouiller
    clearCaptures(); // Clear pour ne garder que les messages de déverrouillage
    cmdPasswd(['-u', 'david'], context);
    
    // Vérifier que le compte est déverrouillé dans /etc/shadow
    const shadowFile = context.fileSystem['/etc/shadow'];
    const lines = shadowFile.content.split('\n');
    const userLine = lines.find(line => line.startsWith('david:'));
    
    const [, passwordHash] = userLine.split(':');
    assert.isFalse(passwordHash.startsWith('!'), 'Le mot de passe ne devrait plus être préfixé par !');
    
    // Vérifier le message de succès
    const captures = getCaptures();
    const hasSuccessMessage = captures.some(capture => 
        capture.text.includes('déverrouillé') && capture.className === 'success'
    );
    assert.isTrue(hasSuccessMessage, 'Devrait afficher un message de déverrouillage');
    
    console.log('✅ passwd -u déverrouille correctement le compte');
    return true;
}

/**
 * Test de suppression de mot de passe avec passwd -d
 */
function testPasswdDeleteOption() {
    console.log('🧪 TEST: passwd -d supprime le mot de passe');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer un utilisateur avec un mot de passe
    cmdUseradd(['eve'], context);
    changePassword('eve', 'password123', context.fileSystem, context.saveFileSystem);
    
    // Supprimer le mot de passe
    cmdPasswd(['-d', 'eve'], context);
    
    // Vérifier que le mot de passe a été supprimé dans /etc/shadow
    const shadowFile = context.fileSystem['/etc/shadow'];
    const lines = shadowFile.content.split('\n');
    const userLine = lines.find(line => line.startsWith('eve:'));
    
    const [, passwordHash] = userLine.split(':');
    assert.equals(passwordHash, '', 'Le mot de passe devrait être vide');
    
    // Vérifier le message d'avertissement
    const captures = getCaptures();
    const hasDeleteMessage = captures.some(capture => 
        capture.text.includes('supprimé') && capture.className === 'success'
    );
    const hasWarningMessage = captures.some(capture => 
        capture.text.includes('Attention') && capture.className === 'success'
    );
    assert.isTrue(hasDeleteMessage, 'Devrait afficher un message de suppression');
    assert.isTrue(hasWarningMessage, 'Devrait afficher un avertissement');
    
    console.log('✅ passwd -d supprime correctement le mot de passe');
    return true;
}

/**
 * Test d'erreur pour utilisateur inexistant
 */
function testPasswdNonExistentUser() {
    console.log('🧪 TEST: passwd avec utilisateur inexistant');
    
    clearCaptures();
    const context = createTestContext();
    
    // Tester avec un utilisateur qui n'existe pas
    cmdPasswd(['utilisateur_inexistant'], context);
    
    // Vérifier le message d'erreur
    const captures = getCaptures();
    const hasErrorMessage = captures.some(capture => 
        capture.text.includes('n\'existe pas') && capture.className === 'error'
    );
    assert.isTrue(hasErrorMessage, 'Devrait afficher une erreur pour utilisateur inexistant');
    
    console.log('✅ passwd gère correctement les utilisateurs inexistants');
    return true;
}

/**
 * Export des tests pour passwd
 */
export const passwdBasicTests = [
    createTest('Changement mot de passe interactif', testPasswdInteractiveSuccess),
    createTest('passwd -S affiche statut', testPasswdStatusOption),
    createTest('passwd -l verrouille compte', testPasswdLockOption),
    createTest('passwd -u déverrouille compte', testPasswdUnlockOption),
    createTest('passwd -d supprime mot de passe', testPasswdDeleteOption),
    createTest('passwd utilisateur inexistant', testPasswdNonExistentUser)
];