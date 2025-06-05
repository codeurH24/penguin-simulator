import { runTestSuite } from '../../lib/runner.js';
import { touchBasicTests } from '../../specs/commands/touch/basic.test.js';
import { touchOptionsTests } from '../../specs/commands/touch/options.test.js';

export function stages(suites) {

    // Tests de base pour touch
    console.log('\n📝 Tests de base de touch...');
    const touchBasicResults = runTestSuite('touch - Tests de base', touchBasicTests);
    suites.push(touchBasicResults);
    
    // Tests des options pour touch
    console.log('\n⚙️ Tests des options de touch...');
    const touchOptionsResults = runTestSuite('touch - Tests des options', touchOptionsTests);
    suites.push(touchOptionsResults);
}