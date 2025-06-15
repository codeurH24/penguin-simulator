// test-cases/stages/commands/exit.stages.js - Stage pour les tests exit
import { runTestSuite } from '../../lib/runner.js';
import { exitUserStackTests } from '../../specs/commands/exit/user-stack.test.js';

export function stages(suites) {

    // Tests de dépilement des sessions utilisateur pour exit
    console.log('\n🔄 Tests de exit - Dépilement sessions utilisateur...');
    const exitUserStackResults = runTestSuite('exit - Tests dépilement sessions utilisateur', exitUserStackTests);
    suites.push(exitUserStackResults);
}