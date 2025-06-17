// test-cases/stages/commands/groups.stages.js - Stage pour les tests groups
import { runTestSuite } from '../../lib/runner.js';
import {
    testGroupsBasic,
    testGroupsWithUsername,
    testGroupsNoUser,
    testGroupsUserNotFound,
    testGroupsTooManyArgs,
    testGroupsMissingGroupFile
} from '../../specs/commands/groups/basic.test.js';

export function stages(suites) {
    // Regroupement des tests groups dans le bon format
    const groupsBasicTests = [
        { name: 'Test basique de groups', fn: testGroupsBasic },
        { name: 'Test groups avec nom d\'utilisateur', fn: testGroupsWithUsername },
        { name: 'Test groups sans utilisateur connecté', fn: testGroupsNoUser },
        { name: 'Test groups avec utilisateur inexistant', fn: testGroupsUserNotFound },
        { name: 'Test groups avec trop d\'arguments', fn: testGroupsTooManyArgs },
        { name: 'Test groups sans fichier group', fn: testGroupsMissingGroupFile }
    ];

    // Tests de base pour groups
    console.log('\n👥 Tests de base de groups...');
    const groupsBasicResults = runTestSuite('groups - Tests de base', groupsBasicTests);
    suites.push(groupsBasicResults);
}