// test-cases/specs/commands/groups/basic.test.js
// Tests basiques pour la commande groups

import { cmdGroups } from '../../../../bin/groups.js';
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert } from '../../../lib/helpers.js';

/**
 * Test basique de la commande groups sans arguments
 */
export function testGroupsBasic() {
    clearCaptures();
    const context = createTestContext();
    
    // Simuler un utilisateur connecté (root par défaut)
    context.currentUser = {
        username: 'root',
        uid: 0,
        gid: 0
    };
    
    // Créer des fichiers /etc/passwd et /etc/group pour les tests
    context.fileSystem['/etc/passwd'] = {
        type: 'file',
        content: 'root:x:0:0:root:/root:/bin/bash\ntestuser:x:1001:1001:Test User:/home/testuser:/bin/bash\n'
    };
    
    context.fileSystem['/etc/group'] = {
        type: 'file',
        content: 'root:x:0:\nsudo:x:27:root,testuser\ntestuser:x:1001:\n'
    };
    
    // Exécuter la commande groups
    cmdGroups([], context);
    
    // Récupérer la sortie
    const captures = getCaptures();
    
    // Vérifier que la sortie contient les groupes
    assert.isTrue(captures.length > 0, 'La commande groups devrait produire une sortie');
    
    const line = captures[0].text;
    assert.isTrue(line.includes('root'), 'Devrait afficher le groupe root');
    
    console.log('✅ Test basique de la commande groups');
    return true;
}

/**
 * Test de la commande groups avec un nom d'utilisateur spécifique
 */
export function testGroupsWithUsername() {
    clearCaptures();
    const context = createTestContext();
    
    // Simuler un utilisateur connecté
    context.currentUser = {
        username: 'root',
        uid: 0,
        gid: 0
    };
    
    // Créer des fichiers /etc/passwd et /etc/group pour les tests
    context.fileSystem['/etc/passwd'] = {
        type: 'file',
        content: 'root:x:0:0:root:/root:/bin/bash\ntestuser:x:1001:1001:Test User:/home/testuser:/bin/bash\n'
    };
    
    context.fileSystem['/etc/group'] = {
        type: 'file',
        content: 'root:x:0:\nsudo:x:27:root,testuser\ntestuser:x:1001:\nusers:x:100:testuser\n'
    };
    
    // Exécuter la commande groups avec un utilisateur spécifique
    cmdGroups(['testuser'], context);
    
    // Récupérer la sortie
    const captures = getCaptures();
    
    // Vérifier que la sortie contient les groupes de testuser
    assert.isTrue(captures.length > 0, 'La commande groups devrait produire une sortie');
    
    const line = captures[0].text;
    assert.isTrue(line.includes('testuser'), 'Devrait afficher le groupe principal testuser');
    assert.isTrue(line.includes('sudo'), 'Devrait afficher le groupe sudo');
    assert.isTrue(line.includes('users'), 'Devrait afficher le groupe users');
    
    console.log('✅ Test de la commande groups avec nom d\'utilisateur');
    return true;
}

/**
 * Test d'erreur quand aucun utilisateur n'est connecté
 */
export function testGroupsNoUser() {
    clearCaptures();
    const context = createTestContext();
    
    // Aucun utilisateur connecté
    context.currentUser = null;
    
    // Exécuter la commande groups
    cmdGroups([], context);
    
    // Récupérer la sortie d'erreur (filtrer par classe 'error')
    const captures = getCaptures();
    const errors = captures.filter(c => c.className === 'error');
    
    // Vérifier qu'une erreur est affichée
    assert.isTrue(errors.length > 0, 'Devrait afficher une erreur');
    assert.isTrue(errors[0].text.includes('aucun utilisateur connecté'), 'Devrait indiquer qu\'aucun utilisateur n\'est connecté');
    
    console.log('✅ Test d\'erreur groups sans utilisateur connecté');
    return true;
}

/**
 * Test d'erreur avec utilisateur inexistant
 */
export function testGroupsUserNotFound() {
    clearCaptures();
    const context = createTestContext();
    
    // Simuler un utilisateur connecté
    context.currentUser = {
        username: 'root',
        uid: 0,
        gid: 0
    };
    
    // Créer un fichier /etc/passwd minimal
    context.fileSystem['/etc/passwd'] = {
        type: 'file',
        content: 'root:x:0:0:root:/root:/bin/bash\n'
    };
    
    context.fileSystem['/etc/group'] = {
        type: 'file',
        content: 'root:x:0:\n'
    };
    
    // Exécuter la commande groups avec un utilisateur inexistant
    cmdGroups(['inexistant'], context);
    
    // Récupérer la sortie
    const captures = getCaptures();
    
    // Vérifier qu'une erreur est affichée
    assert.isTrue(captures.length > 0, 'Devrait afficher une erreur');
    assert.isTrue(captures[0].text.includes('pas d\'utilisateur de ce nom'), 'Devrait indiquer que l\'utilisateur n\'existe pas');
    
    console.log('✅ Test d\'erreur groups avec utilisateur inexistant');
    return true;
}

/**
 * Test d'erreur avec trop d'arguments
 */
export function testGroupsTooManyArgs() {
    clearCaptures();
    const context = createTestContext();
    
    context.currentUser = {
        username: 'root',
        uid: 0,
        gid: 0
    };
    
    // Exécuter la commande groups avec trop d'arguments
    cmdGroups(['user1', 'user2'], context);
    
    // Récupérer la sortie d'erreur (filtrer par classe 'error')
    const captures = getCaptures();
    const errors = captures.filter(c => c.className === 'error');
    
    // Vérifier qu'une erreur est affichée
    assert.isTrue(errors.length > 0, 'Devrait afficher une erreur');
    assert.isTrue(errors[0].text.includes('trop d\'arguments'), 'Devrait indiquer trop d\'arguments');
    assert.isTrue(errors.length >= 2, 'Devrait afficher l\'usage en plus de l\'erreur');
    
    console.log('✅ Test d\'erreur groups avec trop d\'arguments');
    return true;
}

/**
 * Test avec fichier /etc/group manquant
 */
export function testGroupsMissingGroupFile() {
    clearCaptures();
    const context = createTestContext();
    
    context.currentUser = {
        username: 'root',
        uid: 0,
        gid: 0
    };
    
    // Pas de fichier /etc/group
    context.fileSystem['/etc/passwd'] = {
        type: 'file',
        content: 'root:x:0:0:root:/root:/bin/bash\n'
    };
    
    // Exécuter la commande groups
    cmdGroups([], context);
    
    // Récupérer la sortie
    const captures = getCaptures();
    
    // Vérifier qu'une sortie appropriée est gérée
    assert.isTrue(captures.length > 0, 'Devrait produire une sortie même sans fichier group');
    
    console.log('✅ Test groups avec fichier /etc/group manquant');
    return true;
}