import { runTestSuite } from '../../lib/runner.js';
import { pwdBasicTests } from '../../specs/commands/pwd/basic.test.js';

export function stages(suites) {

    // Tests de base pour pwd
    console.log('\n📍 Tests de base de pwd...');
    const pwdBasicResults = runTestSuite('pwd - Tests de base', pwdBasicTests);
    suites.push(pwdBasicResults);
}