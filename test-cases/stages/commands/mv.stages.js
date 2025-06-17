// test-cases/stages/commands/mv.stages.js
// Stage pour les tests mv avec progression logique

import { runTestSuite } from '../../lib/runner.js';
import { mvBasicTests } from '../../specs/commands/mv/basic.test.js';
import { mvDebianTests } from '../../specs/commands/mv/debian-compliant.test.js';
import { mvPermissionsTests } from '../../specs/commands/mv/permissions.test.js';
import { mvEdgeCasesTests } from '../../specs/commands/mv/edge-cases.test.js';

export function stages(suites) {

    // Tests de base (FONDAMENTAUX - comprendre mv)
    console.log('\n↔️ Tests de base de mv...');
    const mvBasicResults = runTestSuite('mv - Tests de base', mvBasicTests);
    suites.push(mvBasicResults);
    
    // Tests de conformité Debian (SPÉCIFICATIONS - comportement exact)
    console.log('\n🐧 Tests de conformité Debian pour mv...');
    const mvDebianResults = runTestSuite('mv - Conformité Debian', mvDebianTests);
    suites.push(mvDebianResults);
    
    // Tests des permissions (SÉCURITÉ - contrôle d'accès)
    console.log('\n🔒 Tests des permissions pour mv...');
    const mvPermissionsResults = runTestSuite('mv - Tests des permissions', mvPermissionsTests);
    suites.push(mvPermissionsResults);
    
    // Tests des cas limites (ROBUSTESSE - situations extrêmes)
    console.log('\n⚡ Tests des cas limites pour mv...');
    const mvEdgeCasesResults = runTestSuite('mv - Tests des cas limites', mvEdgeCasesTests);
    suites.push(mvEdgeCasesResults);
}