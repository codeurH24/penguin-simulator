import { runTestSuite } from '../../lib/runner.js';
import { mkdirBasicTests } from '../../specs/commands/mkdir/basic.test.js';
import { mkdirOptionsTests } from '../../specs/commands/mkdir/options.test.js';

export function stages(suites) {

    // 2. Tests de base pour mkdir
    console.log('\n📁 Tests des commandes de base...');
    const mkdirBasicResults = runTestSuite('mkdir - Tests de base', mkdirBasicTests);
    suites.push(mkdirBasicResults);
    
    // 3. Tests de l'option p pour mkdir
    console.log('\n⚙️ Tests des options avancées...');
    const mkdirOptionsResults = runTestSuite('mkdir - Tests des options', mkdirOptionsTests);
    suites.push(mkdirOptionsResults);
}
