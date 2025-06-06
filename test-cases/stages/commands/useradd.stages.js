// test-cases/stages/commands/useradd.stages.js - Stage pour les tests useradd mis à jour
import { runTestSuite } from '../../lib/runner.js';
import { useraddBasicTests } from '../../specs/commands/useradd/basic.test.js';
import { useraddOptionsTests } from '../../specs/commands/useradd/options.test.js';
import { useraddDebianTests } from '../../specs/commands/useradd/debian-compliant.test.js';

export function stages(suites) {

    // Tests de conformité Debian (PRIORITÉ - tests les plus importants)
    console.log('\n🐧 Tests de conformité Debian pour useradd...');
    const useraddDebianResults = runTestSuite('useradd - Conformité Debian', useraddDebianTests);
    suites.push(useraddDebianResults);
    
    // Tests de base pour useradd (complémentaires)
    console.log('\n👤 Tests de base de useradd...');
    const useraddBasicResults = runTestSuite('useradd - Tests de base', useraddBasicTests);
    suites.push(useraddBasicResults);
    
    // Tests des options pour useradd (complémentaires)
    console.log('\n⚙️ Tests des options de useradd...');
    const useraddOptionsResults = runTestSuite('useradd - Tests des options', useraddOptionsTests);
    suites.push(useraddOptionsResults);
}