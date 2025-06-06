// test-cases/stages/commands/useradd.stages.js - Stage pour les tests useradd
import { runTestSuite } from '../../lib/runner.js';
import { useraddBasicTests } from '../../specs/commands/useradd/basic.test.js';
import { useraddOptionsTests } from '../../specs/commands/useradd/options.test.js';

export function stages(suites) {

    // Tests de base pour useradd
    console.log('\n👤 Tests de base de useradd...');
    const useraddBasicResults = runTestSuite('useradd - Tests de base', useraddBasicTests);
    suites.push(useraddBasicResults);
    
    // Tests des options pour useradd
    console.log('\n⚙️ Tests des options de useradd...');
    const useraddOptionsResults = runTestSuite('useradd - Tests des options', useraddOptionsTests);
    suites.push(useraddOptionsResults);
}