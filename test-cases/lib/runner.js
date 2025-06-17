// test-cases/lib/runner.js - Lanceur et formatage des tests (VERSION COMPLÈTE AVEC STACK)

/**
 * Exécute un test individuel avec gestion d'erreurs
 * @param {string} name - Nom du test
 * @param {Function} testFn - Fonction de test à exécuter
 * @returns {Object} - {name, success, error?, duration}
 */
export function runSingleTest(name, testFn) {
    const startTime = performance.now();
    
    try {
        const result = testFn();
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        
        if (result === true) {
            return { name, success: true, duration };
        } else if (result === false) {
            return { name, success: false, duration, error: 'Test retourné false' };
        } else {
            // Si le test ne retourne ni true ni false, considérer comme succès
            return { name, success: true, duration };
        }
    } catch (error) {
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        
        // CORRECTION : Capturer la stack complète
        const errorInfo = {
            message: error.message || 'Erreur inconnue',
            stack: error.stack || 'Stack non disponible'
        };
        
        return { 
            name, 
            success: false, 
            duration,
            error: errorInfo.message,
            stack: errorInfo.stack  // ← AJOUT de la stack
        };
    }
}

/**
 * Exécute une suite de tests
 * @param {string} suiteName - Nom de la suite
 * @param {Array} tests - Tableau de {name, fn}
 * @returns {Object} - Résultats de la suite
 */
export function runTestSuite(suiteName, tests) {
    // console.log(`\n🧪 === ${suiteName} ===`);
    
    const results = [];
    const startTime = performance.now();
    
    for (const test of tests) {
        // console.log(`\n▶️ ${test.name}`);
        const result = runSingleTest(test.name, test.fn);
        results.push(result);
        
        const status = result.success ? '✅' : '❌';
        const duration = `(${result.duration}ms)`;
        // console.log(`${status} ${test.name} ${duration}`);
        
        if (!result.success) {
            console.log(`   💥 ${result.error}`);
            
            // CORRECTION : Afficher la stack complète en cas d'erreur
            if (result.stack) {
                console.log(`   📍 Stack trace:`);
                console.log(result.stack);
            }
        }
    }
    
    const endTime = performance.now();
    const totalDuration = Math.round(endTime - startTime);
    const passed = results.filter(r => r.success).length;
    
    // console.log(`\n📊 ${suiteName}: ${passed}/${results.length} tests réussis (${totalDuration}ms)`);
    
    const suiteResult = {
        name: suiteName,
        results,
        passed,
        total: results.length,
        duration: totalDuration,
        success: passed === results.length
    };
    
    if (!suiteResult.success) {
        const failedCount = suiteResult.total - suiteResult.passed;
        throw new Error(`Suite "${suiteName}" a échoué: ${failedCount}/${suiteResult.total} tests ont échoué`);
    }
    
    return suiteResult;
}

/**
 * Exécute un test individuel ASYNC avec gestion d'erreurs
 * @param {string} name - Nom du test
 * @param {Function} testFn - Fonction de test async à exécuter
 * @returns {Promise<Object>} - {name, success, error?, duration}
 */
async function runSingleTestAsync(name, testFn) {
    const startTime = performance.now();
    
    try {
        const result = await testFn();
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        
        if (result === true) {
            return { name, success: true, duration };
        } else if (result === false) {
            return { name, success: false, duration, error: 'Test retourné false' };
        } else {
            return { name, success: true, duration };
        }
    } catch (error) {
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        
        // CORRECTION : Capturer la stack complète
        const errorInfo = {
            message: error.message || 'Erreur inconnue',
            stack: error.stack || 'Stack non disponible'
        };
        
        return { 
            name, 
            success: false, 
            duration,
            error: errorInfo.message,
            stack: errorInfo.stack  // ← AJOUT de la stack
        };
    }
}

/**
 * Exécute une suite de tests ASYNC
 * @param {string} suiteName - Nom de la suite
 * @param {Array} tests - Tableau de {name, fn}
 * @returns {Promise<Object>} - Résultats de la suite
 */
export async function runTestSuiteAsync(suiteName, tests) {
    // console.log(`\n🧪 === ${suiteName} ===`);
    
    const results = [];
    const startTime = performance.now();
    
    for (const test of tests) {
        // console.log(`\n▶️ ${test.name}`);
        const result = await runSingleTestAsync(test.name, test.fn);
        results.push(result);
        
        const status = result.success ? '✅' : '❌';
        const duration = `(${result.duration}ms)`;
        // console.log(`${status} ${test.name} ${duration}`);
        
        if (!result.success) {
            console.log(`   💥 ${result.error}`);
            
            // CORRECTION : Afficher la stack complète en cas d'erreur
            if (result.stack) {
                console.log(`   📍 Stack trace:`);
                console.log(result.stack);
            }
        }
    }
    
    const endTime = performance.now();
    const totalDuration = Math.round(endTime - startTime);
    const passed = results.filter(r => r.success).length;
    
    // console.log(`\n📊 ${suiteName}: ${passed}/${results.length} tests réussis (${totalDuration}ms)`);
    
    return {
        name: suiteName,
        results,
        passed,
        total: results.length,
        duration: totalDuration,
        success: passed === results.length
    };
}

/**
 * Affiche le rapport final de plusieurs suites de tests
 * @param {Array} suites - Tableau de résultats de suites
 */
export function showFinalReport(suites) {
    console.log('\n' + '='.repeat(50));
    console.log('📈 RAPPORT FINAL DES TESTS');
    console.log('='.repeat(50));
    
    let totalPassed = 0;
    let totalTests = 0;
    let totalDuration = 0;
    
    suites.forEach(suite => {
        const status = suite.success ? '✅' : '❌';
        console.log(`${status} ${suite.name}: ${suite.passed}/${suite.total} (${suite.duration}ms)`);
        
        // CORRECTION : Afficher la stack pour les échecs dans le rapport final
        if (!suite.success) {
            const failed = suite.results.filter(r => !r.success);
            failed.forEach(test => {
                console.log(`   ❌ ${test.name}: ${test.error}`);
                // AJOUT : Stack trace dans le rapport final
                if (test.stack) {
                    console.log(`   📍 Stack trace:`);
                    console.log(test.stack);
                }
            });
        }
        
        totalPassed += suite.passed;
        totalTests += suite.total;
        totalDuration += suite.duration;
    });
    
    console.log('-'.repeat(50));
    console.log(`🎯 TOTAL: ${totalPassed}/${totalTests} tests réussis`);
    console.log(`⏱️ Durée totale: ${totalDuration}ms`);
    
    if (totalPassed === totalTests) {
        console.log('🎉 TOUS LES TESTS SONT PASSÉS !');
    } else {
        const failedCount = totalTests - totalPassed;
        console.log(`⚠️ ${failedCount} test(s) échoué(s)`);
    }
    
    return {
        totalPassed,
        totalTests,
        totalDuration,
        success: totalPassed === totalTests
    };
}

/**
 * Utilitaire pour créer rapidement un objet test
 * @param {string} name - Nom du test
 * @param {Function} fn - Fonction de test
 * @returns {Object} - {name, fn}
 */
export function createTest(name, fn) {
    return { name, fn };
}

/**
 * Utilitaire pour grouper plusieurs tests
 * @param {Array} tests - Tableau de tests
 * @returns {Array} - Même tableau (pour chainage)
 */
export function testGroup(...tests) {
    return tests;
}