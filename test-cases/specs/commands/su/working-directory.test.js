// test-cases/specs/commands/su/directory.test.js - Tests su répertoire courant COMPLET
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdSu } from '../../../../bin/su.js';
import { cmdUseradd } from '../../../../bin/useradd.js';
import { cmdPasswd } from '../../../../bin/passwd.js';
import { cmdMkdir } from '../../../../bin/mkdir.js';
import { cmdCd } from '../../../../lib/bash-builtins.js';

/**
 * Fonction utilitaire pour préparer un utilisateur sans mot de passe
 */
function prepareUserWithoutPassword(context, username) {

    // console.log('DEBUG username', username);
    // Créer l'utilisateur avec -m pour créer le home
    cmdUseradd(['-m', username], context);
    
    
    // Supprimer son mot de passe avec passwd -d
    cmdPasswd(['-d', username], context);
    
    // CORRECTION : Ne pas vérifier les messages de passwd, mais vérifier directement le fichier
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

function suPreservesDirectory({context}, username, originalPath) {
      // Maintenant tester su alice (ça devrait préserver le répertoire courant)
      clearCaptures(); // Important: Commencer le vrai test ici
    
      cmdSu([username], context);
  
      assert.captureCount(0, 'su ne devrait produire aucune sortie en cas de succès');
  
      // Vérifier que l'utilisateur a changé
      assert.equals(context.currentUser.username, username, 'L\'utilisateur courant devrait être ' + username);
      
      // // VÉRIFICATION PRINCIPALE : le répertoire courant devrait être préservé
      const newPath = context.getCurrentPath();
      assert.equals(newPath, originalPath, 'su devrait préserver le répertoire courant');
      assert.equals(newPath, '/root/testdir', 'Devrait toujours être dans /root/testdir après su');
}

/**
 * Test su préserve le répertoire courant
 */
function testSuPreservesCurrentDirectory() {
    clearCaptures();
    const context = createTestContext();

    // Préparer alice sans mot de passe (ignore les messages de passwd)
    prepareUserWithoutPassword(context, 'alice');

    // Préparer bob sans mot de passe (ignore les messages de passwd)
    prepareUserWithoutPassword(context, 'bob');

    // Créer un dossier de test et s'y déplacer
    cmdMkdir(['testdir'], context);
    cmdCd(['testdir'], context);

    // Vérifier qu'on est dans le bon répertoire
    const originalPath = context.getCurrentPath();
    assert.equals(originalPath, '/root/testdir', 'Devrait être dans /root/testdir');
    
    suPreservesDirectory({context}, 'alice', originalPath);
    suPreservesDirectory({context}, 'bob', originalPath);
    
    console.log('✅ su préserve le répertoire courant');
    return true;
}

/**
 * Test su - alice change vers le répertoire home
 */
function testSuDashChangesToHomeDirectory() {
    clearCaptures();
    let context = createTestContext();

    // Préparer alice sans mot de passe
    context = prepareUserWithoutPassword(context, 'alice');

    // Vérifier que le home d'alice existe
    const aliceHome = '/home/alice';
    assert.fileExists(context, aliceHome, 'Le répertoire /home/alice devrait exister');
    assert.isDirectory(context, aliceHome, '/home/alice devrait être un répertoire');

    // Créer un dossier de test dans /root et s'y déplacer
    cmdMkdir(['testdir'], context);
    cmdCd(['testdir'], context);

    // Vérifier qu'on est dans le bon répertoire initial
    const originalPath = context.getCurrentPath();
    assert.equals(originalPath, '/root/testdir', 'Devrait être dans /root/testdir initialement');
    
    // Vérifier l'utilisateur initial
    assert.equals(context.currentUser.username, 'root', 'Devrait être root initialement');

    // Maintenant tester su - alice (ça devrait changer vers /home/alice)
    clearCaptures();
    
    cmdSu(['-', 'alice'], context);

    assert.captureCount(0, 'su - ne devrait produire aucune sortie en cas de succès');

    // Vérifier que l'utilisateur a changé
    assert.equals(context.currentUser.username, 'alice', 'L\'utilisateur courant devrait être alice');
    
    // VÉRIFICATION PRINCIPALE : le répertoire courant devrait être le home d'alice
    const newPath = context.getCurrentPath();
    assert.equals(newPath, aliceHome, 'su - alice devrait changer le répertoire vers /home/alice');
    assert.notEquals(newPath, originalPath, 'Le répertoire devrait avoir changé depuis /root/testdir');
    
    console.log('✅ su - alice change le répertoire vers /home/alice');
    return true;
}


/**
 * Export des tests su répertoire courant
 */
export const suDirectoryTests = [
    createTest('su préserve le répertoire courant', testSuPreservesCurrentDirectory),
    createTest('su - alice change vers /home/alice', testSuDashChangesToHomeDirectory)
];