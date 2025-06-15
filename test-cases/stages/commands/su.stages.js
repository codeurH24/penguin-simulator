import { runTestSuite } from '../../lib/runner.js';
import { suDirectoryTests } from '../../specs/commands/su/working-directory.test.js';

export function stages(suites) {

    // Tests su répertoire courant
    console.log('\n🔄 Tests de su - Répertoire courant...');
    const suDirectoryResults = runTestSuite('su - Tests répertoire courant', suDirectoryTests);
    suites.push(suDirectoryResults);
}