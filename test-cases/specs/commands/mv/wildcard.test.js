// test-cases/specs/commands/mv/wildcard.test.js
// Tests spécialisés pour les wildcards avec la commande mv

import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdMv } from '../../../../bin/mv/mv.js';
import { cmdMkdir } from '../../../../bin/mkdir/mkdir.js';

/**
 * Fonction utilitaire pour créer une structure de fichiers de test avec extensions variées
 * Cette fonction prépare un environnement contrôlé pour tester les patterns de wildcards
 */
function createTestFilesWithExtensions(context) {
    // Fichiers avec extensions diverses pour tester *.*
    testUtils.createTestFile(context, '/root/document.txt', 'contenu document');
    testUtils.createTestFile(context, '/root/image.png', 'contenu image');
    testUtils.createTestFile(context, '/root/script.js', 'contenu script');
    testUtils.createTestFile(context, '/root/data.json', 'contenu data');
    
    // Fichiers .text spécifiques pour tester *.text
    testUtils.createTestFile(context, '/root/readme.text', 'contenu readme');
    testUtils.createTestFile(context, '/root/notes.text', 'contenu notes');
    testUtils.createTestFile(context, '/root/manual.text', 'contenu manual');
    
    // Fichiers cachés pour tester .**
    testUtils.createTestFile(context, '/root/.bashrc', 'contenu bashrc');
    testUtils.createTestFile(context, '/root/.profile', 'contenu profile');
    testUtils.createTestFile(context, '/root/.hidden', 'contenu hidden');
    
    // Fichiers sans extension pour vérifier que les patterns ne les affectent pas
    testUtils.createTestFile(context, '/root/README', 'contenu readme sans extension');
    testUtils.createTestFile(context, '/root/makefile', 'contenu makefile');
    
    // Créer un répertoire de destination pour les tests
    cmdMkdir(['destination-dir'], context);
}

/**
 * Test 1: mv *.* vers un répertoire (cas de succès)
 * Ce test vérifie le comportement normal quand plusieurs fichiers avec extension
 * sont déplacés vers un répertoire existant
 */
function testWildcardAllExtensionsToDirectory() {
    console.log('🧪 TEST WILDCARD: mv *.* vers répertoire');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer notre structure de test
    createTestFilesWithExtensions(context);
    
    // Vérifier que nos fichiers avec extension existent bien
    assert.fileExists(context, '/root/document.txt', 'document.txt devrait exister');
    assert.fileExists(context, '/root/image.png', 'image.png devrait exister');
    assert.fileExists(context, '/root/script.js', 'script.js devrait exister');
    assert.fileExists(context, '/root/data.json', 'data.json devrait exister');
    assert.fileExists(context, '/root/destination-dir', 'Le répertoire de destination devrait exister');
    
    // Effectuer le déplacement avec wildcard
    // Note: En réalité, c'est le shell qui expanse les wildcards avant de passer les arguments à mv
    // Nous simulons donc ce comportement en passant la liste expandée
    cmdMv(['document.txt', 'image.png', 'script.js', 'data.json', 'destination-dir'], context);
    
    // Vérifier que tous les fichiers ont été déplacés dans le répertoire
    assert.fileExists(context, '/root/destination-dir/document.txt', 'document.txt devrait être dans destination-dir');
    assert.fileExists(context, '/root/destination-dir/image.png', 'image.png devrait être dans destination-dir');
    assert.fileExists(context, '/root/destination-dir/script.js', 'script.js devrait être dans destination-dir');
    assert.fileExists(context, '/root/destination-dir/data.json', 'data.json devrait être dans destination-dir');
    
    // Vérifier que les fichiers originaux n'existent plus
    assert.fileNotExists(context, '/root/document.txt', 'document.txt ne devrait plus exister à la racine');
    assert.fileNotExists(context, '/root/image.png', 'image.png ne devrait plus exister à la racine');
    assert.fileNotExists(context, '/root/script.js', 'script.js ne devrait plus exister à la racine');
    assert.fileNotExists(context, '/root/data.json', 'data.json ne devrait plus exister à la racine');
    
    // Vérifier que les fichiers sans extension et cachés ne sont pas affectés
    assert.fileExists(context, '/root/README', 'README devrait toujours exister');
    assert.fileExists(context, '/root/.bashrc', '.bashrc devrait toujours exister');
    
    console.log('✅ Wildcard *.* vers répertoire fonctionne');
    return true;
}

/**
 * Test 2: mv *.text vers un répertoire (pattern spécifique)
 * Ce test vérifie qu'un pattern plus spécifique ne déplace que les fichiers correspondants
 */
function testWildcardSpecificExtensionToDirectory() {
    console.log('🧪 TEST WILDCARD: mv *.text vers répertoire');
    
    clearCaptures();
    const context = createTestContext();
    
    createTestFilesWithExtensions(context);
    
    // Vérifier que nos fichiers .text existent
    assert.fileExists(context, '/root/readme.text', 'readme.text devrait exister');
    assert.fileExists(context, '/root/notes.text', 'notes.text devrait exister');
    assert.fileExists(context, '/root/manual.text', 'manual.text devrait exister');
    
    // Déplacer seulement les fichiers .text (simulation de l'expansion du shell)
    cmdMv(['readme.text', 'notes.text', 'manual.text', 'destination-dir'], context);
    
    // Vérifier que seuls les fichiers .text ont été déplacés
    assert.fileExists(context, '/root/destination-dir/readme.text', 'readme.text devrait être déplacé');
    assert.fileExists(context, '/root/destination-dir/notes.text', 'notes.text devrait être déplacé');
    assert.fileExists(context, '/root/destination-dir/manual.text', 'manual.text devrait être déplacé');
    
    // Vérifier que les autres fichiers ne sont pas affectés
    assert.fileExists(context, '/root/document.txt', 'document.txt ne devrait pas être déplacé');
    assert.fileExists(context, '/root/image.png', 'image.png ne devrait pas être déplacé');
    assert.fileExists(context, '/root/.bashrc', '.bashrc ne devrait pas être déplacé');
    
    console.log('✅ Wildcard *.text vers répertoire fonctionne');
    return true;
}

/**
 * Test 3: mv .** vers un répertoire (fichiers cachés)
 * Ce test vérifie le déplacement des fichiers cachés (commençant par un point)
 */
function testWildcardHiddenFilesToDirectory() {
    console.log('🧪 TEST WILDCARD: mv .** vers répertoire');
    
    clearCaptures();
    const context = createTestContext();
    
    createTestFilesWithExtensions(context);
    
    // Vérifier que nos fichiers cachés existent
    assert.fileExists(context, '/root/.bashrc', '.bashrc devrait exister');
    assert.fileExists(context, '/root/.profile', '.profile devrait exister');
    assert.fileExists(context, '/root/.hidden', '.hidden devrait exister');
    
    // Déplacer les fichiers cachés (simulation de l'expansion .*)
    cmdMv(['.bashrc', '.profile', '.hidden', 'destination-dir'], context);
    
    // Vérifier que les fichiers cachés ont été déplacés
    assert.fileExists(context, '/root/destination-dir/.bashrc', '.bashrc devrait être déplacé');
    assert.fileExists(context, '/root/destination-dir/.profile', '.profile devrait être déplacé');
    assert.fileExists(context, '/root/destination-dir/.hidden', '.hidden devrait être déplacé');
    
    // Vérifier que les fichiers non-cachés ne sont pas affectés
    assert.fileExists(context, '/root/document.txt', 'document.txt ne devrait pas être déplacé');
    assert.fileExists(context, '/root/README', 'README ne devrait pas être déplacé');
    
    console.log('✅ Wildcard .** vers répertoire fonctionne');
    return true;
}

/**
 * Test 4: mv *.* vers un fichier (cas d'erreur)
 * Ce test vérifie que mv refuse de déplacer plusieurs fichiers vers une destination
 * qui n'est pas un répertoire
 */
function testWildcardMultipleFilesToNonDirectory() {
    console.log('🧪 TEST WILDCARD: mv *.* vers fichier (erreur attendue)');
    
    clearCaptures();
    const context = createTestContext();
    
    createTestFilesWithExtensions(context);
    
    // Créer un fichier cible (pas un répertoire)
    testUtils.createTestFile(context, '/root/target-file.txt', 'fichier cible');
    
    // Tenter de déplacer plusieurs fichiers vers un fichier unique
    // En pratique, mv devrait refuser cette opération
    cmdMv(['document.txt', 'image.png', 'target-file.txt'], context);
    
    // Vérifier qu'une erreur a été générée
    const captures = getCaptures();
    const hasError = captures.some(capture => 
        capture.className === 'error' && 
        (capture.text.includes('destination doit être un répertoire') ||
         capture.text.includes('target is not a directory'))
    );
    
    assert.isTrue(hasError, 'Une erreur devrait être générée pour déplacement multiple vers non-répertoire');
    
    // Vérifier que les fichiers sources n'ont pas été modifiés
    assert.fileExists(context, '/root/document.txt', 'document.txt devrait toujours exister');
    assert.fileExists(context, '/root/image.png', 'image.png devrait toujours exister');
    
    console.log('✅ Erreur correcte pour wildcard vers non-répertoire');
    return true;
}

/**
 * Test 5: mv avec un seul fichier correspondant au wildcard
 * Ce test vérifie que si le wildcard ne correspond qu'à un seul fichier,
 * mv fonctionne normalement (renommage/déplacement simple)
 */
function testWildcardSingleFileMatch() {
    console.log('🧪 TEST WILDCARD: un seul fichier correspondant');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer un seul fichier .unique pour tester
    testUtils.createTestFile(context, '/root/special.unique', 'contenu spécial');
    
    // Le pattern *.unique ne devrait correspondre qu'à ce fichier
    cmdMv(['special.unique', 'renamed-special.unique'], context);
    
    // Vérifier le renommage réussi
    assert.fileNotExists(context, '/root/special.unique', 'Le fichier original ne devrait plus exister');
    assert.fileExists(context, '/root/renamed-special.unique', 'Le fichier renommé devrait exister');
    
    const renamedFile = context.fileSystem['/root/renamed-special.unique'];
    assert.equals(renamedFile.content, 'contenu spécial', 'Le contenu devrait être préservé');
    
    console.log('✅ Wildcard avec un seul match fonctionne');
    return true;
}

/**
 * Test 6: mv avec wildcard ne correspondant à aucun fichier
 * Ce test vérifie le comportement quand le pattern ne trouve aucun fichier
 */
function testWildcardNoMatch() {
    console.log('🧪 TEST WILDCARD: aucun fichier correspondant');
    
    clearCaptures();
    const context = createTestContext();
    
    createTestFilesWithExtensions(context);
    
    // Tenter d'utiliser un pattern qui ne correspond à rien
    cmdMv(['*.nonexistent', 'destination'], context);
    
    // Vérifier qu'une erreur appropriée est générée
    const captures = getCaptures();
    const hasError = captures.some(capture => 
        capture.className === 'error' && 
        (capture.text.includes('Fichier ou dossier introuvable') ||
         capture.text.includes('no such file'))
    );
    
    assert.isTrue(hasError, 'Une erreur devrait être générée pour pattern sans correspondance');
    
    console.log('✅ Erreur correcte pour wildcard sans correspondance');
    return true;
}

/**
 * Export des tests de wildcards pour mv
 */
export const mvWildcardTests = [
    createTest('mv *.* vers répertoire', testWildcardAllExtensionsToDirectory),
    createTest('mv *.text vers répertoire', testWildcardSpecificExtensionToDirectory),
    createTest('mv .** vers répertoire', testWildcardHiddenFilesToDirectory),
    createTest('mv *.* vers fichier (erreur)', testWildcardMultipleFilesToNonDirectory),
    createTest('mv wildcard un seul match', testWildcardSingleFileMatch),
    createTest('mv wildcard aucun match', testWildcardNoMatch)
];