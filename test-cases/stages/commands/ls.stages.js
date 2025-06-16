// test-cases/stages/commands/ls.stages.js - Stage pour les tests ls avec permissions
import { runTestSuite } from '../../lib/runner.js';
import { lsBasicTests } from '../../specs/commands/ls/basic.test.js';
import { lsOptionsTests } from '../../specs/commands/ls/options.test.js';
import { lsPermissionDeniedTests } from '../../specs/commands/ls/permissions-denied.test.js';

export function stages(suites) {

    // Tests de base pour ls
    console.log('\n📋 Tests de base de ls...');
    const lsBasicResults = runTestSuite('ls - Tests de base', lsBasicTests);
    suites.push(lsBasicResults);
    
    // Tests des options pour ls
    console.log('\n🎛️ Tests des options de ls...');
    const lsOptionsResults = runTestSuite('ls - Tests des options', lsOptionsTests);
    suites.push(lsOptionsResults);
    
    // Tests de permissions refusées pour ls avec alice
    console.log('\n🔒 Tests de permissions refusées pour ls...');
    const lsPermissionResults = runTestSuite('ls - Tests de permissions refusées (alice)', lsPermissionDeniedTests);
    suites.push(lsPermissionResults);
}