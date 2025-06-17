// test-cases/specs/commands/echo/redirections.test.js - Tests des redirections pour echo
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { parseCommandLine, parseRedirections } from '../../../../lib/bash-parser.js';
import { executeWithRedirection, hasRedirection } from '../../../../lib/bash-redirections.js';
import { substituteVariablesInArgs } from '../../../../lib/bash-variables.js';
import { cmdEcho } from '../../../../bin/echo.js';

/**
 * Fonction pour exécuter une commande avec redirections dans le contexte de test
 * Reproduit la logique de terminal.js mais pour les tests
 */
function executeCommand(commandString, context) {
    const trimmedCommand = commandString.trim();
    if (!trimmedCommand) {
        return;
    }

    // Parser la commande (même logique que terminal.js)
    const parts = parseCommandLine(trimmedCommand);
    if (parts.length === 0) {
        return;
    }

    const { command: cmdParts, redirections } = parseRedirections(parts);
    if (cmdParts.length === 0) {
        return;
    }

    const cmd = cmdParts[0];
    let args = cmdParts.slice(1);
    args = substituteVariablesInArgs(args, context);

    // Exécuter avec ou sans redirections
    if (hasRedirection(redirections)) {
        const commandExecutor = () => {
            executeCommandDirect(cmd, args, context);
        };
        executeWithRedirection(commandExecutor, redirections, context);
    } else {
        executeCommandDirect(cmd, args, context);
    }
}

/**
 * Exécute directement la commande sans redirection
 */
function executeCommandDirect(cmd, args, context) {
    // Pour les tests, on ne supporte que echo pour l'instant
    if (cmd === 'echo') {
        cmdEcho(args, context);
    } else {
        context.showError(`Command not supported in tests: ${cmd}`);
    }
}

/**
 * Test de redirection simple avec echo > fichier
 */
function testEchoRedirectOutput() {
    clearCaptures();
    const context = createTestContext();
    
    // Vérifier qu'aucun fichier n'existe au départ
    assert.fileNotExists(context, '/root/output.txt', 'output.txt ne devrait pas exister au départ');
    
    // Exécuter echo avec redirection
    executeCommand('echo "Hello World" > output.txt', context);
    
    // Vérifier que le fichier a été créé
    assert.fileExists(context, '/root/output.txt', 'output.txt devrait être créé');
    assert.isFile(context, '/root/output.txt', 'output.txt devrait être un fichier');
    
    // Vérifier le contenu du fichier
    const file = context.fileSystem['/root/output.txt'];
    assert.equals(file.content.trim(), 'Hello World', 'Le fichier devrait contenir "Hello World"');
    
    console.log('✅ Redirection echo > fichier fonctionne');
    return true;
}

/**
 * Test de redirection append avec echo >> fichier
 */
function testEchoRedirectAppend() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer d'abord un fichier avec du contenu
    testUtils.createTestFile(context, '/root/append.txt', 'Line 1\n');
    
    // Ajouter du contenu avec >>
    executeCommand('echo "Line 2" >> append.txt', context);
    
    // Vérifier le contenu du fichier
    const file = context.fileSystem['/root/append.txt'];
    assert.isTrue(file.content.includes('Line 1'), 'Le fichier devrait toujours contenir "Line 1"');
    assert.isTrue(file.content.includes('Line 2'), 'Le fichier devrait maintenant contenir "Line 2"');
    
    console.log('✅ Redirection echo >> fichier fonctionne');
    return true;
}

/**
 * Test de redirection avec echo -n
 */
function testEchoRedirectWithOptionN() {
    clearCaptures();
    const context = createTestContext();
    
    // Exécuter echo -n avec redirection
    executeCommand('echo -n "No newline" > nonewline.txt', context);
    
    // Vérifier que le fichier a été créé
    assert.fileExists(context, '/root/nonewline.txt', 'nonewline.txt devrait être créé');
    
    // Vérifier le contenu
    const file = context.fileSystem['/root/nonewline.txt'];
    assert.isTrue(file.content.includes('No newline'), 'Le fichier devrait contenir "No newline"');
    
    console.log('✅ Redirection avec echo -n fonctionne');
    return true;
}

/**
 * Test de redirection avec séquences d'échappement
 */
function testEchoRedirectWithEscapes() {
    clearCaptures();
    const context = createTestContext();
    
    // Exécuter echo -e avec redirection
    executeCommand('echo -e "Line 1\\nLine 2\\tTabbed" > escaped.txt', context);
    
    // Vérifier que le fichier a été créé
    assert.fileExists(context, '/root/escaped.txt', 'escaped.txt devrait être créé');
    
    // Vérifier le contenu
    const file = context.fileSystem['/root/escaped.txt'];
    assert.isTrue(file.content.includes('Line 1\nLine 2\tTabbed'), 'Le fichier devrait contenir les séquences interprétées');
    
    console.log('✅ Redirection avec séquences d\'échappement fonctionne');
    return true;
}

/**
 * Test de redirection multiple (écraser le fichier)
 */
function testEchoRedirectOverwrite() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer d'abord un fichier
    executeCommand('echo "First content" > overwrite.txt', context);
    
    // Vérifier le contenu initial
    let file = context.fileSystem['/root/overwrite.txt'];
    assert.isTrue(file.content.includes('First content'), 'Le fichier devrait contenir "First content"');
    
    // Écraser avec nouveau contenu
    executeCommand('echo "Second content" > overwrite.txt', context);
    
    // Vérifier que le contenu a été remplacé
    file = context.fileSystem['/root/overwrite.txt'];
    assert.isTrue(file.content.includes('Second content'), 'Le fichier devrait maintenant contenir "Second content"');
    assert.isFalse(file.content.includes('First content'), 'Le fichier ne devrait plus contenir "First content"');
    
    console.log('✅ Écrasement de fichier avec redirection fonctionne');
    return true;
}

/**
 * Test de redirection vers fichier dans sous-dossier
 */
function testEchoRedirectToSubdirectory() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un sous-dossier d'abord
    testUtils.createTestDirectory(context, '/root/subdir');
    
    // Rediriger vers un fichier dans le sous-dossier
    executeCommand('echo "Content in subdir" > subdir/file.txt', context);
    
    // Vérifier que le fichier a été créé
    assert.fileExists(context, '/root/subdir/file.txt', 'subdir/file.txt devrait être créé');
    
    // Vérifier le contenu
    const file = context.fileSystem['/root/subdir/file.txt'];
    assert.isTrue(file.content.includes('Content in subdir'), 'Le fichier devrait contenir le bon contenu');
    
    console.log('✅ Redirection vers sous-dossier fonctionne');
    return true;
}

/**
 * Test de redirection avec arguments multiples
 */
function testEchoRedirectMultipleArgs() {
    clearCaptures();
    const context = createTestContext();
    
    // Rediriger echo avec plusieurs arguments
    executeCommand('echo Hello beautiful world > multiargs.txt', context);
    
    // Vérifier que le fichier a été créé
    assert.fileExists(context, '/root/multiargs.txt', 'multiargs.txt devrait être créé');
    
    // Vérifier le contenu
    const file = context.fileSystem['/root/multiargs.txt'];
    assert.isTrue(file.content.includes('Hello beautiful world'), 'Le fichier devrait contenir tous les mots');
    
    console.log('✅ Redirection avec arguments multiples fonctionne');
    return true;
}

/**
 * Test de redirection append multiple
 */
function testEchoRedirectAppendMultiple() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un fichier avec plusieurs appends
    executeCommand('echo "Line 1" > multiappend.txt', context);
    executeCommand('echo "Line 2" >> multiappend.txt', context);
    executeCommand('echo "Line 3" >> multiappend.txt', context);
    
    // Vérifier le contenu final
    const file = context.fileSystem['/root/multiappend.txt'];
    assert.isTrue(file.content.includes('Line 1'), 'Le fichier devrait contenir Line 1');
    assert.isTrue(file.content.includes('Line 2'), 'Le fichier devrait contenir Line 2');
    assert.isTrue(file.content.includes('Line 3'), 'Le fichier devrait contenir Line 3');
    
    // Vérifier l'ordre
    const lines = file.content.split('\n').filter(line => line.trim());
    assert.isTrue(lines[0].includes('Line 1'), 'Line 1 devrait être en premier');
    assert.isTrue(lines[1].includes('Line 2'), 'Line 2 devrait être en deuxième');
    assert.isTrue(lines[2].includes('Line 3'), 'Line 3 devrait être en troisième');
    
    console.log('✅ Appends multiples fonctionnent');
    return true;
}

/**
 * ✅ TEST CORRIGÉ : Test d'erreur de redirection vers dossier inexistant
 * Maintenant teste le comportement bash standard (correct)
 */
function testEchoRedirectToNonexistentDirectory() {
    clearCaptures();
    const context = createTestContext();
    
    // Essayer de rediriger vers un dossier inexistant
    executeCommand('echo "test" > nonexistent/file.txt', context);
    
    // ✅ COMPORTEMENT CORRECT : bash standard refuse cette opération
    // Le répertoire parent doit exister pour pouvoir créer un fichier
    
    const captures = getCaptures();
    
    // Vérifier qu'une erreur a été générée et capturée
    const hasError = captures.some(capture => 
        capture.className === 'error' && 
        (capture.text.includes('No such file or directory') || 
         capture.text.includes('nonexistent'))
    );
    assert.isTrue(hasError, 'Une erreur "No such file or directory" devrait être générée et capturée');
    
    // Vérifier que le fichier n'a PAS été créé (comportement correct)
    assert.fileNotExists(context, '/root/nonexistent/file.txt', 'Le fichier ne devrait pas être créé sans répertoire parent');
    
    // Vérifier que le répertoire parent n'a pas été créé non plus
    assert.fileNotExists(context, '/root/nonexistent', 'Le répertoire parent ne devrait pas être créé automatiquement');
    
    console.log('✅ Redirection vers répertoire inexistant échoue correctement (comportement bash standard)');
    return true;
}

/**
 * ✅ NOUVEAU TEST : Redirection réussit après création du répertoire parent
 * Démontre le comportement correct quand le répertoire existe
 */
function testEchoRedirectAfterCreatingParentDirectory() {
    clearCaptures();
    const context = createTestContext();
    
    // D'abord créer le répertoire parent
    testUtils.createTestDirectory(context, '/root/newdir');
    
    // Maintenant la redirection devrait fonctionner
    clearCaptures();
    executeCommand('echo "success" > newdir/file.txt', context);
    
    const captures = getCaptures();
    
    // Aucune erreur ne devrait être générée
    const hasError = captures.some(capture => capture.className === 'error');
    assert.isFalse(hasError, 'Aucune erreur ne devrait être générée quand le répertoire parent existe');
    
    // Vérifier que le fichier a été créé avec le bon contenu
    assert.fileExists(context, '/root/newdir/file.txt', 'Le fichier devrait être créé quand le répertoire parent existe');
    const file = context.fileSystem['/root/newdir/file.txt'];
    assert.isTrue(file.content.includes('success'), 'Le fichier devrait contenir le bon contenu');
    
    console.log('✅ Redirection réussit quand le répertoire parent existe');
    return true;
}
/**
 * Test de redirection avec guillemets
 */
function testEchoRedirectWithQuotes() {
    clearCaptures();
    const context = createTestContext();
    
    // Rediriger avec du texte entre guillemets
    executeCommand('echo "Text with spaces and symbols !@#" > quoted.txt', context);
    
    // Vérifier que le fichier a été créé
    assert.fileExists(context, '/root/quoted.txt', 'quoted.txt devrait être créé');
    
    // Vérifier le contenu
    const file = context.fileSystem['/root/quoted.txt'];
    assert.isTrue(file.content.includes('Text with spaces and symbols !@#'), 'Le fichier devrait contenir le texte avec symboles');
    
    console.log('✅ Redirection avec guillemets fonctionne');
    return true;
}

/**
 * Export des tests des redirections pour echo
 */
export const echoRedirectionsTests = [
    createTest('Redirection simple >', testEchoRedirectOutput),
    createTest('Redirection append >>', testEchoRedirectAppend),
    createTest('Redirection avec -n', testEchoRedirectWithOptionN),
    createTest('Redirection avec séquences échappement', testEchoRedirectWithEscapes),
    createTest('Écrasement de fichier', testEchoRedirectOverwrite),
    createTest('Redirection vers sous-dossier', testEchoRedirectToSubdirectory),
    createTest('Redirection arguments multiples', testEchoRedirectMultipleArgs),
    createTest('Appends multiples', testEchoRedirectAppendMultiple),
    createTest('Erreur répertoire inexistant', testEchoRedirectToNonexistentDirectory),
    createTest('Redirection avec guillemets', testEchoRedirectWithQuotes),
    createTest('Succès après création répertoire', testEchoRedirectAfterCreatingParentDirectory)
];