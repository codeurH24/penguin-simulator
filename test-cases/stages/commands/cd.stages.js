import { runTestSuite } from '../../lib/runner.js';
import { cdBasicTests } from '../../specs/commands/cd/basic.test.js';

export function stages(suites) {

    // Tests de base pour cd
    console.log('\n📁 Tests de base de cd...');
    const cdBasicResults = runTestSuite('cd - Tests de base', cdBasicTests);
    suites.push(cdBasicResults);
}