// test-cases/stages/commands/cd.stages.js - Stage pour les tests cd
import { runTestSuite } from '../../lib/runner.js';
import { cdBasicTests } from '../../specs/commands/cd/basic.test.js';
import { cdPermissionDeniedTests } from '../../specs/commands/cd/permissions-denied.test.js';

export function stages(suites) {

    // Tests de base pour cd
    console.log('\n📁 Tests de base de cd...');
    const cdBasicResults = runTestSuite('cd - Tests de base', cdBasicTests);
    suites.push(cdBasicResults);
    
    // Tests de permissions refusées pour cd avec alice
    console.log('\n🔒 Tests de permissions refusées pour cd...');
    const cdPermissionResults = runTestSuite('cd - Tests de permissions refusées (alice)', cdPermissionDeniedTests);
    suites.push(cdPermissionResults);
}