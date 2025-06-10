// test-cases/specs/commands/echo/options.test.js - Tests des options pour echo
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdEcho } from '../../../../bin/echo.js';

/**
 * Test de l'option -n (pas de nouvelle ligne)
 */
function testEchoOptionN() {
    clearCaptures();
    const context = createTestContext();
    
    // Exécuter echo avec option -n
    cmdEcho(['-n', 'Hello world'], context);
    
    // Vérifier l'affichage
    const captures = getCaptures();
    assert.captureCount(1, 'echo -n devrait capturer 1 ligne');
    assert.equals(captures[0].text, 'Hello world', 'echo -n devrait afficher le texte');
    
    // Note: dans l'implémentation actuelle, la différence avec -n n'est visible
    // que dans le contexte de redirections, mais le texte affiché reste le même
    
    console.log('✅ echo option -n fonctionne');
    return true;
}

/**
 * Test de l'option -n avec texte vide
 */
function testEchoOptionNEmpty() {
    clearCaptures();
    const context = createTestContext();
    
    // Exécuter echo -n sans texte
    cmdEcho(['-n'], context);
    
    // Vérifier l'affichage
    const captures = getCaptures();
    assert.captureCount(1, 'echo -n sans texte devrait capturer 1 ligne');
    assert.equals(captures[0].text, '', 'echo -n sans texte devrait afficher une ligne vide');
    
    console.log('✅ echo -n avec texte vide fonctionne');
    return true;
}

/**
 * Test de l'option -e (interpréter les séquences d'échappement)
 */
function testEchoOptionE() {
    clearCaptures();
    const context = createTestContext();
    
    // Exécuter echo avec option -e et séquences d'échappement
    cmdEcho(['-e', 'Hello\\nworld'], context);
    
    // Vérifier l'affichage
    const captures = getCaptures();
    assert.captureCount(1, 'echo -e devrait capturer 1 ligne');
    
    assert.equals(captures[0].text, 'Hello\nworld\n', 'echo -e devrait interpréter \\n comme nouvelle ligne');
    
    console.log('✅ echo option -e fonctionne');
    return true;
}

/**
 * Test de l'option -E (ne pas interpréter les séquences d'échappement)
 */
function testEchoOptionEUpper() {
    clearCaptures();
    const context = createTestContext();
    
    // Exécuter echo avec option -E
    cmdEcho(['-E', 'Hello\\nworld'], context);
    
    // Vérifier l'affichage
    const captures = getCaptures();
    assert.captureCount(1, 'echo -E devrait capturer 1 ligne');
    assert.equals(captures[0].text, 'Hello\\nworld\n', 'echo -E ne devrait pas interpréter les séquences d\'échappement');
    
    console.log('✅ echo option -E fonctionne');
    return true;
}

/**
 * Test de toutes les séquences d'échappement avec -e
 */
function testEchoEscapeSequences() {
    clearCaptures();
    const context = createTestContext();
    
    // Test de \n (nouvelle ligne)
    clearCaptures();
    cmdEcho(['-e', 'line1\\nline2'], context);
    let captures = getCaptures();
    assert.equals(captures[0].text, 'line1\nline2\n', '\\n devrait être interprété comme nouvelle ligne');
    
    // Test de \t (tabulation)
    clearCaptures();
    cmdEcho(['-e', 'col1\\tcol2'], context);
    captures = getCaptures();
    assert.equals(captures[0].text, 'col1\tcol2\n', '\\t devrait être interprété comme tabulation');
    
    // Test de \r (retour chariot)
    clearCaptures();
    cmdEcho(['-e', 'hello\\rworld'], context);
    captures = getCaptures();
    assert.equals(captures[0].text, 'hello\rworld\n', '\\r devrait être interprété comme retour chariot');
    
    // Test de \b (backspace)
    clearCaptures();
    cmdEcho(['-e', 'hello\\bworld'], context);
    captures = getCaptures();
    assert.equals(captures[0].text, 'hello\bworld\n', '\\b devrait être interprété comme backspace');
    
    // Test de \f (form feed)
    clearCaptures();
    cmdEcho(['-e', 'page1\\fpage2'], context);
    captures = getCaptures();
    assert.equals(captures[0].text, 'page1\fpage2\n', '\\f devrait être interprété comme form feed');
    
    // Test de \v (tabulation verticale)
    clearCaptures();
    cmdEcho(['-e', 'line1\\vline2'], context);
    captures = getCaptures();
    assert.equals(captures[0].text, 'line1\vline2\n', '\\v devrait être interprété comme tabulation verticale');
    
    // Test de \a (alert/bell)
    clearCaptures();
    cmdEcho(['-e', 'bell\\atest'], context);
    captures = getCaptures();
    assert.equals(captures[0].text, 'belltest\n', '\\a devrait être interprété comme alert');
    
    // Test de \\ (backslash littéral)
    clearCaptures();
    cmdEcho(['-e', 'back\\\\slash'], context);
    captures = getCaptures();
    assert.equals(captures[0].text, 'back\\slash\n', '\\\\devrait être interprété comme backslash littéral');
    
    // Test de \0 (caractère null)
    clearCaptures();
    cmdEcho(['-e', 'null\\0char'], context);
    captures = getCaptures();
    assert.equals(captures[0].text, 'nullchar\n', '\\0 devrait être interprété comme caractère null');
    
    console.log('✅ Toutes les séquences d\'échappement fonctionnent');
    return true;
}

/**
 * Test de séquences d'échappement multiples
 */
function testEchoMultipleEscapeSequences() {
    clearCaptures();
    const context = createTestContext();
    
    // Exécuter echo avec plusieurs séquences d'échappement
    cmdEcho(['-e', 'Line1\\nTab\\tCol\\nEnd'], context);
    
    // Vérifier l'affichage
    const captures = getCaptures();
    assert.captureCount(1, 'echo avec plusieurs séquences devrait capturer 1 ligne');
    assert.equals(captures[0].text, 'Line1\nTab\tCol\nEnd\n', 'Plusieurs séquences devraient être interprétées avec newline');
    
    console.log('✅ Séquences d\'échappement multiples fonctionnent');
    return true;
}

/**
 * Test de séquence d'échappement non supportée
 */
function testEchoUnsupportedEscape() {
    clearCaptures();
    const context = createTestContext();
    
    // Exécuter echo avec séquence non supportée
    cmdEcho(['-e', 'test\\xhello'], context);
    
    // Vérifier l'affichage (devrait rester littéral)
    const captures = getCaptures();
    assert.captureCount(1, 'echo avec séquence non supportée devrait capturer 1 ligne');
    assert.equals(captures[0].text, 'test\\'+'x'+'hello\n', 'Séquence non supportée devrait rester littérale');
    
    console.log('✅ Séquence d\'échappement non supportée reste littérale');
    return true;
}

/**
 * Test de options combinées (-ne)
 */
function testEchoCombinedOptionsNE() {
    clearCaptures();
    const context = createTestContext();
    
    // Note: -ne n'est pas une combinaison standard, mais testons le comportement
    // L'implémentation actuelle traite les options séparément
    cmdEcho(['-n', '-e', 'Hello\\nworld'], context);
    
    // Vérifier l'affichage
    const captures = getCaptures();
    assert.captureCount(1, 'echo -n -e devrait capturer 1 ligne');
    assert.equals(captures[0].text, 'Hello\nworld', 'echo -n -e devrait interpréter les séquences');
    
    console.log('✅ Options combinées -n -e fonctionnent');
    return true;
}

/**
 * Test de options combinées (-nE)
 */
function testEchoCombinedOptionsNEUpper() {
    clearCaptures();
    const context = createTestContext();
    
    // Tester -n avec -E
    cmdEcho(['-n', '-E', 'Hello\\nworld'], context);
    
    // Vérifier l'affichage
    const captures = getCaptures();
    assert.captureCount(1, 'echo -n -E devrait capturer 1 ligne');
    assert.equals(captures[0].text, 'Hello\\nworld', 'echo -n -E ne devrait pas interpréter les séquences');
    
    console.log('✅ Options combinées -n -E fonctionnent');
    return true;
}

/**
 * Test de priorité des options -e vs -E
 */
function testEchoOptionsEPriority() {
    clearCaptures();
    const context = createTestContext();
    
    // Tester -e puis -E (dernière option devrait gagner)
    cmdEcho(['-e', '-E', 'Hello\\nworld'], context);
    
    // Vérifier l'affichage
    const captures = getCaptures();
    assert.captureCount(1, 'echo -e -E devrait capturer 1 ligne');
    assert.equals(captures[0].text, 'Hello\\nworld\n', '-E après -e devrait désactiver l\'interprétation');
    
    // Tester -E puis -e (dernière option devrait gagner)
    clearCaptures();
    cmdEcho(['-E', '-e', 'Hello\\nworld'], context);
    
    const captures2 = getCaptures();
    assert.captureCount(1, 'echo -E -e devrait capturer 1 ligne');
    assert.equals(captures2[0].text, 'Hello\nworld\n', '-e après -E devrait activer l\'interprétation');
    
    console.log('✅ Priorité des options -e/-E fonctionne');
    return true;
}

/**
 * Test avec option et pas de texte
 */
function testEchoOptionWithoutText() {
    clearCaptures();
    const context = createTestContext();
    
    // Tester -e sans texte
    cmdEcho(['-e'], context);
    
    // Vérifier l'affichage
    const captures = getCaptures();
    assert.captureCount(1, 'echo -e sans texte devrait capturer 1 ligne');
    assert.equals(captures[0].text, '\n', 'echo -e sans texte devrait afficher une ligne vide');
    
    console.log('✅ echo avec option mais sans texte fonctionne');
    return true;
}

/**
 * Test avec option invalide (devrait être traitée comme texte)
 */
function testEchoInvalidOption() {
    clearCaptures();
    const context = createTestContext();
    
    // Tester avec option invalide
    cmdEcho(['-x', 'Hello'], context);
    
    // Vérifier l'affichage (option invalide devrait être traitée comme texte)
    const captures = getCaptures();
    assert.captureCount(1, 'echo avec option invalide devrait capturer 1 ligne');
    assert.equals(captures[0].text, '-x Hello\n', 'Option invalide devrait être traitée comme texte');
    
    console.log('✅ echo avec option invalide traite l\'option comme texte');
    return true;
}

/**
 * Test de backslash en fin de chaîne avec -e
 */
function testEchoBackslashAtEnd() {
    clearCaptures();
    const context = createTestContext();
    
    // Tester backslash isolé en fin
    cmdEcho(['-e', 'Hello\\'], context);
    
    // Vérifier l'affichage
    const captures = getCaptures();
    assert.captureCount(1, 'echo avec backslash en fin devrait capturer 1 ligne');
    assert.equals(captures[0].text, 'Hello\\\n', 'Backslash isolé en fin devrait rester littéral');
    
    console.log('✅ Backslash isolé en fin reste littéral');
    return true;
}

/**
 * Test de séquences consécutives
 */
function testEchoConsecutiveEscapes() {
    clearCaptures();
    const context = createTestContext();
    
    // Tester séquences consécutives
    cmdEcho(['-e', 'test\\n\\n\\tindented'], context);
    
    // Vérifier l'affichage
    const captures = getCaptures();
    assert.captureCount(1, 'echo avec séquences consécutives devrait capturer 1 ligne');
    assert.equals(captures[0].text, 'test\n\n\tindented\n', 'Séquences consécutives devraient être interprétées');
    
    console.log('✅ Séquences d\'échappement consécutives fonctionnent');
    return true;
}

/**
 * Export des tests des options pour echo
 */
export const echoOptionsTests = [
    createTest('Option -n (pas de nouvelle ligne)', testEchoOptionN),
    createTest('Option -n avec texte vide', testEchoOptionNEmpty),
    createTest('Option -e (interpréter échappements)', testEchoOptionE),
    createTest('Option -E (ne pas interpréter)', testEchoOptionEUpper),
    createTest('Toutes les séquences d\'échappement', testEchoEscapeSequences),
    createTest('Séquences d\'échappement multiples', testEchoMultipleEscapeSequences),
    createTest('Séquence non supportée', testEchoUnsupportedEscape),
    createTest('Options combinées -n -e', testEchoCombinedOptionsNE),
    createTest('Options combinées -n -E', testEchoCombinedOptionsNEUpper),
    createTest('Priorité options -e/-E', testEchoOptionsEPriority),
    createTest('Option sans texte', testEchoOptionWithoutText),
    createTest('Option invalide', testEchoInvalidOption),
    createTest('Backslash en fin de chaîne', testEchoBackslashAtEnd),
    createTest('Séquences consécutives', testEchoConsecutiveEscapes)
];