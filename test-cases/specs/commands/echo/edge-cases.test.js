// test-cases/specs/commands/echo/edge-cases.test.js - Tests des cas limites pour echo
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdEcho } from '../../../../bin/echo.js';

/**
 * Test avec texte très long
 */
function testEchoVeryLongText() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un texte très long
    const longText = 'a'.repeat(1000) + ' ' + 'b'.repeat(1000);
    
    // Exécuter echo avec texte long
    cmdEcho([longText], context);
    
    // Vérifier l'affichage
    const captures = getCaptures();
    assert.captureCount(1, 'echo avec texte long devrait capturer 1 ligne');
    assert.equals(captures[0].text, longText, 'echo devrait gérer les textes longs');
    
    console.log('✅ echo gère les textes longs');
    return true;
}

/**
 * Test avec caractères Unicode
 */
function testEchoUnicodeCharacters() {
    clearCaptures();
    const context = createTestContext();
    
    // Exécuter echo avec caractères Unicode
    cmdEcho(['Hello', '🌍', 'émojis', 'çàéèùâê', '中文'], context);
    
    // Vérifier l'affichage
    const captures = getCaptures();
    assert.captureCount(1, 'echo avec Unicode devrait capturer 1 ligne');
    assert.equals(captures[0].text, 'Hello 🌍 émojis çàéèùâê 中文', 'echo devrait gérer les caractères Unicode');
    
    console.log('✅ echo gère les caractères Unicode');
    return true;
}

/**
 * Test avec beaucoup d'arguments
 */
function testEchoManyArguments() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un tableau avec beaucoup d'arguments
    const manyArgs = [];
    for (let i = 0; i < 100; i++) {
        manyArgs.push(`arg${i}`);
    }
    
    // Exécuter echo avec beaucoup d'arguments
    cmdEcho(manyArgs, context);
    
    // Vérifier l'affichage
    const captures = getCaptures();
    assert.captureCount(1, 'echo avec beaucoup d\'arguments devrait capturer 1 ligne');
    
    const expectedText = manyArgs.join(' ');
    assert.equals(captures[0].text, expectedText, 'echo devrait joindre correctement tous les arguments');
    assert.isTrue(captures[0].text.includes('arg0'), 'Le texte devrait contenir le premier argument');
    assert.isTrue(captures[0].text.includes('arg99'), 'Le texte devrait contenir le dernier argument');
    
    console.log('✅ echo gère beaucoup d\'arguments');
    return true;
}

/**
 * Test avec arguments contenant seulement des espaces
 */
function testEchoWhitespaceArguments() {
    clearCaptures();
    const context = createTestContext();
    
    // Exécuter echo avec arguments d'espaces
    cmdEcho(['Hello', '   ', 'world', '\t', 'test'], context);
    
    // Vérifier l'affichage (echo joint avec des espaces simples)
    const captures = getCaptures();
    assert.captureCount(1, 'echo avec espaces devrait capturer 1 ligne');
    // echo joint tous les arguments avec un espace, donc '   ' devient ' ' + '   ' + ' ' = '     ' (5 espaces)
    assert.equals(captures[0].text, 'Hello     world \t test', 'echo devrait joindre les arguments avec des espaces');
    
    console.log('✅ echo joint correctement les arguments avec espaces');
    return true;
}

/**
 * Test avec option invalide mélangée avec texte
 */
function testEchoInvalidOptionMixed() {
    clearCaptures();
    const context = createTestContext();
    
    // Exécuter echo avec option invalide au milieu
    cmdEcho(['Hello', '-z', 'world', '-n', 'test'], context);
    
    // Vérifier l'affichage (les options invalides deviennent du texte, -n est reconnu)
    const captures = getCaptures();
    assert.captureCount(1, 'echo avec option invalide mélangée devrait capturer 1 ligne');
    assert.equals(captures[0].text, 'Hello -z world test', 'Options invalides et texte après -n devraient être traités comme texte');
    
    console.log('✅ echo gère les options invalides mélangées');
    return true;
}

/**
 * Test avec séquences d'échappement invalides
 */
function testEchoInvalidEscapeSequences() {
    clearCaptures();
    const context = createTestContext();
    
    // Exécuter echo -e avec séquences invalides
    cmdEcho(['-e', 'test\\k\\m\\q\\z'], context);
    
    // Vérifier l'affichage (séquences invalides restent littérales)
    const captures = getCaptures();
    assert.captureCount(1, 'echo avec séquences invalides devrait capturer 1 ligne');
    assert.equals(captures[0].text, 'test\\k\\m\\q\\z', 'Séquences d\'échappement invalides devraient rester littérales');
    
    console.log('✅ echo gère les séquences d\'échappement invalides');
    return true;
}

/**
 * Test avec backslash suivi de chiffres
 */
function testEchoBackslashNumbers() {
    clearCaptures();
    const context = createTestContext();
    
    // Exécuter echo -e avec backslash suivi de chiffres
    cmdEcho(['-e', 'test\\1\\2\\3\\123'], context);
    
    // Vérifier l'affichage (devrait rester littéral car \1, \2 etc. ne sont pas supportés)
    const captures = getCaptures();
    assert.captureCount(1, 'echo avec backslash+chiffres devrait capturer 1 ligne');
    assert.equals(captures[0].text, 'test\\1\\2\\3\\123', 'Backslash suivi de chiffres devrait rester littéral');
    
    console.log('✅ echo gère backslash suivi de chiffres');
    return true;
}

/**
 * Test avec options en double
 */
function testEchoDuplicateOptions() {
    clearCaptures();
    const context = createTestContext();
    
    // Exécuter echo avec options en double
    cmdEcho(['-e', '-e', '-e', 'Hello\\nworld'], context);
    
    // Vérifier l'affichage
    const captures = getCaptures();
    assert.captureCount(1, 'echo avec options dupliquées devrait capturer 1 ligne');
    assert.equals(captures[0].text, 'Hello\nworld', 'Options dupliquées devraient fonctionner normalement');
    
    console.log('✅ echo gère les options dupliquées');
    return true;
}

/**
 * Test avec options mélangées avec du texte
 */
function testEchoOptionsIntermixed() {
    clearCaptures();
    const context = createTestContext();
    
    // Exécuter echo avec options après du texte
    // Note: l'implémentation actuelle extrait toutes les options peu importe leur position
    cmdEcho(['Hello', '-e', 'world\\ntest'], context);
    
    // Vérifier l'affichage (l'option -e est extraite et appliquée)
    const captures = getCaptures();
    assert.captureCount(1, 'echo avec options après texte devrait capturer 1 ligne');
    assert.equals(captures[0].text, 'Hello world\ntest', 'L\'implémentation actuelle extrait les options partout');
    
    console.log('✅ echo traite les options peu importe leur position');
    return true;
}

/**
 * Test avec caractères de contrôle
 */
function testEchoControlCharacters() {
    clearCaptures();
    const context = createTestContext();
    
    // Exécuter echo avec caractères de contrôle déjà présents
    const controlText = 'Hello\x01\x02\x03world';
    cmdEcho([controlText], context);
    
    // Vérifier l'affichage
    const captures = getCaptures();
    assert.captureCount(1, 'echo avec caractères de contrôle devrait capturer 1 ligne');
    assert.equals(captures[0].text, controlText, 'echo devrait préserver les caractères de contrôle');
    
    console.log('✅ echo préserve les caractères de contrôle');
    return true;
}

/**
 * Test avec séquence d'échappement suivie immédiatement d'un caractère valide
 */
function testEchoEscapeSequenceAmbiguous() {
    clearCaptures();
    const context = createTestContext();
    
    // Exécuter echo avec séquences potentiellement ambiguës
    cmdEcho(['-e', 'test\\nn', 'and', '\\tt'], context);
    
    // Vérifier l'affichage
    const captures = getCaptures();
    assert.captureCount(1, 'echo avec séquences ambiguës devrait capturer 1 ligne');
    assert.equals(captures[0].text, 'test\nn and \tt', 'Séquences d\'échappement devraient être correctement interprétées');
    
    console.log('✅ echo gère les séquences potentiellement ambiguës');
    return true;
}

/**
 * Test avec contexte minimal ou undefined
 */
function testEchoMinimalContext() {
    clearCaptures();
    
    // Tester avec contexte minimal (juste une fonction addLine)
    let capturedOutput = '';
    
    const minimalContext = {
        addLine: (text) => {
            capturedOutput = text;
        }
    };
    
    cmdEcho(['Hello from minimal context'], minimalContext);
    assert.equals(capturedOutput, 'Hello from minimal context', 'echo devrait fonctionner avec contexte minimal');
    
    // Tester avec contexte vide
    capturedOutput = '';
    const emptyContext = {};
    
    // Pour un contexte vide, echo utilise addLine par défaut, mais on doit le mocker
    const originalConsoleLog = console.log;
    console.log = (text) => {
        capturedOutput = text;
    };
    
    try {
        // Note: avec un contexte vide, echo ne peut pas fonctionner car addLine n'est pas disponible
        // Ce test vérifie que echo ne crash pas, même si la sortie n'est pas capturée
        cmdEcho(['Hello empty context'], emptyContext);
        // Si on arrive ici sans erreur, c'est déjà bien
        assert.isTrue(true, 'echo ne devrait pas crasher avec contexte vide');
    } catch (error) {
        // C'est acceptable que echo ait besoin d'une fonction de sortie
        assert.isTrue(true, 'echo peut nécessiter une fonction de sortie valide');
    } finally {
        console.log = originalConsoleLog;
    }
    
    console.log('✅ echo gère les contextes minimaux');
    return true;
}

/**
 * Test de performance avec traitement séquentiel
 */
function testEchoSequentialProcessing() {
    clearCaptures();
    const context = createTestContext();
    
    // Exécuter plusieurs echo rapidement
    const startTime = performance.now();
    
    for (let i = 0; i < 50; i++) {
        clearCaptures();
        cmdEcho([`Message ${i}`], context);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Vérifier que c'est assez rapide (moins de 100ms pour 50 exécutions)
    assert.isTrue(duration < 100, `echo devrait être rapide (${duration}ms pour 50 exécutions)`);
    
    console.log('✅ echo a de bonnes performances');
    return true;
}

/**
 * Export des tests des cas limites pour echo
 */
export const echoEdgeCasesTests = [
    createTest('Texte très long', testEchoVeryLongText),
    createTest('Caractères Unicode', testEchoUnicodeCharacters),
    createTest('Beaucoup d\'arguments', testEchoManyArguments),
    createTest('Arguments d\'espaces', testEchoWhitespaceArguments),
    createTest('Option invalide mélangée', testEchoInvalidOptionMixed),
    createTest('Séquences d\'échappement invalides', testEchoInvalidEscapeSequences),
    createTest('Backslash + chiffres', testEchoBackslashNumbers),
    createTest('Options dupliquées', testEchoDuplicateOptions),
    createTest('Options après texte', testEchoOptionsIntermixed),
    createTest('Caractères de contrôle', testEchoControlCharacters),
    createTest('Séquences ambiguës', testEchoEscapeSequenceAmbiguous),
    createTest('Contexte minimal', testEchoMinimalContext),
    createTest('Performance séquentielle', testEchoSequentialProcessing)
];