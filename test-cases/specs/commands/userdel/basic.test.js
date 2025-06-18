// test-cases/specs/commands/userdel/basic.test.js - Tests basiques pour userdel
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdUseradd } from '../../../../bin/useradd.js';
import { cmdUserdel } from '../../../../bin/userdel.js';
import { parsePasswdFile } from '../../../../modules/users/user.service.js';

/**
 * Test basique - suppression d'un utilisateur
 */
function testUserdelBasic() {
    clearCaptures();
    const context = createTestContext();
    
    // Vérifier qu'on est bien root
    assert.equals(context.currentUser.username, 'root', 'Devrait commencer en tant que root');
    
    // Créer un utilisateur
    cmdUseradd(['testuser'], context);
    
    // Vérifier qu'il existe
    let users = parsePasswdFile(context.fileSystem);
    let user = users.find(u => u.username === 'testuser');
    assert.isTrue(user !== undefined, 'L\'utilisateur devrait être créé');
    
    clearCaptures();
    
    // Supprimer l'utilisateur
    cmdUserdel(['testuser'], context);
    
    // Vérifier qu'il n'existe plus
    users = parsePasswdFile(context.fileSystem);
    user = users.find(u => u.username === 'testuser');
    assert.isTrue(user === undefined, 'L\'utilisateur devrait être supprimé');
    
    console.log('✅ Suppression basique réussie');
    return true;
}

/**
 * Test d'erreur - sans arguments
 */
function testUserdelNoArgs() {
    clearCaptures();
    const context = createTestContext();
    
    // Vérifier qu'on est bien root
    assert.equals(context.currentUser.username, 'root', 'Devrait commencer en tant que root');
    
    // Appeler userdel sans arguments
    cmdUserdel([], context);
    
    // Vérifier qu'une erreur a été générée
    const captures = getCaptures();
    const hasError = captures.some(capture => 
        capture.className === 'error' && 
        capture.text.includes('manquant')
    );
    
    assert.isTrue(hasError, 'Une erreur devrait être affichée sans arguments');
    
    console.log('✅ Erreur sans arguments correcte');
    return true;
}

/**
 * Test protection root
 */
function testUserdelProtectRoot() {
    clearCaptures();
    const context = createTestContext();
    
    // Vérifier qu'on est bien root
    assert.equals(context.currentUser.username, 'root', 'Devrait commencer en tant que root');
    
    // Essayer de supprimer root
    cmdUserdel(['root'], context);
    
    // Vérifier qu'une erreur a été générée
    const captures = getCaptures();
    const hasError = captures.some(capture => 
        capture.className === 'error' && 
        capture.text.includes('impossible')
    );
    
    assert.isTrue(hasError, 'Root devrait être protégé');
    
    console.log('✅ Protection de root correcte');
    return true;
}

// Export des tests
export const userdelBasicTests = [
    createTest('userdel sans arguments', testUserdelNoArgs),
    createTest('userdel protection root', testUserdelProtectRoot),
    createTest('userdel suppression basique', testUserdelBasic)
];