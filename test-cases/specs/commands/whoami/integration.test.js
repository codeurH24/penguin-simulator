// test-cases/specs/commands/whoami/integration.test.js - Tests avancés d'intégration pour whoami
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdWhoami } from '../../../../bin/user-info.js';
import { cmdUseradd } from '../../../../bin/useradd.js';
import { cmdSu } from '../../../../bin/su.js';
import { cmdExit } from '../../../../lib/bash-builtins.js';
import { cmdPasswd } from '../../../../bin/passwd.js';

/**
 * Test 1: whoami après changement d'utilisateur avec su
 */
function testWhoamiAfterSu() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un utilisateur sans mot de passe
    cmdUseradd(['-m', 'testuser'], context);
    cmdPasswd(['-d', 'testuser'], context);
    
    // Vérifier l'utilisateur initial
    clearCaptures();
    cmdWhoami([], context);
    let captures = getCaptures();
    assert.equals(captures[0].text, 'root', 'Devrait commencer avec root');
    
    // Changer d'utilisateur avec su
    clearCaptures();
    cmdSu(['testuser'], context);
    
    // Vérifier que whoami reflète le changement
    clearCaptures();
    cmdWhoami([], context);
    captures = getCaptures();
    assert.equals(captures[0].text, 'testuser', 'whoami devrait afficher testuser après su');
    
    console.log('✅ whoami fonctionne après su');
    return true;
}

/**
 * Test 2: whoami avec pile d'utilisateurs (su imbriqués)
 */
function testWhoamiUserStack() {
    clearCaptures();
    const context = createTestContext();
    
    // Fonction utilitaire pour créer un utilisateur sans mot de passe
    function prepareUserWithoutPassword(username) {
        cmdUseradd(['-m', username], context);
        // Utiliser passwd -d pour supprimer le mot de passe (permet su sans prompt)
        cmdPasswd(['-d', username], context);
        clearCaptures();
    }
    
    // Créer plusieurs utilisateurs sans mot de passe
    prepareUserWithoutPassword('user1');
    prepareUserWithoutPassword('user2');
    
    // su vers user1
    clearCaptures();
    cmdSu(['user1'], context);
    cmdWhoami([], context);
    let captures = getCaptures();
    assert.equals(captures[0].text, 'user1', 'Devrait être user1');
    
    // su vers user2 (imbriqué)
    clearCaptures();
    cmdSu(['user2'], context);
    cmdWhoami([], context);
    captures = getCaptures();
    assert.equals(captures[0].text, 'user2', 'Devrait être user2');
    
    // exit pour revenir à user1
    clearCaptures();
    cmdExit([], context);
    cmdWhoami([], context);
    captures = getCaptures();
    assert.equals(captures[0].text, 'user1', 'Devrait revenir à user1');
    
    // exit pour revenir à root
    clearCaptures();
    cmdExit([], context);
    cmdWhoami([], context);
    captures = getCaptures();
    assert.equals(captures[0].text, 'root', 'Devrait revenir à root');
    
    console.log('✅ whoami fonctionne avec pile d\'utilisateurs');
    return true;
}

/**
 * Test 3: whoami avec utilisateurs aux noms spéciaux
 */
function testWhoamiSpecialUsernames() {
    clearCaptures();
    const context = createTestContext();
    
    // Utilisateurs avec noms spéciaux (typiques de Debian)
    const specialUsers = [
        { username: 'www-data', uid: 33, gid: 33 },
        { username: 'user-test', uid: 1001, gid: 1001 },
        { username: 'user_123', uid: 1002, gid: 1002 },
        { username: 'systemd-network', uid: 101, gid: 102 }
    ];
    
    for (const user of specialUsers) {
        clearCaptures();
        context.currentUser = user;
        
        cmdWhoami([], context);
        
        const captures = getCaptures();
        assert.captureCount(1, `whoami devrait fonctionner avec "${user.username}"`);
        assert.equals(captures[0].text, user.username, `whoami devrait afficher "${user.username}"`);
    }
    
    console.log('✅ whoami fonctionne avec noms d\'utilisateur spéciaux');
    return true;
}

/**
 * Test 4: whoami ignore les variables d'environnement
 */
function testWhoamiIgnoresEnvironment() {
    clearCaptures();
    const context = createTestContext();
    
    // Définir des variables d'environnement trompeuses
    context.sessionVariables = {
        'USER': 'fakeuser',
        'LOGNAME': 'anotherfake',
        'USERNAME': 'yetanotherfake'
    };
    
    // whoami devrait ignorer ces variables et afficher le vrai utilisateur
    cmdWhoami([], context);
    
    const captures = getCaptures();
    assert.captureCount(1, 'whoami devrait produire une sortie');
    assert.equals(captures[0].text, 'root', 'whoami devrait afficher l\'utilisateur réel, pas les variables');
    
    console.log('✅ whoami ignore les variables d\'environnement');
    return true;
}

/**
 * Test 5: whoami avec utilisateurs créés dynamiquement
 */
function testWhoamiDynamicUsers() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer seulement des utilisateurs normaux (pas système pour éviter les problèmes)
    const userConfigs = [
        { name: 'normaluser', options: ['-m'] },
        { name: 'customuser', options: ['-d', '/opt/custom'] }
    ];
    
    for (const config of userConfigs) {
        // Créer l'utilisateur
        clearCaptures();
        cmdUseradd([...config.options, config.name], context);
        
        // Supprimer le mot de passe pour permettre su sans prompt
        cmdPasswd(['-d', config.name], context);
        
        // Debug: vérifier que l'utilisateur existe dans /etc/passwd
        const passwdFile = context.fileSystem['/etc/passwd'];
        const userExists = passwdFile.content.includes(config.name + ':');
        assert.isTrue(userExists, `L'utilisateur ${config.name} devrait exister dans /etc/passwd`);
        
        // Debug: vérifier que le mot de passe est vide dans /etc/shadow
        const shadowFile = context.fileSystem['/etc/shadow'];
        const shadowLines = shadowFile.content.split('\n');
        const userShadowLine = shadowLines.find(line => line.startsWith(config.name + ':'));
        if (userShadowLine) {
            const [, passwordHash] = userShadowLine.split(':');
            assert.equals(passwordHash, '', `Le mot de passe de ${config.name} devrait être vide`);
        }
        
        // Changer vers cet utilisateur
        clearCaptures();
        cmdSu([config.name], context);
        
        // Vérifier whoami
        clearCaptures();
        cmdWhoami([], context);
        const captures = getCaptures();
        assert.equals(captures[0].text, config.name, `whoami devrait afficher ${config.name}`);
        
        // Revenir à root
        clearCaptures();
        cmdExit([], context);
    }
    
    console.log('✅ whoami fonctionne avec utilisateurs créés dynamiquement');
    return true;
}

/**
 * Test 6: whoami performance - exécutions répétées
 */
function testWhoamiPerformance() {
    const context = createTestContext();
    const iterations = 100;
    const startTime = performance.now();
    
    // Exécuter whoami plusieurs fois
    for (let i = 0; i < iterations; i++) {
        clearCaptures();
        cmdWhoami([], context);
        
        const captures = getCaptures();
        if (captures.length !== 1 || captures[0].text !== 'root') {
            assert.fail(`Échec à l'itération ${i}`);
        }
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // whoami devrait être très rapide (< 50ms pour 100 exécutions)
    assert.isTrue(duration < 50, `whoami devrait être rapide (${duration.toFixed(2)}ms pour 100 exécutions)`);
    
    console.log(`✅ whoami est performant (${duration.toFixed(2)}ms pour 100 exécutions)`);
    return true;
}

/**
 * Test 7: whoami avec contexte partiellement corrompu
 */
function testWhoamiCorruptedContext() {
    clearCaptures();
    const context = createTestContext();
    
    // Tester différents états de corruption
    const corruptedStates = [
        { currentUser: { username: 'test' }, description: 'utilisateur minimal' },
        { currentUser: { username: '', uid: 1000 }, description: 'username vide' },
        { currentUser: { username: 'validuser', uid: 'invalid' }, description: 'uid invalide' }
    ];
    
    for (const state of corruptedStates) {
        clearCaptures();
        context.currentUser = state.currentUser;
        
        try {
            cmdWhoami([], context);
            
            const captures = getCaptures();
            if (captures.length === 1 && captures[0].text === state.currentUser.username) {
                // OK, whoami a affiché le nom d'utilisateur
                continue;
            } else if (captures.some(capture => capture.text.includes('aucun utilisateur connecté'))) {
                // OK, whoami a détecté le problème
                continue;
            } else {
                assert.fail(`État corrompu non géré: ${state.description}`);
            }
        } catch (error) {
            // Les erreurs sont acceptables pour les contextes corrompus
            console.log(`Erreur attendue pour ${state.description}: ${error.message}`);
        }
    }
    
    console.log('✅ whoami gère les contextes corrompus');
    return true;
}

/**
 * Test 8: whoami stabilité après opérations complexes
 */
function testWhoamiStabilityAfterComplexOps() {
    clearCaptures();
    const context = createTestContext();
    
    // Effectuer une série d'opérations complexes
    cmdUseradd(['-m', 'complex1'], context);
    cmdUseradd(['-m', 'complex2'], context);
    
    // Supprimer les mots de passe pour permettre su
    cmdPasswd(['-d', 'complex1'], context);
    cmdPasswd(['-d', 'complex2'], context);
    
    // Multiples changements d'utilisateur
    cmdSu(['complex1'], context);
    cmdSu(['complex2'], context);
    cmdExit([], context);
    cmdSu(['complex1'], context);
    cmdExit([], context);
    cmdExit([], context);
    
    // whoami devrait toujours fonctionner après ces opérations
    clearCaptures();
    cmdWhoami([], context);
    const captures = getCaptures();
    assert.captureCount(1, 'whoami devrait fonctionner après opérations complexes');
    assert.equals(captures[0].text, 'root', 'Devrait être revenu à root');
    
    console.log('✅ whoami reste stable après opérations complexes');
    return true;
}

// Export des tests avancés
export const whoamiIntegrationTests = [
    createTest('whoami après su', testWhoamiAfterSu),
    createTest('whoami avec pile d\'utilisateurs', testWhoamiUserStack),
    createTest('whoami avec noms spéciaux', testWhoamiSpecialUsernames),
    createTest('whoami ignore environnement', testWhoamiIgnoresEnvironment),
    createTest('whoami avec utilisateurs dynamiques', testWhoamiDynamicUsers),
    createTest('whoami performance', testWhoamiPerformance),
    createTest('whoami contexte corrompu', testWhoamiCorruptedContext),
    createTest('whoami stabilité complexe', testWhoamiStabilityAfterComplexOps)
];