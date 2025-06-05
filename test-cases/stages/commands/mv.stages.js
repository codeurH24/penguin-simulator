import { runTestSuite } from '../../lib/runner.js';
import { mvBasicTests } from '../../specs/commands/mv/basic.test.js';

export function stages(suites) {

    // Tests de base pour mv
    console.log('\n↔️ Tests de base de mv...');
    const mvBasicResults = runTestSuite('mv - Tests de base', mvBasicTests);
    suites.push(mvBasicResults);
}