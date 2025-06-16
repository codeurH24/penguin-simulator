// test-cases/stages/commands/touch.stages.js
import { runTestSuite } from '../../lib/runner.js';
import { touchBasicTests } from '../../specs/commands/touch/basic.test.js';
import { touchOptionsTests } from '../../specs/commands/touch/options.test.js';
import { touchPermissionsTests } from '../../specs/commands/touch/permissions-denied.test.js';
import { touchAdvancedPermissionsTests } from '../../specs/commands/touch/advanced-permissions.test.js';

export function stages(suites) {

    // Tests de base pour touch
    console.log('\n📝 Tests de base de touch...');
    const touchBasicResults = runTestSuite('touch - Tests de base', touchBasicTests);
    suites.push(touchBasicResults);
    
    // Tests des options pour touch
    console.log('\n⚙️ Tests des options de touch...');
    const touchOptionsResults = runTestSuite('touch - Tests des options', touchOptionsTests);
    suites.push(touchOptionsResults);

    // Tests de permissions refusées pour touch
    console.log('\n🔒 Tests de permissions refusées pour touch...');
    const touchPermissionsResults = runTestSuite('touch - Permissions refusées', touchPermissionsTests);
    suites.push(touchPermissionsResults);

    // Tests de permissions avancées pour touch
    // console.log('\n🔐 Tests de permissions avancées pour touch...');
    // const touchAdvancedPermissionsResults = runTestSuite('touch - Permissions avancées', touchAdvancedPermissionsTests);
    // suites.push(touchAdvancedPermissionsResults);
}