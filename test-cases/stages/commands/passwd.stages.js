// test-cases/stages/commands/passwd.stages.js - Stage pour les tests passwd
import { runTestSuite, runTestSuiteAsync } from '../../lib/runner.js';
import { passwdNonInteractiveTests } from '../../specs/commands/passwd/non-interactive.test.js';
import { passwdInteractiveTests } from '../../specs/commands/passwd/interactive.test.js';

export async function stages(suites) {

    // Tests non interactifs pour passwd
    console.log('\n🔐 Tests non interactifs de passwd...');
    const passwdNonInteractiveResults = runTestSuite('passwd - Tests non interactifs', passwdNonInteractiveTests);
    suites.push(passwdNonInteractiveResults);

    // Tests interactifs pour passwd (utilise la nouvelle fonction async)
    console.log('\n🔑 Tests interactifs de passwd...');
    const passwdInteractiveResults = await runTestSuiteAsync('passwd - Tests interactifs', passwdInteractiveTests);
    suites.push(passwdInteractiveResults);
}

