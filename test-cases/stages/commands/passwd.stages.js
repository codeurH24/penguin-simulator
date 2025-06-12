// test-cases/stages/commands/passwd.stages.js - Stage pour les tests passwd
import { runTestSuite } from '../../lib/runner.js';
import { passwdNonInteractiveTests } from '../../specs/commands/passwd/non-interactive.test.js';

export function stages(suites) {

    // Tests non interactif pour passwd
    console.log('\n🔐 Tests non interactif de passwd...');
    const passwdNonInteractiveResults = runTestSuite('passwd - Tests non interactif ', passwdNonInteractiveTests);
    suites.push(passwdNonInteractiveResults);
}