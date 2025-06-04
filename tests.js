// tests.js - Tests factorisés pour le terminal Linux
import { createContext } from './core/context.js';
import { cmdMkdir } from './bin/mkdir.js';

// =============================================================================
// INFRASTRUCTURE DE TEST
// =============================================================================

// Variable globale pour capturer les sorties
let capturedOutputs = [];

// Fonctions de capture pour remplacer les vraies fonctions terminal
function captureAddLine(text, className = '') {
    capturedOutputs.push({ text, className });
    console.log(`[CAPTURE] ${className ? `[${className}] ` : ''}${text}`);
}

function captureShowError(message) {
    capturedOutputs.push({ text: message, className: 'error' });
    console.log(`[CAPTURE ERROR] ${message}`);
}

function captureShowSuccess(message) {
    capturedOutputs.push({ text: message, className: 'success' });
    console.log(`[CAPTURE SUCCESS] ${message}`);
}

/**
 * Crée un contexte de test avec fonctions de capture injectées
 * @returns {Object} - Contexte de test prêt à utiliser
 */
function createTestContext() {
    const context = createContext();
    
    // Injecter nos fonctions de capture
    context.addLine = captureAddLine;
    context.showError = captureShowError;
    context.showSuccess = captureShowSuccess;
    
    return context;
}

/**
 * Vide les captures précédentes
 */
function clearCaptures() {
    capturedOutputs = [];
}

/**
 * Affiche les captures pour debug
 */
function showCaptures() {
    console.log(`Nombre de lignes capturées: ${capturedOutputs.length}`);
    if (capturedOutputs.length > 0) {
        console.log('Contenu capturé:');
        capturedOutputs.forEach((output, index) => {
            console.log(`  ${index}: "${output.text}" [classe: ${output.className || 'aucune'}]`);
        });
    }
}

// =============================================================================
// TEST 1 : VÉRIFICATION DU SYSTÈME DE FICHIERS
// =============================================================================

function testFileSystemInitialization() {
    console.log('=== Test 1 : Initialisation du système de fichiers ===');
    
    clearCaptures();
    const context = createTestContext();
    
    // Vérifications du système de fichiers
    const fileSystemKeys = Object.keys(context.fileSystem);
    console.log('DEBUG - Système de fichiers:', fileSystemKeys);
    console.log('DEBUG - currentPath:', context.currentPath);
    
    // Test 1.1 : Dossier racine existe
    const hasRoot = context.fileSystem['/'] !== undefined;
    console.log('✓ Dossier racine / existe:', hasRoot ? 'OUI' : 'NON');
    
    // Test 1.2 : Dossier /home existe
    const hasHome = context.fileSystem['/home'] !== undefined;
    console.log('✓ Dossier /home existe:', hasHome ? 'OUI' : 'NON');
    
    // Test 1.3 : Dossier /root existe
    const hasRootDir = context.fileSystem['/root'] !== undefined;
    console.log('✓ Dossier /root existe:', hasRootDir ? 'OUI' : 'NON');
    
    // Test 1.4 : currentPath est correct
    const correctPath = context.currentPath === '/root';
    console.log('✓ currentPath est /root:', correctPath ? 'OUI' : 'NON');
    
    // Test 1.5 : Vérifier le type des dossiers
    const rootIsDir = context.fileSystem['/']?.type === 'dir';
    const homeIsDir = context.fileSystem['/home']?.type === 'dir';
    const rootDirIsDir = context.fileSystem['/root']?.type === 'dir';
    
    console.log('✓ / est un dossier:', rootIsDir ? 'OUI' : 'NON');
    console.log('✓ /home est un dossier:', homeIsDir ? 'OUI' : 'NON');
    console.log('✓ /root est un dossier:', rootDirIsDir ? 'OUI' : 'NON');
    
    // Résultat global du test 1
    const test1Success = hasRoot && hasHome && hasRootDir && correctPath && 
                        rootIsDir && homeIsDir && rootDirIsDir;
    
    console.log(test1Success ? '✅ Test 1 RÉUSSI' : '❌ Test 1 ÉCHOUÉ');
    console.log('');
    
    return test1Success;
}

// =============================================================================
// TEST 2 : COMMANDE MKDIR
// =============================================================================

function testMkdirCommand() {
    console.log('=== Test 2 : Commande mkdir ===');
    
    clearCaptures();
    const context = createTestContext();
    
    // Pré-requis : vérifier que le contexte est sain (test rapide)
    if (!context.fileSystem['/root']) {
        console.error('❌ PRÉREQUIS ÉCHOUÉ: /root n\'existe pas');
        return false;
    }
    
    // État initial
    const initialFiles = Object.keys(context.fileSystem);
    console.log('DEBUG - Fichiers avant mkdir:', initialFiles);
    
    // Exécution de mkdir
    console.log('DEBUG - Exécution: mkdir test-folder');
    cmdMkdir(['test-folder'], context);
    
    // État final
    const finalFiles = Object.keys(context.fileSystem);
    console.log('DEBUG - Fichiers après mkdir:', finalFiles);
    
    // Afficher les captures
    showCaptures();
    
    // Vérifications
    const hasOutput = capturedOutputs.length > 0;
    const folderExists = context.fileSystem['/root/test-folder'] !== undefined;
    const folderIsDir = context.fileSystem['/root/test-folder']?.type === 'dir';
    
    console.log('✓ mkdir a produit une sortie:', hasOutput ? 'OUI' : 'NON');
    console.log('✓ Dossier /root/test-folder créé:', folderExists ? 'OUI' : 'NON');
    console.log('✓ test-folder est un dossier:', folderIsDir ? 'OUI' : 'NON');
    
    // Vérification du message de succès
    const hasSuccessMessage = capturedOutputs.some(output => 
        output.text.includes('créé') && output.className === 'success'
    );
    console.log('✓ Message de succès capturé:', hasSuccessMessage ? 'OUI' : 'NON');
    
    // Résultat global du test 2
    const test2Success = folderExists && folderIsDir;
    
    console.log(test2Success ? '✅ Test 2 RÉUSSI' : '❌ Test 2 ÉCHOUÉ');
    console.log('');
    
    return test2Success;
}

// =============================================================================
// LANCEUR DE TESTS
// =============================================================================

function runAllTests() {
    console.log('🧪 Lancement de la suite de tests...\n');
    
    const results = [];
    
    // Test 1 : Système de fichiers
    const test1Result = testFileSystemInitialization();
    results.push({ name: 'Système de fichiers', success: test1Result });
    
    // Test 2 : Commande mkdir
    const test2Result = testMkdirCommand();
    results.push({ name: 'Commande mkdir', success: test2Result });
    
    // Résumé final
    console.log('📊 RÉSUMÉ DES TESTS');
    console.log('================');
    
    const passed = results.filter(r => r.success).length;
    const total = results.length;
    
    results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        console.log(`${status} ${result.name}`);
    });
    
    console.log(`\n🎯 Score: ${passed}/${total} tests réussis`);
    
    if (passed === total) {
        console.log('🎉 Tous les tests sont passés !');
    } else {
        console.log('⚠️ Certains tests ont échoué');
    }
    
    return { passed, total, results };
}

// =============================================================================
// LANCEMENT
// =============================================================================

runAllTests();