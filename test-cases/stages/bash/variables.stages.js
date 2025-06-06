// test-cases/stages/bash/variables.stages.js - Stage pour les tests de variables bash
import { runTestSuite } from '../../lib/runner.js';
import { bashVariablesTests } from '../../specs/bash/variables.test.js';

export function stages(suites) {

    // Tests des variables bash
    console.log('\n🔧 Tests des variables bash...');
    const bashVariablesResults = runTestSuite('bash - Variables', bashVariablesTests);
    suites.push(bashVariablesResults);
}