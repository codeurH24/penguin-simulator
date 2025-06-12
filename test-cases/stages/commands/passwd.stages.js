// test-cases/stages/commands/passwd.stages.js - Stage pour les tests passwd
import { runTestSuite } from '../../lib/runner.js';
import { passwdBasicTests } from '../../specs/commands/passwd/basic.test.js';

export function stages(suites) {

    // Tests de base pour passwd
    console.log('\n🔐 Tests de base de passwd...');
    const passwdBasicResults = runTestSuite('passwd - Tests de base', passwdBasicTests);
    suites.push(passwdBasicResults);
}