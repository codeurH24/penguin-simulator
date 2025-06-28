// test-cases/specs/commands/rm/wildcard-subdirectory.test.js - Test pour wildcards dans sous-dossiers
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdRm } from '../../../../bin/rm.js';
import { cmdMkdir } from '../../../../bin/mkdir/mkdir.js';
import { cmdTouch } from '../../../../bin/touch.js';

/**
 * Test de suppression avec wildcard dans un sous-dossier
 */
function testWildcardInSubdirectory() {
    clearCaptures();
    const context = createTestContext();
    
    // Reproduire la situation exacte de l'utilisateur
    cmdMkdir(['dossier1'], context);
    cmdMkdir(['dossier2'], context);
    cmdMkdir(['dossier1/dossier12'], context);
    cmdTouch(['dossier1/file1'], context);
    cmdTouch(['dossier1/file123'], context);
    cmdTouch(['testFile'], context);
    cmdTouch(['text.txt'], context);
    
    // Vérifier que la structure existe (comme dans ls -l)
    assert.fileExists(context, '/root/dossier1', 'dossier1 devrait exister');
    assert.fileExists(context, '/root/dossier2', 'dossier2 devrait exister');
    assert.fileExists(context, '/root/dossier1/dossier12', 'dossier1/dossier12 devrait exister');
    assert.fileExists(context, '/root/dossier1/file1', 'dossier1/file1 devrait exister');
    assert.fileExists(context, '/root/dossier1/file123', 'dossier1/file123 devrait exister');
    assert.fileExists(context, '/root/testFile', 'testFile devrait exister');
    assert.fileExists(context, '/root/text.txt', 'text.txt devrait exister');
    
    // Essayer de supprimer avec wildcard (reproduit l'erreur exacte)
    clearCaptures();
    cmdRm(['dossier1/file*'], context);
    
    // Vérifier que les fichiers ont été supprimés
    assert.fileNotExists(context, '/root/dossier1/file1', 'dossier1/file1 devrait être supprimé');
    assert.fileNotExists(context, '/root/dossier1/file123', 'dossier1/file123 devrait être supprimé');
    
    // Le dossier dossier12 devrait toujours exister
    assert.fileExists(context, '/root/dossier1/dossier12', 'dossier1/dossier12 devrait toujours exister');
    assert.fileExists(context, '/root/dossier1', 'dossier1 devrait toujours exister');
    
    console.log('✅ Wildcard dans sous-dossier fonctionne');
    return true;
}

/**
 * Test de suppression avec wildcard multi-niveaux
 */
function testWildcardMultiLevel() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer une structure plus complexe
    cmdMkdir(['-p', 'project/src'], context);
    cmdTouch(['project/src/main.js'], context);
    cmdTouch(['project/src/utils.js'], context);
    cmdTouch(['project/src/config.json'], context);
    
    // Supprimer tous les .js
    clearCaptures();
    cmdRm(['project/src/*.js'], context);
    
    // Vérifier que seuls les .js ont été supprimés
    assert.fileNotExists(context, '/root/project/src/main.js', 'main.js devrait être supprimé');
    assert.fileNotExists(context, '/root/project/src/utils.js', 'utils.js devrait être supprimé');
    assert.fileExists(context, '/root/project/src/config.json', 'config.json devrait toujours exister');
    
    console.log('✅ Wildcard multi-niveau fonctionne');
    return true;
}

export const rmWildcardSubdirectoryTests = [
    createTest('Wildcard dans sous-dossier', testWildcardInSubdirectory),
    createTest('Wildcard multi-niveau', testWildcardMultiLevel)
];