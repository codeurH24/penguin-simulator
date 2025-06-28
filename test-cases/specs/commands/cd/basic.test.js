// test-cases/specs/commands/cd/basic.test.js - Tests de base pour cd
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdCd } from '../../../../lib/bash-builtins.js';
import { cmdMkdir } from '../../../../bin/mkdir/mkdir.js';
import { cmdTouch } from '../../../../bin/touch.js';

/**
 * Vérifie si une erreur correspond aux messages d'erreur attendus de cd
 * @param {Array} captures - Messages capturés
 * @param {string} expectedType - Type d'erreur attendu
 * @returns {boolean} - true si l'erreur correspond
 */
function hasExpectedError(captures, expectedType) {
    return captures.some(capture => {
        if (capture.className !== 'error') return false;
        
        const text = capture.text.toLowerCase();
        
        switch (expectedType) {
            case 'not_found':
                return text.includes('dossier introuvable') ||
                       text.includes('no such file or directory');
                       
            case 'not_directory':
                return text.includes('n\'est pas un dossier') ||
                       text.includes('not a directory');
                       
            default:
                return false;
        }
    });
}

/**
 * Test de cd sans argument (retour au home)
 */
function testCdNoArguments() {
    clearCaptures();
    const context = createTestContext();
    
    // Vérifier qu'on démarre bien dans /root (contexte isolé)
    assert.equals(context.getCurrentPath(), '/root', 'Devrait démarrer dans /root');
    
    // Créer un dossier de test avec mkdir
    cmdMkdir(['testdir'], context);
    
    // Vérifier que le dossier a été créé
    assert.fileExists(context, '/root/testdir', 'Le dossier testdir devrait être créé');
    assert.isDirectory(context, '/root/testdir', 'testdir devrait être un dossier');
    
    // Aller dans le dossier avec cd
    clearCaptures();
    cmdCd(['testdir'], context);
    
    // Vérifier qu'on est bien dans testdir
    assert.equals(context.getCurrentPath(), '/root/testdir', 'Devrait être dans /root/testdir après cd');
    
    // Exécuter cd sans argument pour retourner au home
    clearCaptures();
    cmdCd([], context);
    
    // Vérifier qu'on est retourné au home (/root)
    assert.equals(context.getCurrentPath(), '/root', 'cd sans argument devrait retourner au home');
    
    console.log('✅ cd sans argument retourne au home');
    return true;
}

/**
 * Test de cd vers un dossier existant
 */
function testCdToExistingDirectory() {
    clearCaptures();
    const context = createTestContext();
    
    // Vérifier qu'on démarre dans /root
    assert.equals(context.getCurrentPath(), '/root', 'Devrait démarrer dans /root');
    
    // Créer un dossier avec mkdir
    cmdMkdir(['existing-dir'], context);
    
    // Vérifier que le dossier a été créé
    assert.fileExists(context, '/root/existing-dir', 'Le dossier devrait être créé');
    assert.isDirectory(context, '/root/existing-dir', 'existing-dir devrait être un dossier');
    
    // Aller dans le dossier avec cd
    clearCaptures();
    cmdCd(['existing-dir'], context);
    
    // Vérifier qu'on est dans le bon dossier
    assert.equals(context.getCurrentPath(), '/root/existing-dir', 'Devrait être dans /root/existing-dir');
    
    console.log('✅ cd vers dossier existant fonctionne');
    return true;
}

/**
 * Test d'erreur : cd vers un dossier inexistant
 */
function testCdToNonexistentDirectory() {
    clearCaptures();
    const context = createTestContext();
    
    // Vérifier qu'on démarre dans /root
    assert.equals(context.getCurrentPath(), '/root', 'Devrait démarrer dans /root');
    
    const originalPath = context.getCurrentPath();
    
    // Essayer d'aller dans un dossier inexistant
    cmdCd(['nonexistent-dir'], context);
    
    // Vérifier qu'une erreur a été capturée
    const captures = getCaptures();
    const hasError = hasExpectedError(captures, 'not_found');
    
    assert.isTrue(hasError, 'Une erreur devrait être affichée pour un dossier inexistant');
    
    // Le répertoire courant ne devrait pas avoir changé
    assert.equals(context.getCurrentPath(), originalPath, 'Le répertoire courant ne devrait pas changer en cas d\'erreur');
    
    console.log('✅ Erreur correcte pour dossier inexistant');
    return true;
}

/**
 * Test d'erreur : cd vers un fichier au lieu d'un dossier
 */
function testCdToFileInsteadOfDirectory() {
    clearCaptures();
    const context = createTestContext();
    
    // Vérifier qu'on démarre dans /root
    assert.equals(context.getCurrentPath(), '/root', 'Devrait démarrer dans /root');
    
    // Créer un fichier avec touch
    cmdTouch(['not-a-dir.txt'], context);
    assert.fileExists(context, '/root/not-a-dir.txt', 'Le fichier devrait être créé');
    assert.isFile(context, '/root/not-a-dir.txt', 'not-a-dir.txt devrait être un fichier');
    
    const originalPath = context.getCurrentPath();
    
    // Essayer d'aller "dans" le fichier
    clearCaptures();
    cmdCd(['not-a-dir.txt'], context);
    
    // Vérifier qu'une erreur a été capturée
    const captures = getCaptures();
    const hasError = hasExpectedError(captures, 'not_directory');
    
    assert.isTrue(hasError, 'Une erreur devrait être affichée pour un fichier');
    
    // Le répertoire courant ne devrait pas avoir changé
    assert.equals(context.getCurrentPath(), originalPath, 'Le répertoire courant ne devrait pas changer en cas d\'erreur');
    
    console.log('✅ Erreur correcte pour fichier au lieu de dossier');
    return true;
}

/**
 * Test de cd ~ (alias pour home)
 */
function testCdTildeHome() {
    clearCaptures();
    const context = createTestContext();
    
    // Vérifier qu'on démarre dans /root
    assert.equals(context.getCurrentPath(), '/root', 'Devrait démarrer dans /root');
    
    // Créer un dossier et y aller
    cmdMkdir(['subdir'], context);
    clearCaptures();
    cmdCd(['subdir'], context);
    assert.equals(context.getCurrentPath(), '/root/subdir', 'Devrait être dans /root/subdir');
    
    // Aller au home avec ~
    clearCaptures();
    cmdCd(['~'], context);
    
    // Vérifier qu'on est au home
    assert.equals(context.getCurrentPath(), '/root', 'cd ~ devrait aller au home');
    
    console.log('✅ cd ~ fonctionne');
    return true;
}

/**
 * Test de cd ~/subdir
 */
function testCdTildeSubdirectory() {
    clearCaptures();
    const context = createTestContext();
    
    // Vérifier qu'on démarre dans /root
    assert.equals(context.getCurrentPath(), '/root', 'Devrait démarrer dans /root');
    
    // Créer un sous-dossier dans le home avec mkdir
    cmdMkdir(['home-subdir'], context);
    assert.fileExists(context, '/root/home-subdir', 'home-subdir devrait être créé');
    
    // Créer un autre dossier et y aller
    cmdMkdir(['other'], context);
    clearCaptures();
    cmdCd(['other'], context);
    assert.equals(context.getCurrentPath(), '/root/other', 'Devrait être dans /root/other');
    
    // Aller dans le sous-dossier du home avec ~/
    clearCaptures();
    cmdCd(['~/home-subdir'], context);
    
    // Vérifier qu'on est dans le bon dossier
    assert.equals(context.getCurrentPath(), '/root/home-subdir', 'cd ~/subdir devrait fonctionner');
    
    console.log('✅ cd ~/subdir fonctionne');
    return true;
}

/**
 * Test de cd - (retour au répertoire précédent)
 */
function testCdDashPrevious() {
    clearCaptures();
    const context = createTestContext();
    
    // Vérifier qu'on démarre dans /root
    assert.equals(context.getCurrentPath(), '/root', 'Devrait démarrer dans /root');
    
    // Créer deux dossiers avec mkdir
    cmdMkdir(['dir1'], context);
    cmdMkdir(['dir2'], context);
    
    // Vérifier que les dossiers ont été créés
    assert.fileExists(context, '/root/dir1', 'dir1 devrait être créé');
    assert.fileExists(context, '/root/dir2', 'dir2 devrait être créé');
    
    // Aller dans dir1
    clearCaptures();
    cmdCd(['dir1'], context);
    assert.equals(context.getCurrentPath(), '/root/dir1', 'Devrait être dans dir1');
    
    // Aller dans dir2 (depuis dir1, il faut remonter puis descendre)
    clearCaptures();
    cmdCd(['../dir2'], context);
    assert.equals(context.getCurrentPath(), '/root/dir2', 'Devrait être dans dir2');
    
    // Retourner au répertoire précédent avec cd -
    clearCaptures();
    cmdCd(['-'], context);
    
    // Vérifier qu'on est retourné dans dir1
    assert.equals(context.getCurrentPath(), '/root/dir1', 'cd - devrait retourner dans dir1');
    
    // Vérifier que le répertoire précédent a été affiché (comportement bash)
    const captures = getCaptures();
    const hasPathOutput = captures.some(capture => capture.text.includes('/root/dir1'));
    assert.isTrue(hasPathOutput, 'cd - devrait afficher le nouveau répertoire');
    
    console.log('✅ cd - fonctionne');
    return true;
}

/**
 * Test de cd avec chemin absolu
 */
function testCdAbsolutePath() {
    clearCaptures();
    const context = createTestContext();
    
    // Vérifier qu'on démarre dans /root
    assert.equals(context.getCurrentPath(), '/root', 'Devrait démarrer dans /root');
    
    // Créer un dossier avec mkdir
    cmdMkdir(['absolute-test'], context);
    assert.fileExists(context, '/root/absolute-test', 'absolute-test devrait être créé');
    
    // Y aller avec chemin absolu
    clearCaptures();
    cmdCd(['/root/absolute-test'], context);
    
    // Vérifier qu'on est dans le bon dossier
    assert.equals(context.getCurrentPath(), '/root/absolute-test', 'cd avec chemin absolu devrait fonctionner');
    
    console.log('✅ cd avec chemin absolu fonctionne');
    return true;
}

/**
 * Test de cd avec chemin relatif complexe
 */
function testCdRelativePathComplex() {
    clearCaptures();
    const context = createTestContext();
    
    // Vérifier qu'on démarre dans /root
    assert.equals(context.getCurrentPath(), '/root', 'Devrait démarrer dans /root');
    
    // Créer une structure de dossiers avec mkdir -p
    cmdMkdir(['-p', 'parent/child/grandchild'], context);
    
    // Vérifier que la structure a été créée
    assert.fileExists(context, '/root/parent', 'parent devrait être créé');
    assert.fileExists(context, '/root/parent/child', 'child devrait être créé');
    assert.fileExists(context, '/root/parent/child/grandchild', 'grandchild devrait être créé');
    
    // Aller dans parent
    clearCaptures();
    cmdCd(['parent'], context);
    assert.equals(context.getCurrentPath(), '/root/parent', 'Devrait être dans parent');
    
    // Aller dans child/grandchild avec chemin relatif
    clearCaptures();
    cmdCd(['child/grandchild'], context);
    assert.equals(context.getCurrentPath(), '/root/parent/child/grandchild', 'Devrait être dans grandchild');
    
    // Remonter avec ../..
    clearCaptures();
    cmdCd(['../..'], context);
    assert.equals(context.getCurrentPath(), '/root/parent', 'Devrait être retourné dans parent');
    
    console.log('✅ cd avec chemins relatifs complexes fonctionne');
    return true;
}

/**
 * Test de mise à jour de OLDPWD
 */
function testOldPwdUpdate() {
    clearCaptures();
    const context = createTestContext();
    
    // S'assurer que les variables existent
    if (!context.variables) {
        context.variables = {};
    }
    
    // Vérifier qu'on démarre dans /root
    const initialPath = context.getCurrentPath();
    assert.equals(initialPath, '/root', 'Devrait démarrer dans /root');
    
    // Créer un dossier et y aller
    cmdMkdir(['test-oldpwd'], context);
    clearCaptures();
    cmdCd(['test-oldpwd'], context);
    
    // Vérifier que OLDPWD a été mis à jour
    assert.equals(context.variables.OLDPWD, initialPath, 'OLDPWD devrait contenir l\'ancien répertoire');
    
    // Aller ailleurs (retour au parent)
    clearCaptures();
    cmdCd(['..'], context);
    
    // Vérifier que OLDPWD a encore été mis à jour
    assert.equals(context.variables.OLDPWD, '/root/test-oldpwd', 'OLDPWD devrait contenir /root/test-oldpwd');
    
    console.log('✅ Mise à jour de OLDPWD fonctionne');
    return true;
}

/**
 * Test de cd vers la racine
 */
function testCdToRoot() {
    clearCaptures();
    const context = createTestContext();
    
    // Vérifier qu'on démarre dans /root
    assert.equals(context.getCurrentPath(), '/root', 'Devrait démarrer dans /root');
    
    // Aller à la racine
    cmdCd(['/'], context);
    
    // Vérifier qu'on est à la racine
    assert.equals(context.getCurrentPath(), '/', 'cd / devrait aller à la racine');
    
    console.log('✅ cd vers la racine fonctionne');
    return true;
}

/**
 * Export des tests de base pour cd
 */
export const cdBasicTests = [
    createTest('cd sans argument (retour home)', testCdNoArguments),
    createTest('cd vers dossier existant', testCdToExistingDirectory),
    createTest('cd vers dossier inexistant (erreur)', testCdToNonexistentDirectory),
    createTest('cd vers fichier (erreur)', testCdToFileInsteadOfDirectory),
    createTest('cd ~ (home)', testCdTildeHome),
    createTest('cd ~/subdir', testCdTildeSubdirectory),
    createTest('cd - (répertoire précédent)', testCdDashPrevious),
    createTest('cd chemin absolu', testCdAbsolutePath),
    createTest('cd chemins relatifs complexes', testCdRelativePathComplex),
    createTest('Mise à jour OLDPWD', testOldPwdUpdate),
    createTest('cd vers racine', testCdToRoot)
];