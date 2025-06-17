// test-cases/specs/commands/id/basic.test.js
// Tests basiques pour la commande id

import { cmdId } from '../../../../bin/id.js';
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert } from '../../../lib/helpers.js';

/**
 * Test basique de la commande id sans arguments
 */
export function testIdBasic() {
    clearCaptures();
    const context = createTestContext();
    
    // Simuler un utilisateur connecté (root par défaut)
    context.currentUser = {
        username: 'root',
        uid: 0,
        gid: 0
    };
    
    // Exécuter la commande id
    cmdId([], context);
    
    // Récupérer la sortie
    const captures = getCaptures();
    
    // Vérifier que la sortie contient les informations attendues
    assert.isTrue(captures.length > 0, 'La commande id devrait produire une sortie');
    
    const line = captures[0].text;
    assert.isTrue(line.includes('uid=0(root)'), 'Devrait afficher uid=0(root)');
    assert.isTrue(line.includes('gid=0(root)'), 'Devrait afficher gid=0(root)');
    assert.isTrue(line.includes('groups='), 'Devrait afficher les groupes');
    
    console.log('✅ Test basique de la commande id');
    return true;
}

/**
 * Test de la commande id avec option -u (user only)
 */
export function testIdUserOnly() {
    clearCaptures();
    const context = createTestContext();
    
    // Simuler un utilisateur connecté
    context.currentUser = {
        username: 'testuser',
        uid: 1001,
        gid: 1001
    };
    
    // Exécuter la commande id -u
    cmdId(['-u'], context);
    
    // Récupérer la sortie
    const captures = getCaptures();
    
    // Vérifier que seul l'UID est affiché
    assert.isTrue(captures.length > 0, 'La commande id -u devrait produire une sortie');
    assert.equals(captures[0].text, '1001', 'Devrait afficher seulement l\'UID');
    
    console.log('✅ Test de la commande id avec option -u');
    return true;
}

/**
 * Test de la commande id avec option -g (group only)
 */
export function testIdGroupOnly() {
    clearCaptures();
    const context = createTestContext();
    
    // Simuler un utilisateur connecté
    context.currentUser = {
        username: 'testuser',
        uid: 1001,
        gid: 1001
    };
    
    // Exécuter la commande id -g
    cmdId(['-g'], context);
    
    // Récupérer la sortie
    const captures = getCaptures();
    
    // Vérifier que seul le GID est affiché
    assert.isTrue(captures.length > 0, 'La commande id -g devrait produire une sortie');
    assert.equals(captures[0].text, '1001', 'Devrait afficher seulement le GID');
    
    console.log('✅ Test de la commande id avec option -g');
    return true;
}

/**
 * Test de la commande id avec option -n (names only)
 */
export function testIdNamesOnly() {
    clearCaptures();
    const context = createTestContext();
    
    // Simuler un utilisateur connecté
    context.currentUser = {
        username: 'testuser',
        uid: 1001,
        gid: 1001
    };
    
    // Exécuter la commande id -u -n
    cmdId(['-u', '-n'], context);
    
    // Récupérer la sortie
    const captures = getCaptures();
    
    // Vérifier que le nom d'utilisateur est affiché
    assert.isTrue(captures.length > 0, 'La commande id -u -n devrait produire une sortie');
    assert.equals(captures[0].text, 'testuser', 'Devrait afficher le nom d\'utilisateur');
    
    console.log('✅ Test de la commande id avec option -n');
    return true;
}

/**
 * Test d'erreur quand aucun utilisateur n'est connecté
 */
export function testIdNoUser() {
    clearCaptures();
    const context = createTestContext();
    
    // Aucun utilisateur connecté
    context.currentUser = null;
    
    // Exécuter la commande id
    cmdId([], context);
    
    // Récupérer la sortie d'erreur (filtrer par classe 'error')
    const captures = getCaptures();
    const errors = captures.filter(c => c.className === 'error');
    
    // Vérifier qu'une erreur est affichée
    assert.isTrue(errors.length > 0, 'Devrait afficher une erreur');
    assert.isTrue(errors[0].text.includes('aucun utilisateur connecté'), 'Devrait indiquer qu\'aucun utilisateur n\'est connecté');
    
    console.log('✅ Test d\'erreur id sans utilisateur connecté');
    return true;
}

/**
 * Test d'option inconnue
 */
export function testIdInvalidOption() {
    clearCaptures();
    const context = createTestContext();
    
    context.currentUser = {
        username: 'root',
        uid: 0,
        gid: 0
    };
    
    // Exécuter la commande id avec option invalide
    cmdId(['-x'], context);
    
    // Récupérer la sortie d'erreur (filtrer par classe 'error')
    const captures = getCaptures();
    const errors = captures.filter(c => c.className === 'error');
    
    // Vérifier qu'une erreur est affichée
    assert.isTrue(errors.length > 0, 'Devrait afficher une erreur');
    assert.isTrue(errors[0].text.includes('option inconnue'), 'Devrait indiquer une option inconnue');
    // Vérifier qu'il y a plusieurs lignes d'erreur (incluant Usage:)
    assert.isTrue(errors.length >= 2, 'Devrait afficher l\'usage en plus de l\'erreur');
    
    console.log('✅ Test d\'option invalide pour id');
    return true;
}