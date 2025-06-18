// test-cases/stages/commands/userdel.stages.js - Stage pour les tests userdel
import { runTestSuite } from '../../lib/runner.js';
import { userdelBasicTests } from '../../specs/commands/userdel/basic.test.js';

export function stages(suites) {

    // Tests de base pour userdel
    console.log('\n🗑️ Tests de base de userdel...');
    const userdelBasicResults = runTestSuite('userdel - Tests de base', userdelBasicTests);
    suites.push(userdelBasicResults);
}