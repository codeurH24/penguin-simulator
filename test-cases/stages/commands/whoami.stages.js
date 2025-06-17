// test-cases/stages/commands/whoami.stages.js - Stage pour les tests whoami
import { runTestSuite } from '../../lib/runner.js';
import { whoamiDebianTests } from '../../specs/commands/whoami/debian-compliant.test.js';
import { whoamiIntegrationTests } from '../../specs/commands/whoami/integration.test.js';

export function stages(suites) {
    // Tests de conformité Debian pour whoami
    console.log('\n🐧 Tests de conformité Debian pour whoami...');
    const whoamiDebianResults = runTestSuite('whoami - Conformité Debian', whoamiDebianTests);
    suites.push(whoamiDebianResults);
    
    // Tests d'intégration avancés pour whoami
    console.log('\n🔗 Tests d\'intégration avancés pour whoami...');
    const whoamiIntegrationResults = runTestSuite('whoami - Tests d\'intégration', whoamiIntegrationTests);
    suites.push(whoamiIntegrationResults);
}