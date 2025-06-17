// test-cases/specs/commands/whoami/debian-compliant.test.js - Tests de conformité Debian pour whoami
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdWhoami } from '../../../../bin/whoami.js';

/**
 * Test 1: whoami affiche uniquement le nom d'utilisateur
 */
function testWhoamiBasicOutput() {
    clearCaptures();
    const context = createTestContext();
    
    // Exécuter whoami
    cmdWhoami([], context);
    
    // Vérifier la sortie
    const captures = getCaptures();
    assert.captureCount(1, 'whoami devrait produire exactement une ligne');
    assert.equals(captures[0].text, 'root', 'whoami devrait afficher "root"');
    
    console.log('✅ whoami affiche correctement l\'utilisateur courant');
    return true;
}

/**
 * Test 2: whoami rejette tous les arguments (comportement Debian)
 */
function testWhoamiRejectsArguments() {
    clearCaptures();
    const context = createTestContext();
    
    // Tester avec un argument
    cmdWhoami(['argument'], context);
    
    const captures = getCaptures();
    const hasError = captures.some(capture => 
        capture.text.includes('trop d\'arguments')
    );
    assert.isTrue(hasError, 'whoami devrait rejeter les arguments');
    
    const hasUsage = captures.some(capture => 
        capture.text.includes('Usage: whoami')
    );
    assert.isTrue(hasUsage, 'whoami devrait afficher l\'usage');
    
    console.log('✅ whoami rejette les arguments comme Debian');
    return true;
}

/**
 * Test 3: whoami rejette --help et --version (comportement Debian)
 */
function testWhoamiRejectsOptions() {
    clearCaptures();
    const context = createTestContext();
    
    // Tester --help
    cmdWhoami(['--help'], context);
    
    let captures = getCaptures();
    let hasError = captures.some(capture => 
        capture.text.includes('trop d\'arguments')
    );
    assert.isTrue(hasError, 'whoami --help devrait produire une erreur');
    
    // Tester --version
    clearCaptures();
    cmdWhoami(['--version'], context);
    
    captures = getCaptures();
    hasError = captures.some(capture => 
        capture.text.includes('trop d\'arguments')
    );
    assert.isTrue(hasError, 'whoami --version devrait produire une erreur');
    
    console.log('✅ whoami rejette --help et --version comme Debian');
    return true;
}

/**
 * Test 4: whoami fonctionne avec différents utilisateurs
 */
function testWhoamiDifferentUsers() {
    clearCaptures();
    const context = createTestContext();
    
    // Utilisateurs typiques de Debian
    const users = [
        { username: 'root', uid: 0, gid: 0 },
        { username: 'daemon', uid: 1, gid: 1 },
        { username: 'nobody', uid: 65534, gid: 65534 },
        { username: 'www-data', uid: 33, gid: 33 }
    ];
    
    for (const user of users) {
        clearCaptures();
        context.currentUser = user;
        
        cmdWhoami([], context);
        
        const captures = getCaptures();
        assert.captureCount(1, `whoami devrait fonctionner avec ${user.username}`);
        assert.equals(captures[0].text, user.username, `whoami devrait afficher "${user.username}"`);
    }
    
    console.log('✅ whoami fonctionne avec les utilisateurs système Debian');
    return true;
}

/**
 * Test 5: whoami gère l'absence d'utilisateur connecté
 */
function testWhoamiNoUser() {
    clearCaptures();
    const context = createTestContext();
    
    // Simuler l'absence d'utilisateur
    context.currentUser = null;
    
    cmdWhoami([], context);
    
    const captures = getCaptures();
    const hasError = captures.some(capture => 
        capture.text.includes('aucun utilisateur connecté')
    );
    assert.isTrue(hasError, 'whoami devrait gérer l\'absence d\'utilisateur');
    
    console.log('✅ whoami gère l\'absence d\'utilisateur');
    return true;
}

// Export des tests essentiels
export const whoamiDebianTests = [
    createTest('Affichage utilisateur de base', testWhoamiBasicOutput),
    createTest('Rejet des arguments', testWhoamiRejectsArguments),
    createTest('Rejet des options --help/--version', testWhoamiRejectsOptions),
    createTest('Utilisateurs système Debian', testWhoamiDifferentUsers),
    createTest('Gestion absence utilisateur', testWhoamiNoUser)
];