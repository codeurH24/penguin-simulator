// test-cases/specs/commands/echo/basic.test.js - Tests de base pour echo
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdEcho } from '../../../../bin/echo.js';

/**
 * Test d'echo sans arguments
 */
function testEchoNoArguments() {
    clearCaptures();
    const context = createTestContext();
    
    // Exécuter echo sans arguments
    cmdEcho([], context);
    
    // Vérifier qu'une ligne vide a été affichée
    const captures = getCaptures();
    assert.captureCount(1, 'echo sans arguments devrait capturer 1 ligne');
    assert.equals(captures[0].text, '\n', 'echo sans arguments devrait afficher une ligne vide avec newline');
    assert.equals(captures[0].className, '', 'echo ne devrait pas avoir de classe CSS spéciale');
    
    console.log('✅ echo sans arguments fonctionne');
    return true;
}

/**
 * Test d'echo avec texte simple
 */
function testEchoSimpleText() {
    clearCaptures();
    const context = createTestContext();
    
    // Exécuter echo avec texte simple
    cmdEcho(['Hello'], context);
    
    // Vérifier l'affichage
    const captures = getCaptures();
    assert.captureCount(1, 'echo avec texte simple devrait capturer 1 ligne');
    assert.equals(captures[0].text, 'Hello\n', 'echo devrait afficher "Hello" avec newline');
    
    console.log('✅ echo avec texte simple fonctionne');
    return true;
}

/**
 * Test d'echo avec plusieurs mots
 */
function testEchoMultipleWords() {
    clearCaptures();
    const context = createTestContext();
    
    // Exécuter echo avec plusieurs mots
    cmdEcho(['Hello', 'world', 'from', 'echo'], context);
    
    // Vérifier l'affichage
    const captures = getCaptures();
    assert.captureCount(1, 'echo avec plusieurs mots devrait capturer 1 ligne');
    assert.equals(captures[0].text, 'Hello world from echo\n', 'echo devrait joindre les mots avec des espaces et newline');
    
    console.log('✅ echo avec plusieurs mots fonctionne');
    return true;
}

/**
 * Test d'echo avec texte contenant des espaces
 */
function testEchoWithSpaces() {
    clearCaptures();
    const context = createTestContext();
    
    // Exécuter echo avec du texte contenant des espaces
    cmdEcho(['This is a test'], context);
    
    // Vérifier l'affichage
    const captures = getCaptures();
    assert.captureCount(1, 'echo avec espaces devrait capturer 1 ligne');
    assert.equals(captures[0].text, 'This is a test\n', 'echo devrait préserver le texte avec espaces et newline');
    
    console.log('✅ echo avec espaces fonctionne');
    return true;
}

/**
 * Test d'echo avec caractères spéciaux
 */
function testEchoSpecialCharacters() {
    clearCaptures();
    const context = createTestContext();
    
    // Exécuter echo avec caractères spéciaux
    cmdEcho(['Hello!', '@#$%', '&*()', '123'], context);
    
    // Vérifier l'affichage
    const captures = getCaptures();
    assert.captureCount(1, 'echo avec caractères spéciaux devrait capturer 1 ligne');
    assert.equals(captures[0].text, 'Hello! @#$% &*() 123\n', 'echo devrait gérer les caractères spéciaux');
    
    console.log('✅ echo avec caractères spéciaux fonctionne');
    return true;
}

/**
 * Test d'echo avec texte vide explicite
 */
function testEchoEmptyString() {
    clearCaptures();
    const context = createTestContext();
    
    // Exécuter echo avec chaîne vide
    cmdEcho([''], context);
    
    // Vérifier l'affichage
    const captures = getCaptures();
    assert.captureCount(1, 'echo avec chaîne vide devrait capturer 1 ligne');
    assert.equals(captures[0].text, '\n', 'echo avec chaîne vide devrait afficher juste newline');
    
    console.log('✅ echo avec chaîne vide fonctionne');
    return true;
}

/**
 * Test d'echo avec arguments mixtes (vides et non-vides)
 */
function testEchoMixedArguments() {
    clearCaptures();
    const context = createTestContext();
    
    // Exécuter echo avec arguments mixtes
    cmdEcho(['Hello', '', 'world', '', '!'], context);
    
    // Vérifier l'affichage (les arguments vides deviennent des espaces supplémentaires)
    const captures = getCaptures();
    assert.captureCount(1, 'echo avec arguments mixtes devrait capturer 1 ligne');
    assert.equals(captures[0].text, 'Hello  world  !\n', 'echo devrait joindre tous les arguments même vides');
    
    console.log('✅ echo avec arguments mixtes fonctionne');
    return true;
}

/**
 * Test d'echo avec nombres
 */
function testEchoNumbers() {
    clearCaptures();
    const context = createTestContext();
    
    // Exécuter echo avec nombres
    cmdEcho(['123', '456.789', '-42', '0'], context);
    
    // Vérifier l'affichage
    const captures = getCaptures();
    assert.captureCount(1, 'echo avec nombres devrait capturer 1 ligne');
    assert.equals(captures[0].text, '123 456.789 -42 0\n', 'echo devrait afficher les nombres comme du texte');
    
    console.log('✅ echo avec nombres fonctionne');
    return true;
}

/**
 * Test d'echo avec backslashes sans option -e
 */
function testEchoBackslashesWithoutOption() {
    clearCaptures();
    const context = createTestContext();
    
    // Exécuter echo avec backslashes (sans -e, ils ne devraient pas être interprétés)
    cmdEcho(['Hello\\nworld\\ttest'], context);
    
    // Vérifier l'affichage (les backslashes devraient être littéraux)
    const captures = getCaptures();
    assert.captureCount(1, 'echo sans -e devrait capturer 1 ligne');
    assert.equals(captures[0].text, 'Hello\\nworld\\ttest\n', 'echo sans -e ne devrait pas interpréter les séquences d\'échappement');
    
    console.log('✅ echo sans -e garde les backslashes littéraux');
    return true;
}

/**
 * Test d'echo avec guillemets dans les arguments
 */
function testEchoQuotedArguments() {
    clearCaptures();
    const context = createTestContext();
    
    // Exécuter echo avec guillemets (simulé comme arguments séparés)
    cmdEcho(['"Hello', 'world"', "'test'"], context);
    
    // Vérifier l'affichage
    const captures = getCaptures();
    assert.captureCount(1, 'echo avec guillemets devrait capturer 1 ligne');
    assert.equals(captures[0].text, '"Hello world" \'test\'\n', 'echo devrait préserver les guillemets');
    
    console.log('✅ echo avec guillemets fonctionne');
    return true;
}

/**
 * Test de capture du contexte d'affichage
 */
function testEchoOutputFunction() {
    clearCaptures();
    const context = createTestContext();
    
    // Vérifier que echo utilise bien la fonction de sortie du contexte
    let customOutput = '';
    context.addLine = (text) => {
        customOutput = text;
    };
    
    cmdEcho(['Custom output test'], context);
    
    // Vérifier que la fonction personnalisée a été utilisée
    assert.equals(customOutput, 'Custom output test\n', 'echo devrait utiliser la fonction de sortie du contexte');
    
    console.log('✅ echo utilise la fonction de sortie du contexte');
    return true;
}

/**
 * Export des tests de base pour echo
 */
export const echoBasicTests = [
    createTest('echo sans arguments', testEchoNoArguments),
    createTest('echo texte simple', testEchoSimpleText),
    createTest('echo plusieurs mots', testEchoMultipleWords),
    createTest('echo avec espaces', testEchoWithSpaces),
    createTest('echo caractères spéciaux', testEchoSpecialCharacters),
    createTest('echo chaîne vide', testEchoEmptyString),
    createTest('echo arguments mixtes', testEchoMixedArguments),
    createTest('echo avec nombres', testEchoNumbers),
    createTest('echo backslashes sans -e', testEchoBackslashesWithoutOption),
    createTest('echo avec guillemets', testEchoQuotedArguments),
    createTest('echo fonction de sortie', testEchoOutputFunction)
];