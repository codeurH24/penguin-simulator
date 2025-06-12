// test-cases/specs/commands/passwd/interactive.test.js - Tests passwd interactifs
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdPasswd } from '../../../../bin/passwd.js';
import { cmdUseradd } from '../../../../bin/useradd.js';
import { initApp } from '../../../../index.js';

/**
 * Test du processus complet de changement de mot de passe interactif
 */
async function testInteractivePasswordChange() {
    const terminal = await initApp();


    terminal.getContext();

    // S'assurer qu'alice existe pour le test
    cmdUseradd(['alice'], terminal.getContext());

    let out = '';

    // Capturer la sortie initiale
    terminal.captureOutput();
    const { callback } = cmdPasswd(['alice'], terminal.getContext());
    out = terminal.getCapture();
    
    // Nettoyer la sortie des caractères de contrôle
    let cleanOutput = out.replace(/\r\n/g, '').replace(/\r/g, '').trim();
    let expectedPrompt = 'Nouveau mot de passe pour alice:';
    
    assert.isTrue(cleanOutput.includes(expectedPrompt), 
        `Le prompt devrait contenir "${expectedPrompt}", mais contient: "${cleanOutput}"`);
    
    // Premier callback : saisir le nouveau mot de passe
    terminal.captureOutput();
    callback('test');
    out = terminal.getCapture();

    cleanOutput = out.replace(/\r\n/g, '').replace(/\r/g, '').trim();
    expectedPrompt = 'Retapez le nouveau mot de passe pour alice:';
    
    assert.isTrue(cleanOutput.includes(expectedPrompt), 
        `Le prompt devrait contenir "${expectedPrompt}", mais contient: "${cleanOutput}"`);

    // Second callback : confirmer le mot de passe
    terminal.captureOutput();
    callback('test');
    out = terminal.getCapture();

    cleanOutput = out.replace(/\r\n/g, '').replace(/\r/g, '').trim();
    expectedPrompt = 'passwd: mot de passe mis à jour avec succès';
    
    assert.isTrue(cleanOutput.includes(expectedPrompt), 
        `Le prompt devrait contenir "${expectedPrompt}", mais contient: "${cleanOutput}"`);

    return true;
}

/**
 * Export des tests passwd interactifs - SEULEMENT LE PREMIER TEST
 */
export const passwdInteractiveTests = [
    createTest('Changement de mot de passe interactif complet', testInteractivePasswordChange)
];