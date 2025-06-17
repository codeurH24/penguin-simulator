// test-cases/stages/commands/chmod.stages.js - Stage pour les tests chmod
import { runTestSuite } from '../../lib/runner.js';
import { chmodBasicTests } from '../../specs/commands/chmod/basic.test.js';
import { chmodRecursiveTests } from '../../specs/commands/chmod/recursive.test.js';
import { chmodPermissionsTests } from '../../specs/commands/chmod/permissions.test.js';

export function stages(suites) {

    // Tests de base pour chmod
    console.log('\n🔒 Tests de base de chmod...');
    const chmodBasicResults = runTestSuite('chmod - Tests de base', chmodBasicTests);
    suites.push(chmodBasicResults);
    
    // Tests récursifs pour chmod
    console.log('\n🔄 Tests récursifs de chmod...');
    const chmodRecursiveResults = runTestSuite('chmod - Tests récursifs', chmodRecursiveTests);
    suites.push(chmodRecursiveResults);
    
    // Tests de permissions pour chmod
    console.log('\n🛡️ Tests de permissions de chmod...');
    const chmodPermissionsResults = runTestSuite('chmod - Tests de permissions', chmodPermissionsTests);
    suites.push(chmodPermissionsResults);
}