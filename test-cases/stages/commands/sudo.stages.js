// test-cases/stages/commands/sudo.stages.js - Stage pour les tests sudo
import { runTestSuite, runTestSuiteAsync } from '../../lib/runner.js';
import { sudoInteractiveTests } from '../../specs/commands/sudo/interactive.test.js';

export async function stages(suites) {
    // Tests interactifs pour sudo
    console.log('\n🔐 Tests interactifs de sudo...');
    const sudoInteractiveResults = await runTestSuiteAsync('sudo - Tests interactifs', sudoInteractiveTests);
    suites.push(sudoInteractiveResults);
}