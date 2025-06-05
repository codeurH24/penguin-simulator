// test-cases/commands/ls/options.test.js - Tests des options pour ls
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdLs } from '../../../../bin/ls.js';

/**
 * Test de l'option -l (format long)
 */
function testLongFormat() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer du contenu de test
    testUtils.createTestFile(context, '/root/test.txt', 'hello world');
    testUtils.createTestDirectory(context, '/root/mydir');
    
    // Exécuter ls -l
    cmdLs(['-l'], context);
    
    const captures = getCaptures();
    
    // Vérifier qu'on a au moins 2 lignes : la ligne "total" + les fichiers
    assert.isTrue(captures.length >= 2, 'ls -l devrait afficher au moins 2 lignes');
    
    // Vérifier la présence de la ligne "total"
    const hasTotalLine = captures.some(capture => 
        capture.text.startsWith('total') && capture.className === 'info'
    );
    assert.isTrue(hasTotalLine, 'ls -l devrait afficher une ligne "total"');
    
    // Vérifier le format des permissions
    const hasPermissions = captures.some(capture => 
        capture.text.match(/^[d-]rwxr-xr-x/) // Format des permissions Unix
    );
    assert.isTrue(hasPermissions, 'ls -l devrait afficher les permissions');
    
    // Vérifier la présence des métadonnées (owner, taille, date)
    const hasMetadata = captures.some(capture => 
        capture.text.includes('root') && // owner
        capture.text.match(/\d+/) && // taille ou liens
        capture.text.match(/\w{3}\s+\d+\s+\d{2}:\d{2}/) // format date
    );
    assert.isTrue(hasMetadata, 'ls -l devrait afficher les métadonnées complètes');
    
    console.log('✅ Option -l (format long) fonctionne');
    return true;
}

/**
 * Test de l'option -a (afficher tous les fichiers, y compris cachés)
 */
function testShowAllOption() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer des fichiers normaux et cachés
    testUtils.createTestFile(context, '/root/visible.txt', 'visible');
    testUtils.createTestFile(context, '/root/.hidden', 'caché');
    testUtils.createTestDirectory(context, '/root/.hiddendir');
    
    // Exécuter ls -a
    cmdLs(['-a'], context);
    
    const captures = getCaptures();
    const outputText = captures.map(c => c.text).join(' ');
    
    // Vérifier la présence des entrées spéciales . et ..
    assert.isTrue(outputText.includes('./'), '. devrait apparaître avec -a');
    assert.isTrue(outputText.includes('../'), '.. devrait apparaître avec -a');
    
    // Vérifier la présence des fichiers cachés
    assert.isTrue(outputText.includes('.hidden'), '.hidden devrait apparaître avec -a');
    assert.isTrue(outputText.includes('.hiddendir/'), '.hiddendir/ devrait apparaître avec -a');
    
    // Vérifier la présence des fichiers visibles
    assert.isTrue(outputText.includes('visible.txt'), 'visible.txt devrait toujours apparaître');
    
    console.log('✅ Option -a (fichiers cachés) fonctionne');
    return true;
}

/**
 * Test de ls sans -a (ne devrait pas montrer les fichiers cachés)
 */
function testWithoutShowAll() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer des fichiers normaux et cachés
    testUtils.createTestFile(context, '/root/visible.txt', 'visible');
    testUtils.createTestFile(context, '/root/.hidden', 'caché');
    testUtils.createTestDirectory(context, '/root/.hiddendir');
    
    // Exécuter ls sans -a
    cmdLs([], context);
    
    const captures = getCaptures();
    const outputText = captures.map(c => c.text).join(' ');
    
    // Vérifier l'absence des fichiers cachés
    assert.isFalse(outputText.includes('.hidden'), '.hidden ne devrait pas apparaître sans -a');
    assert.isFalse(outputText.includes('.hiddendir'), '.hiddendir ne devrait pas apparaître sans -a');
    assert.isFalse(outputText.includes('./'), '. ne devrait pas apparaître sans -a');
    assert.isFalse(outputText.includes('../'), '.. ne devrait pas apparaître sans -a');
    
    // Vérifier la présence des fichiers visibles
    assert.isTrue(outputText.includes('visible.txt'), 'visible.txt devrait toujours apparaître');
    
    console.log('✅ ls sans -a cache correctement les fichiers cachés');
    return true;
}

/**
 * Test de l'option -h (tailles human-readable)
 */
function testHumanReadable() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un fichier avec une taille notable
    const largeContent = 'x'.repeat(2048); // 2KB
    testUtils.createTestFile(context, '/root/largefile.txt', largeContent);
    
    // Mettre à jour la taille dans le système de fichiers
    context.fileSystem['/root/largefile.txt'].size = largeContent.length;
    
    // Exécuter ls -lh
    cmdLs(['-l', '-h'], context);
    
    const captures = getCaptures();
    const outputText = captures.map(c => c.text).join(' ');
    
    // Vérifier la présence d'unités human-readable (K, M, G)
    const hasHumanSize = outputText.match(/\d+(\.\d+)?[KMG]/);
    
    // Note: pour un fichier de 2KB, on s'attend à voir "2K" ou "2.0K"
    assert.isTrue(hasHumanSize !== null, 'ls -h devrait afficher les tailles en format human-readable');
    
    console.log('✅ Option -h (human-readable) fonctionne');
    return true;
}

/**
 * Test de combinaisons d'options (-la, -lah, etc.)
 */
function testCombinedOptions() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer du contenu mixte
    testUtils.createTestFile(context, '/root/file.txt', 'contenu');
    testUtils.createTestFile(context, '/root/.hidden', 'secret');
    testUtils.createTestDirectory(context, '/root/dir');
    
    // Tester -la (format long + fichiers cachés)
    clearCaptures();
    cmdLs(['-l', '-a'], context);
    
    let captures = getCaptures();
    let outputText = captures.map(c => c.text).join(' ');
    
    // Devrait avoir le format long ET les fichiers cachés
    assert.isTrue(outputText.includes('total'), '-la devrait inclure la ligne total');
    assert.isTrue(outputText.includes('./'), '-la devrait montrer .');
    assert.isTrue(outputText.includes('.hidden'), '-la devrait montrer .hidden');
    
    // Tester les options combinées en un seul argument
    clearCaptures();
    cmdLs(['-la'], context);
    
    captures = getCaptures();
    outputText = captures.map(c => c.text).join(' ');
    
    assert.isTrue(outputText.includes('total'), '-la (combiné) devrait inclure la ligne total');
    assert.isTrue(outputText.includes('./'), '-la (combiné) devrait montrer .');
    
    console.log('✅ Combinaisons d\'options fonctionnent');
    return true;
}

/**
 * Test de vérification des classes CSS pour les couleurs
 */
function testDirectoryHighlighting() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un mélange de fichiers et dossiers
    testUtils.createTestFile(context, '/root/file.txt', 'contenu');
    testUtils.createTestDirectory(context, '/root/directory');
    
    // Exécuter ls -l pour avoir les détails
    cmdLs(['-l'], context);
    
    const captures = getCaptures();
    
    // Vérifier qu'il y a des captures avec la classe 'directory' pour les dossiers
    const hasDirectoryClass = captures.some(capture => 
        capture.className === 'directory' && 
        capture.text.includes('directory/')
    );
    
    assert.isTrue(hasDirectoryClass, 'Les dossiers devraient avoir la classe CSS "directory"');
    
    console.log('✅ Coloration des dossiers fonctionne');
    return true;
}

/**
 * Test du calcul du total en mode -l
 */
function testTotalCalculation() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer plusieurs fichiers avec des tailles différentes
    testUtils.createTestFile(context, '/root/small.txt', 'abc'); // 3 bytes
    testUtils.createTestFile(context, '/root/medium.txt', 'x'.repeat(1024)); // 1KB
    
    // Mettre à jour les tailles
    context.fileSystem['/root/small.txt'].size = 3;
    context.fileSystem['/root/medium.txt'].size = 1024;
    
    // Exécuter ls -l
    cmdLs(['-l'], context);
    
    const captures = getCaptures();
    
    // Trouver la ligne total
    const totalLine = captures.find(capture => 
        capture.text.startsWith('total') && capture.className === 'info'
    );
    
    assert.isTrue(totalLine !== undefined, 'Une ligne total devrait être présente');
    
    // Le total devrait être > 0 (en blocs de 1K)
    const totalMatch = totalLine.text.match(/total (\d+)/);
    assert.isTrue(totalMatch !== null, 'Le total devrait avoir un format numérique');
    
    const totalBlocks = parseInt(totalMatch[1]);
    assert.isTrue(totalBlocks > 0, 'Le total devrait être supérieur à 0');
    
    console.log('✅ Calcul du total fonctionne');
    return true;
}

/**
 * Export des tests des options pour ls
 */
export const lsOptionsTests = [
    createTest('Option -l (format long)', testLongFormat),
    createTest('Option -a (fichiers cachés)', testShowAllOption),
    createTest('Sans -a (masquer fichiers cachés)', testWithoutShowAll),
    createTest('Option -h (human-readable)', testHumanReadable),
    createTest('Combinaisons d\'options', testCombinedOptions),
    createTest('Coloration des dossiers', testDirectoryHighlighting),
    createTest('Calcul du total', testTotalCalculation)
];