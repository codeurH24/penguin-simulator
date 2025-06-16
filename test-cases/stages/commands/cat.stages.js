// test-cases/stages/commands/cat.stages.js - Stage pour les tests cat avec permissions
import { runTestSuite } from '../../lib/runner.js';
import { catBasicTests } from '../../specs/commands/cat/basic.test.js';
import { catPermissionDeniedTests } from '../../specs/commands/cat/permissions-denied.test.js';

export function stages(suites) {

    // Tests de base pour cat
    console.log('\n📖 Tests de base de cat...');
    const catBasicResults = runTestSuite('cat - Tests de base', catBasicTests);
    suites.push(catBasicResults);
    
    // Tests de permissions refusées pour cat avec alice
    console.log('\n🔒 Tests de permissions refusées pour cat...');
    const catPermissionResults = runTestSuite('cat - Tests de permissions refusées (alice)', catPermissionDeniedTests);
    suites.push(catPermissionResults);
}