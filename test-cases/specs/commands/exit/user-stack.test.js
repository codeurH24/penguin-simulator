// test-cases/specs/commands/exit/user-stack.test.js - Tests exit dépilement sessions utilisateur
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdSu } from '../../../../bin/su.js';
import { cmdExit } from '../../../../lib/bash-builtins.js';
import { cmdUseradd } from '../../../../bin/useradd.js';
import { cmdPasswd } from '../../../../bin/passwd.js';
import { cmdMkdir } from '../../../../bin/mkdir.js';
import { cmdCd } from '../../../../lib/bash-builtins.js';
import { getUserStackSize, clearUserStack } from '../../../../modules/users/user-stack.js';

/**
 * Fonction utilitaire pour préparer un utilisateur sans mot de passe
 */
function prepareUserWithoutPassword(context, username) {
    // Créer l'utilisateur avec -m pour créer le home
    cmdUseradd(['-m', username], context);
    
    // Supprimer son mot de passe avec passwd -d
    cmdPasswd(['-d', username], context);
    
    // Vérifier que le mot de passe est bien vide dans /etc/shadow
    const shadowFile = context.fileSystem['/etc/shadow'];
    const lines = shadowFile.content.split('\n');
    const userLine = lines.find(line => line.startsWith(username + ':'));
    
    if (userLine) {
        const [, passwordHash] = userLine.split(':');
        assert.equals(passwordHash, '', `Le mot de passe de ${username} devrait être vide après passwd -d`);
    }
    
    // Nettoyer les captures pour le vrai test
    clearCaptures();
    return context;
}

/**
 * Test du dépilement des sessions avec exit - Séquence complète root -> alice -> bob -> charlie
 */
function testExitUserStackDepilingSequence() {
    clearCaptures();
    // IMPORTANT: Nettoyer la pile d'utilisateurs avant le test
    clearUserStack();
    const context = createTestContext();
    
    // Préparer les utilisateurs sans mot de passe
    prepareUserWithoutPassword(context, 'alice');
    prepareUserWithoutPassword(context, 'bob');
    prepareUserWithoutPassword(context, 'charlie');
    
    // Créer des répertoires de test pour vérifier les changements de path
    cmdMkdir(['-p', '/home/alice/workspace'], context);
    cmdMkdir(['-p', '/home/bob/projects'], context);
    cmdMkdir(['-p', '/home/charlie/documents'], context);
    
    // État initial : root dans son home
    assert.equals(context.currentUser.username, 'root', 'Devrait commencer en tant que root');
    assert.equals(context.getCurrentPath(), '/root', 'Devrait commencer dans /root');
    assert.equals(getUserStackSize(), 0, 'La pile utilisateur devrait être vide initialement');
    
    // ÉTAPE 1: root -> alice avec login shell (su - alice)
    clearCaptures();
    cmdSu(['-', 'alice'], context);
    
    // Vérifier le changement vers alice
    assert.equals(context.currentUser.username, 'alice', 'Devrait être alice après su - alice');
    assert.equals(context.getCurrentPath(), '/home/alice', 'Devrait être dans /home/alice après su - alice');
    assert.equals(getUserStackSize(), 1, 'La pile devrait contenir 1 utilisateur (root)');
    
    // Se déplacer dans un répertoire spécifique d'alice
    cmdCd(['workspace'], context);
    assert.equals(context.getCurrentPath(), '/home/alice/workspace', 'Devrait être dans /home/alice/workspace');
    
    // ÉTAPE 2: alice -> bob avec login shell (su - bob)
    clearCaptures();
    cmdSu(['-', 'bob'], context);
    
    // Vérifier le changement vers bob
    assert.equals(context.currentUser.username, 'bob', 'Devrait être bob après su - bob');
    assert.equals(context.getCurrentPath(), '/home/bob', 'Devrait être dans /home/bob après su - bob');
    assert.equals(getUserStackSize(), 2, 'La pile devrait contenir 2 utilisateurs (root, alice)');
    
    // Se déplacer dans un répertoire spécifique de bob
    cmdCd(['projects'], context);
    assert.equals(context.getCurrentPath(), '/home/bob/projects', 'Devrait être dans /home/bob/projects');
    
    // ÉTAPE 3: bob -> charlie avec login shell (su - charlie)
    clearCaptures();
    cmdSu(['-', 'charlie'], context);
    
    // Vérifier le changement vers charlie
    assert.equals(context.currentUser.username, 'charlie', 'Devrait être charlie après su - charlie');
    assert.equals(context.getCurrentPath(), '/home/charlie', 'Devrait être dans /home/charlie après su - charlie');
    assert.equals(getUserStackSize(), 3, 'La pile devrait contenir 3 utilisateurs (root, alice, bob)');
    
    // Se déplacer dans un répertoire spécifique de charlie
    cmdCd(['documents'], context);
    assert.equals(context.getCurrentPath(), '/home/charlie/documents', 'Devrait être dans /home/charlie/documents');
    
    // ÉTAPE 4: Premier exit - charlie -> bob
    clearCaptures();
    cmdExit([], context);
    
    // Vérifier le retour vers bob
    assert.equals(context.currentUser.username, 'bob', 'Devrait être bob après exit depuis charlie');
    assert.equals(context.getCurrentPath(), '/home/bob/projects', 'Devrait retrouver le path de bob (/home/bob/projects)');
    assert.equals(getUserStackSize(), 2, 'La pile devrait maintenant contenir 2 utilisateurs (root, alice)');
    assert.captureCount(0, 'exit devrait être silencieux lors du retour vers un utilisateur précédent');
    
    // ÉTAPE 5: Deuxième exit - bob -> alice
    clearCaptures();
    cmdExit([], context);
    
    // Vérifier le retour vers alice
    assert.equals(context.currentUser.username, 'alice', 'Devrait être alice après exit depuis bob');
    assert.equals(context.getCurrentPath(), '/home/alice/workspace', 'Devrait retrouver le path d\'alice (/home/alice/workspace)');
    assert.equals(getUserStackSize(), 1, 'La pile devrait maintenant contenir 1 utilisateur (root)');
    assert.captureCount(0, 'exit devrait être silencieux lors du retour vers un utilisateur précédent');
    
    // ÉTAPE 6: Troisième exit - alice -> root
    clearCaptures();
    cmdExit([], context);
    
    // Vérifier le retour vers root
    assert.equals(context.currentUser.username, 'root', 'Devrait être root après exit depuis alice');
    assert.equals(context.getCurrentPath(), '/root', 'Devrait retrouver le path de root (/root)');
    assert.equals(getUserStackSize(), 0, 'La pile devrait être vide après retour à root');
    assert.captureCount(0, 'exit devrait être silencieux lors du retour vers un utilisateur précédent');
    
    // ÉTAPE 7: Quatrième exit - depuis root (pas d'utilisateur précédent)
    clearCaptures();
    cmdExit([], context);
    
    // Vérifier que ça reste root et affiche un message d'exit final
    assert.equals(context.currentUser.username, 'root', 'Devrait rester root après exit final');
    assert.equals(context.getCurrentPath(), '/root', 'Devrait rester dans /root après exit final');
    assert.equals(getUserStackSize(), 0, 'La pile devrait rester vide');
    
    // Vérifier le message d'exit final
    const captures = getCaptures();
    assert.captureCount(1, 'exit final devrait afficher un message');
    assert.equals(captures[0].text.trim(), 'exit', 'exit final devrait afficher "exit"');
    
    console.log('✅ Séquence complète de dépilement des sessions utilisateur fonctionne');
    return true;
}

/**
 * Test exit avec code de sortie lors du dépilement
 */
function testExitWithExitCodeDuringUserStack() {
    clearCaptures();
    // IMPORTANT: Nettoyer la pile d'utilisateurs avant le test
    clearUserStack();
    const context = createTestContext();
    
    // Préparer alice
    prepareUserWithoutPassword(context, 'alice');
    
    // root -> alice
    cmdSu(['-', 'alice'], context);
    assert.equals(context.currentUser.username, 'alice', 'Devrait être alice');
    assert.equals(getUserStackSize(), 1, 'Pile devrait contenir root');
    
    // exit avec code de sortie depuis alice
    clearCaptures();
    cmdExit(['5'], context);
    
    // Vérifier le retour vers root (le code de sortie est ignoré lors du dépilement)
    assert.equals(context.currentUser.username, 'root', 'Devrait être root après exit 5');
    assert.equals(getUserStackSize(), 0, 'La pile devrait être vide');
    assert.captureCount(0, 'exit avec code devrait être silencieux lors du dépilement');
    
    console.log('✅ exit avec code de sortie fonctionne pendant le dépilement');
    return true;
}

/**
 * Test exit avec argument invalide lors du dépilement
 */
function testExitWithInvalidArgumentDuringUserStack() {
    clearCaptures();
    // IMPORTANT: Nettoyer la pile d'utilisateurs avant le test
    clearUserStack();
    const context = createTestContext();
    
    // Préparer alice
    prepareUserWithoutPassword(context, 'alice');
    
    // root -> alice
    cmdSu(['-', 'alice'], context);
    assert.equals(context.currentUser.username, 'alice', 'Devrait être alice');
    
    // exit avec argument invalide
    clearCaptures();
    cmdExit(['abc'], context);
    
    // Devrait afficher une erreur mais quand même dépiler
    const captures = getCaptures();
    assert.captureCount(1, 'exit avec argument invalide devrait afficher une erreur');
    assert.isTrue(
        captures[0].text.includes('argument numérique requis'), 
        'Devrait contenir le message d\'erreur "argument numérique requis"'
    );
    
    // Mais l'utilisateur devrait quand même avoir changé vers root
    assert.equals(context.currentUser.username, 'root', 'Devrait être root malgré l\'erreur');
    assert.equals(getUserStackSize(), 0, 'La pile devrait être vide');
    
    console.log('✅ exit avec argument invalide gère l\'erreur mais dépile quand même');
    return true;
}

/**
 * Test préservation des répertoires lors du dépilement avec su sans tiret
 */
function testExitPreservesDirectoryWithoutLoginShell() {
    clearCaptures();
    // IMPORTANT: Nettoyer la pile d'utilisateurs avant le test
    clearUserStack();
    const context = createTestContext();
    
    // Préparer alice
    prepareUserWithoutPassword(context, 'alice');
    
    // Créer et aller dans un répertoire de test
    cmdMkdir(['testdir'], context);
    cmdCd(['testdir'], context);
    assert.equals(context.getCurrentPath(), '/root/testdir', 'Devrait être dans /root/testdir');
    
    // root -> alice SANS tiret (devrait préserver le répertoire)
    cmdSu(['alice'], context);
    assert.equals(context.currentUser.username, 'alice', 'Devrait être alice');
    assert.equals(context.getCurrentPath(), '/root/testdir', 'Devrait rester dans /root/testdir avec su sans tiret');
    
    // exit pour revenir à root
    clearCaptures();
    cmdExit([], context);
    
    // Vérifier que root retrouve son répertoire sauvegardé
    assert.equals(context.currentUser.username, 'root', 'Devrait être root');
    assert.equals(context.getCurrentPath(), '/root/testdir', 'Devrait retrouver /root/testdir');
    
    console.log('✅ exit préserve les répertoires avec su sans tiret');
    return true;
}

/**
 * Export des tests de dépilement des sessions utilisateur
 */
export const exitUserStackTests = [
    createTest('Séquence complète de dépilement root->alice->bob->charlie', testExitUserStackDepilingSequence),
    createTest('exit avec code de sortie lors du dépilement', testExitWithExitCodeDuringUserStack),
    createTest('exit avec argument invalide lors du dépilement', testExitWithInvalidArgumentDuringUserStack),
    createTest('exit préserve les répertoires avec su sans tiret', testExitPreservesDirectoryWithoutLoginShell)
];