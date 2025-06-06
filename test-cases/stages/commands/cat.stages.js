// test-cases/stages/commands/cat.stages.js - Stage pour les tests cat
import { runTestSuite } from '../../lib/runner.js';
import { catBasicTests } from '../../specs/commands/cat/basic.test.js';

export function stages(suites) {

    // Tests de base pour cat
    console.log('\n📖 Tests de base de cat...');
    const catBasicResults = runTestSuite('cat - Tests de base', catBasicTests);
    suites.push(catBasicResults);
}