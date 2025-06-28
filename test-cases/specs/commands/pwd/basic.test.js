// test-cases/specs/commands/pwd/basic.test.js - Tests de base pour pwd
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdPwd } from '../../../../lib/bash-builtins.js';
import { cmdCd } from '../../../../lib/bash-builtins.js';
import { cmdMkdir } from '../../../../bin/mkdir/mkdir.js';

/**
 * Test de base : pwd affiche le répertoire courant
 */
function testPwdShowsCurrentDirectory() {
    clearCaptures();
    const context = createTestContext();
    
    // Vérifier qu'on démarre dans /root
    assert.equals(context.getCurrentPath(), '/root', 'Devrait démarrer dans /root');
    
    // Exécuter pwd
    cmdPwd([], context);
    
    // Vérifier que pwd affiche le bon répertoire
    const captures = getCaptures();
    assert.captureCount(1, 'pwd devrait capturer exactement 1 ligne');
    assert.equals(captures[0].text, '/root', 'pwd devrait afficher /root');
    assert.equals(captures[0].className, '', 'pwd ne devrait pas avoir de classe CSS spéciale');
    
    console.log('✅ pwd affiche le répertoire courant');
    return true;
}

/**
 * Test après changement de répertoire
 */
function testPwdAfterDirectoryChange() {
    clearCaptures();
    const context = createTestContext();
    
    // Vérifier qu'on démarre dans /root
    assert.equals(context.getCurrentPath(), '/root', 'Devrait démarrer dans /root');
    
    // Créer un dossier et y aller
    cmdMkdir(['testdir'], context);
    assert.fileExists(context, '/root/testdir', 'Le dossier testdir devrait être créé');
    
    clearCaptures();
    cmdCd(['testdir'], context);
    assert.equals(context.getCurrentPath(), '/root/testdir', 'Devrait être dans /root/testdir après cd');
    
    // Exécuter pwd dans le nouveau répertoire
    clearCaptures();
    cmdPwd([], context);
    
    // Vérifier que pwd affiche le nouveau répertoire
    const captures = getCaptures();
    assert.captureCount(1, 'pwd devrait capturer exactement 1 ligne');
    assert.equals(captures[0].text, '/root/testdir', 'pwd devrait afficher /root/testdir');
    
    console.log('✅ pwd fonctionne après changement de répertoire');
    return true;
}

/**
 * Test avec arguments (pwd devrait ignorer les arguments)
 */
function testPwdIgnoresArguments() {
    clearCaptures();
    const context = createTestContext();
    
    // Vérifier qu'on démarre dans /root
    assert.equals(context.getCurrentPath(), '/root', 'Devrait démarrer dans /root');
    
    // Exécuter pwd avec des arguments (comme le vrai pwd, ils sont ignorés)
    cmdPwd(['--help', '-L', 'invalid', 'arguments'], context);
    
    // Vérifier que pwd affiche toujours le répertoire courant, sans erreur
    const captures = getCaptures();
    assert.captureCount(1, 'pwd devrait capturer exactement 1 ligne même avec arguments');
    assert.equals(captures[0].text, '/root', 'pwd devrait afficher /root même avec arguments');
    
    // Vérifier qu'aucune erreur n'a été émise
    const hasError = captures.some(capture => capture.className === 'error');
    assert.isFalse(hasError, 'pwd ne devrait pas émettre d\'erreur avec des arguments');
    
    console.log('✅ pwd ignore les arguments');
    return true;
}

/**
 * Export des tests de base pour pwd
 */
export const pwdBasicTests = [
    createTest('pwd affiche répertoire courant', testPwdShowsCurrentDirectory),
    createTest('pwd après changement répertoire', testPwdAfterDirectoryChange),
    createTest('pwd ignore les arguments', testPwdIgnoresArguments)
];