// test-cases/specs/commands/sudo/interactive.test.js - Tests sudo interactifs
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdSudo } from '../../../../bin/sudo/sudo.js';
import { cmdUseradd } from '../../../../bin/useradd.js';
import { cmdPasswd } from '../../../../bin/passwd.js';
import { cmdSu } from '../../../../bin/su.js';
import { initApp } from '../../../../index.js';

/**
 * Test du processus d'authentification sudo interactif
 * Ce test vérifie que l'authentification sudo demande bien un mot de passe
 * et affiche le prompt correctement
 */
async function testInteractiveSudoAuth() {

    const terminal = await initApp(true);
    
    // S'assurer qu'alice existe pour le test
    cmdUseradd(['-G', 'sudo','alice'], terminal.getContext());

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


    cmdSu(['alice'], terminal.context);

    cmdSudo(['-k'], terminal.context);

    // sudo whoami sans timestamp
    terminal.captureOutput();
    let prompt = cmdSudo(['whoami'], terminal.context, { programmatic: true });
    out = terminal.getCapture();
    out = out.replace(/\r\n/g, '').replace(/\r/g, '').trim();
    
    expectedPrompt = "[sudo] password for alice:";
    assert.isTrue(out.includes(expectedPrompt), 
        `Le prompt devrait contenir "${expectedPrompt}", mais contient: "${out}"`);

    // pas de timestamp donc mot de passe demandé
    terminal.captureOutput();
    prompt('test');
    out = terminal.getCapture();
    

    // le mot de passe est valide alors la commande whoami est executé.
    expectedPrompt = "root";
    assert.isTrue(out.includes(expectedPrompt), 
        `Le prompt devrait contenir "${expectedPrompt}", mais contient: "${out}"`);

    // retente la meme commande mais le mot de passe ne doit pas etre redemandé.
    terminal.captureOutput();
    prompt = cmdSudo(['whoami'], terminal.context, { programmatic: true });
    out = terminal.getCapture();
    
    expectedPrompt = "root";
    assert.isTrue(out.includes(expectedPrompt), 
        `Le prompt devrait contenir "${expectedPrompt}", mais contient: "${out}"`);

    terminal.captureOutput();
    prompt = cmdSudo(['-k'], terminal.context, { programmatic: true });
    out = terminal.getCapture();
    assert.isTrue(out === '', 
        `Le prompt ne devrait rien retourner apres "sudo -k"`);

    /* 
        Tout le code qui est ci dessous est un copier coller de ce qui à déjà été testé.
        mais confirme que sudo -k fonctionne parfaitement.
        RE sudo whoami sans timestamp 
    */
    terminal.captureOutput();
    prompt = cmdSudo(['whoami'], terminal.context, { programmatic: true });
    out = terminal.getCapture();
    out = out.replace(/\r\n/g, '').replace(/\r/g, '').trim();
    
    expectedPrompt = "[sudo] password for alice:";
    assert.isTrue(out.includes(expectedPrompt), 
        `Le prompt devrait contenir "${expectedPrompt}", mais contient: "${out}"`);

    // pas de timestamp donc mot de passe demandé
    terminal.captureOutput();
    prompt('test');
    out = terminal.getCapture();
    

    // le mot de passe est valide alors la commande whoami est executé.
    expectedPrompt = "root";
    assert.isTrue(out.includes(expectedPrompt), 
        `Le prompt devrait contenir "${expectedPrompt}", mais contient: "${out}"`);

    // retente la meme commande mais le mot de passe ne doit pas etre redemandé.
    terminal.captureOutput();
    prompt = cmdSudo(['whoami'], terminal.context, { programmatic: true });
    out = terminal.getCapture();
    
    expectedPrompt = "root";
    assert.isTrue(out.includes(expectedPrompt), 
        `Le prompt devrait contenir "${expectedPrompt}", mais contient: "${out}"`);
    
    return true;
}

/**
 * Test de sudo avec un utilisateur sans mot de passe (passwd -d)
 * Ce test vérifie que sudo n'exige pas de mot de passe pour un utilisateur
 * dont le mot de passe a été supprimé avec passwd -d
 */
async function testSudoWithoutPassword() {
    const terminal = await initApp(true);
    const context = terminal.getContext();

    // S'assurer qu'alice existe pour le test
    cmdUseradd(['-G', 'sudo', 'alice'], context);

    // Supprimer son mot de passe avec passwd -d
    cmdPasswd(['-d', 'alice'], context);

    let out = '';
    let expectedPrompt = '';
    
    
    cmdSu(['alice'], context);
    cmdSudo(['-k'], context);

    // sudo whoami sans timestamp
    terminal.captureOutput();
    let prompt = cmdSudo(['whoami'], context, { programmatic: true });
    out = terminal.getCapture();
    out = out.replace(/\r\n/g, '').replace(/\r/g, '').trim();

    // le mot de passe n'est pas demandé, la commande whoami est executé.
    expectedPrompt = "root";
    assert.isTrue(out.includes(expectedPrompt), 
        `Le prompt devrait contenir "${expectedPrompt}", mais contient: "${out}"`);

    // retente la meme commande, le mot de passe ne doit pas etre demandé.
    terminal.captureOutput();
    prompt = cmdSudo(['whoami'], context, { programmatic: true });
    out = terminal.getCapture();
    
    expectedPrompt = "root";
    assert.isTrue(out.includes(expectedPrompt), 
        `Le prompt devrait contenir "${expectedPrompt}", mais contient: "${out}"`);

    terminal.captureOutput();
    prompt = cmdSudo(['-k'], context, { programmatic: true });
    out = terminal.getCapture();
    assert.isTrue(out === '', 
        `Le prompt ne devrait rien retourner apres "sudo -k"`);
        
    // retente la meme commande, le mot de passe ne doit pas etre demandé.
    terminal.captureOutput();
    prompt = cmdSudo(['whoami'], context, { programmatic: true });
    out = terminal.getCapture();
    
    expectedPrompt = "root";
    assert.isTrue(out.includes(expectedPrompt), 
        `Le prompt devrait contenir "${expectedPrompt}", mais contient: "${out}"`);
    
    return true;
}

/**
 * Export des tests sudo interactifs
 */
export const sudoInteractiveTests = [
    createTest('Sudo avec authentification', testInteractiveSudoAuth),
    createTest('Sudo avec utilisateur sans mot de passe', testSudoWithoutPassword)
];

