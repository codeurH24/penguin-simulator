// tests.js - Point d'entrée principal des tests
import { runTestSuite, showFinalReport } from './test-cases/lib/runner.js';

// Import des suites de tests
import { contextTests } from './test-cases/system/context.test.js';
import { filesystemTests } from './test-cases/system/filesystem.test.js';
import { mkdirBasicTests } from './test-cases/commands/mkdir/basic.test.js';
import { mkdirOptionsTests } from './test-cases/commands/mkdir/options.test.js';

/**
 * Fonction principale pour lancer tous les tests
 */
async function runAllTests() {
    console.log('🧪 LANCEMENT DE LA SUITE COMPLÈTE DE TESTS');
    console.log('=' .repeat(60));
    
    const startTime = performance.now();
    const suites = [];
    
    try {
        // 1. Tests du contexte (prérequis)
        console.log('\n🏗️ Vérification du contexte...');
        const contextResults = runTestSuite('Contexte d\'exécution', contextTests);
        suites.push(contextResults);
        
        // 2. Tests du système de fichiers (prérequis) 
        console.log('\n🗂️ Vérification du système de fichiers...');
        const filesystemResults = runTestSuite('Système de fichiers', filesystemTests);
        suites.push(filesystemResults);
        
        // Si les tests système échouent, arrêter là
        if (!contextResults.success || !filesystemResults.success) {
            console.log('\n❌ ARRÊT: Les tests du système ont échoué');
            console.log('Les autres tests ne peuvent pas s\'exécuter sans un système sain.');
            showFinalReport(suites);
            return false;
        }
        
        // 2. Tests de base pour mkdir
        console.log('\n📁 Tests des commandes de base...');
        const mkdirBasicResults = runTestSuite('mkdir - Tests de base', mkdirBasicTests);
        suites.push(mkdirBasicResults);
        
        // 3. Tests des options pour mkdir
        console.log('\n⚙️ Tests des options avancées...');
        const mkdirOptionsResults = runTestSuite('mkdir - Tests des options', mkdirOptionsTests);
        suites.push(mkdirOptionsResults);
        
    } catch (error) {
        console.error('\n💥 ERREUR FATALE lors de l\'exécution des tests:', error.message);
        console.error(error.stack);
        return false;
    }
    
    // Rapport final
    const endTime = performance.now();
    const totalTime = Math.round(endTime - startTime);
    
    console.log(`\n⏱️ Temps total d'exécution: ${totalTime}ms`);
    
    const finalReport = showFinalReport(suites);
    
    // Message de conclusion
    if (finalReport.success) {
        console.log('\n🎉 FÉLICITATIONS! Tous les tests sont passés avec succès!');
        console.log('Le système de terminal Linux fonctionne correctement.');
    } else {
        console.log('\n⚠️ ATTENTION: Certains tests ont échoué.');
        console.log('Vérifiez les erreurs ci-dessus et corrigez le code.');
    }
    
    return finalReport.success;
}

/**
 * Fonction pour lancer seulement les tests du système
 */
function runSystemTests() {
    console.log('🧪 TESTS DU SYSTÈME UNIQUEMENT');
    console.log('=' .repeat(40));
    
    const suites = [];
    
    const contextResults = runTestSuite('Contexte d\'exécution', contextTests);
    suites.push(contextResults);
    
    const filesystemResults = runTestSuite('Système de fichiers', filesystemTests);
    suites.push(filesystemResults);
    
    showFinalReport(suites);
    
    return contextResults.success && filesystemResults.success;
}

/**
 * Fonction pour lancer seulement les tests de mkdir
 */
function runMkdirTests() {
    console.log('🧪 TESTS MKDIR UNIQUEMENT');
    console.log('=' .repeat(40));
    
    const suites = [];
    
    // Tests de base
    const basicResults = runTestSuite('mkdir - Tests de base', mkdirBasicTests);
    suites.push(basicResults);
    
    // Tests des options
    const optionsResults = runTestSuite('mkdir - Tests des options', mkdirOptionsTests);
    suites.push(optionsResults);
    
    showFinalReport(suites);
    
    return basicResults.success && optionsResults.success;
}

/**
 * Fonction pour des tests de développement/debug
 */
function runDevTests() {
    console.log('🧪 TESTS DE DÉVELOPPEMENT');
    console.log('=' .repeat(40));
    
    // Lancer seulement un sous-ensemble pour debug
    const contextResults = runTestSuite('Contexte d\'exécution', contextTests.slice(0, 2));
    const filesystemResults = runTestSuite('Système de fichiers', filesystemTests.slice(0, 2));
    const basicResults = runTestSuite('mkdir - Tests de base', mkdirBasicTests.slice(0, 2));
    
    showFinalReport([contextResults, filesystemResults, basicResults]);
    
    return contextResults.success && filesystemResults.success && basicResults.success;
}

// =============================================================================
// LANCEMENT AUTOMATIQUE
// =============================================================================

// Lancer tous les tests par défaut
console.log('🚀 Démarrage automatique des tests...\n');
runAllTests();

// =============================================================================
// EXPORT POUR USAGE EXTERNE
// =============================================================================

// Permettre d'appeler les fonctions depuis la console du navigateur
if (typeof window !== 'undefined') {
    window.testRunner = {
        runAllTests,
        runSystemTests,
        runMkdirTests,
        runDevTests
    };
    
    console.log('\n💡 Fonctions disponibles dans la console:');
    console.log('   window.testRunner.runAllTests()     - Tous les tests');
    console.log('   window.testRunner.runSystemTests()  - Tests système uniquement');
    console.log('   window.testRunner.runMkdirTests()   - Tests mkdir uniquement');
    console.log('   window.testRunner.runDevTests()     - Tests de développement');
}

// Export pour Node.js ou autres environnements
export { 
    runAllTests, 
    runSystemTests, 
    runMkdirTests, 
    runDevTests 
};