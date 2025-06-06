import { runTestSuite } from '../../lib/runner.js';
import { rmBasicTests } from '../../specs/commands/rm/basic.test.js';
import { rmOptionsTests } from '../../specs/commands/rm/options.test.js';
import { rmWildcardSubdirectoryTests } from '../../specs/commands/rm/wildcard-subdirectory.test.js';

export function stages(suites) {

    // Tests de base pour rm
    console.log('\n🗑️ Tests de base de rm...');
    const rmBasicResults = runTestSuite('rm - Tests de base', rmBasicTests);
    suites.push(rmBasicResults);
    
    // Tests des options pour rm
    console.log('\n⚙️ Tests des options de rm...');
    const rmOptionsResults = runTestSuite('rm - Tests des options', rmOptionsTests);
    suites.push(rmOptionsResults);
    
    // Tests des wildcards dans sous-dossiers pour rm
    console.log('\n🎯 Tests des wildcards sous-dossiers de rm...');
    const rmWildcardResults = runTestSuite('rm - Tests wildcards sous-dossiers', rmWildcardSubdirectoryTests);
    suites.push(rmWildcardResults);
}