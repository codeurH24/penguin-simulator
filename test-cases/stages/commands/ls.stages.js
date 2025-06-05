import { runTestSuite } from '../../lib/runner.js';
import { lsBasicTests } from '../../specs/commands/ls/basic.test.js';
import { lsOptionsTests } from '../../specs/commands/ls/options.test.js';

export function stages(suites) {

    // Tests de base pour ls
    console.log('\n📋 Tests de base de ls...');
    const lsBasicResults = runTestSuite('ls - Tests de base', lsBasicTests);
    suites.push(lsBasicResults);
    
    // Tests des options pour ls
    console.log('\n🎛️ Tests des options de ls...');
    const lsOptionsResults = runTestSuite('ls - Tests des options', lsOptionsTests);
    suites.push(lsOptionsResults);
}