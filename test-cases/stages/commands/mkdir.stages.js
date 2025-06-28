// test-cases/stages/commands/mkdir.stages.js - Stage pour les tests mkdir avec permissions
import { runTestSuite } from '../../lib/runner.js';
import { mkdirBasicTests } from '../../specs/commands/mkdir/basic.test.js';
import { mkdirOptionsTests } from '../../specs/commands/mkdir/options.test.js';
import { mkdirPermissionDeniedTests } from '../../specs/commands/mkdir/permissions-denied.test.js';
import { braceExpansionTests } from '../../specs/commands/mkdir/brace-expansion.test.js';

export function stages(suites) {

    // Tests de base pour mkdir
    console.log('\n📁 Tests de base de mkdir...');
    const mkdirBasicResults = runTestSuite('mkdir - Tests de base', mkdirBasicTests);
    suites.push(mkdirBasicResults);

    // Tests des options pour mkdir
    console.log('\n⚙️ Tests des options de mkdir...');
    const mkdirOptionsResults = runTestSuite('mkdir - Tests des options', mkdirOptionsTests);
    suites.push(mkdirOptionsResults);

    // Tests de permissions refusées pour mkdir avec alice
    console.log('\n🔒 Tests de permissions refusées pour mkdir...');
    const mkdirPermissionResults = runTestSuite('mkdir - Tests de permissions refusées (alice)', mkdirPermissionDeniedTests);
    suites.push(mkdirPermissionResults);

    // Nouveaux tests d'expansion des braces pour mkdir
    console.log('\n🎯 Tests d\'expansion des braces pour mkdir...');
    const mkdirBraceExpansionResults = runTestSuite('mkdir - Tests d\'expansion des braces', braceExpansionTests);
    suites.push(mkdirBraceExpansionResults);
}