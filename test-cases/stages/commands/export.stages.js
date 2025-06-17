// test-cases/stages/commands/export.stages.js - Stage pour les tests export
import { runTestSuite } from '../../lib/runner.js';
import { exportBasicTests } from '../../specs/commands/export/basic.test.js';

export function stages(suites) {

    // Tests de base pour export
    console.log('\n📤 Tests de base de export...');
    const exportBasicResults = runTestSuite('export - Tests de base', exportBasicTests);
    suites.push(exportBasicResults);
}