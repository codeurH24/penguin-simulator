// test-cases/stages/commands/echo.stages.js - Stage pour les tests echo
import { runTestSuite } from '../../lib/runner.js';
import { echoBasicTests } from '../../specs/commands/echo/basic.test.js';
import { echoOptionsTests } from '../../specs/commands/echo/options.test.js';
import { echoRedirectionsTests } from '../../specs/commands/echo/redirections.test.js';
import { echoRedirectionsPermissionsTests } from '../../specs/commands/echo/redirections-permissions.test.js';
import { echoEdgeCasesTests } from '../../specs/commands/echo/edge-cases.test.js';

export function stages(suites) {

    // Tests de base pour echo
    console.log('\n📢 Tests de base de echo...');
    const echoBasicResults = runTestSuite('echo - Tests de base', echoBasicTests);
    suites.push(echoBasicResults);
    
    // Tests des options pour echo
    console.log('\n⚙️ Tests des options de echo...');
    const echoOptionsResults = runTestSuite('echo - Tests des options', echoOptionsTests);
    suites.push(echoOptionsResults);
    
    // Tests des redirections pour echo
    console.log('\n🔀 Tests des redirections de echo...');
    const echoRedirectionsResults = runTestSuite('echo - Tests des redirections', echoRedirectionsTests);
    suites.push(echoRedirectionsResults);
    
    // ✅ NOUVEAU: Tests des permissions pour les redirections echo
    console.log('\n🔒 Tests des permissions de redirections echo...');
    const echoRedirectionsPermissionsResults = runTestSuite('echo - Tests permissions redirections', echoRedirectionsPermissionsTests);
    suites.push(echoRedirectionsPermissionsResults);
    
    // Tests des cas limites pour echo
    console.log('\n🎯 Tests des cas limites de echo...');
    const echoEdgeCasesResults = runTestSuite('echo - Tests des cas limites', echoEdgeCasesTests);
    suites.push(echoEdgeCasesResults);
}