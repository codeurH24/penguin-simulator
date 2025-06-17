// test-cases/stages/commands/id.stages.js - Stage pour les tests id
import { runTestSuite } from '../../lib/runner.js';
import {
    testIdBasic,
    testIdUserOnly,
    testIdGroupOnly,
    testIdNamesOnly,
    testIdNoUser,
    testIdInvalidOption
} from '../../specs/commands/id/basic.test.js';

// Regroupement des tests id dans le bon format
const idBasicTests = [
    { name: 'Test basique de id', fn: testIdBasic },
    { name: 'Test id avec option -u', fn: testIdUserOnly },
    { name: 'Test id avec option -g', fn: testIdGroupOnly },
    { name: 'Test id avec option -n', fn: testIdNamesOnly },
    { name: 'Test id sans utilisateur connecté', fn: testIdNoUser },
    { name: 'Test id avec option invalide', fn: testIdInvalidOption }
];

export function stages(suites) {
    // Tests de base pour id
    console.log('\n🆔 Tests de base de id...');
    const idBasicResults = runTestSuite('id - Tests de base', idBasicTests);
    suites.push(idBasicResults);
}