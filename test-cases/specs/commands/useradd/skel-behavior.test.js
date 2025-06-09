// test-cases/specs/commands/useradd/skel-behavior.test.js
// Test pour vérifier le comportement Debian avec /etc/skel

import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdUseradd } from '../../../../bin/useradd.js';
import { parsePasswdFile, parseGroupFile, getCurrentUser } from '../../../../modules/users/user.service.js';

/**
 * Test principal: useradd -m doit copier les fichiers depuis /etc/skel
 */
function testUseraddMCopiesSkelFiles() {
    console.log('🧪 TEST CRITIQUE: useradd -m copie les fichiers /etc/skel (comportement Debian)');
    
    clearCaptures();
    const context = createTestContext();
    
    // AVANT: Vérifier que /etc/skel existe et contient des fichiers
    assert.fileExists(context, '/etc/skel', '/etc/skel devrait être créé automatiquement');
    assert.isDirectory(context, '/etc/skel', '/etc/skel devrait être un répertoire');
    
    // Vérifier que les fichiers de base Debian sont présents dans /etc/skel
    const expectedSkelFiles = [
        '/etc/skel/.bashrc',
        '/etc/skel/.profile', 
        '/etc/skel/.bash_logout',
        '/etc/skel/.vimrc'
    ];
    
    expectedSkelFiles.forEach(filePath => {
        assert.fileExists(context, filePath, `${filePath} devrait être présent dans /etc/skel`);
        assert.isFile(context, filePath, `${filePath} devrait être un fichier`);
    });
    
    // Sauvegarder le contenu de .bashrc dans /etc/skel pour comparaison
    const skelBashrc = context.fileSystem['/etc/skel/.bashrc'];
    assert.isTrue(skelBashrc && skelBashrc.content, '/etc/skel/.bashrc devrait avoir du contenu');
    const skelBashrcContent = skelBashrc.content;
    
    // EXÉCUTER: Créer un utilisateur avec l'option -m
    cmdUseradd(['-m', 'alice'], context);
    
    // COMPORTEMENT DEBIAN : Aucune sortie en cas de succès
    const captures = getCaptures();
    assert.captureCount(0, 'useradd -m ne devrait produire aucune sortie en cas de succès');
    
    // VÉRIFIER: L'utilisateur a été créé
    const users = parsePasswdFile(context.fileSystem);
    const user = users.find(u => u.username === 'alice');
    assert.isTrue(user !== undefined, 'alice devrait être créé');
    assert.equals(user.home, '/home/alice', 'alice devrait avoir /home/alice comme répertoire home');
    
    // VÉRIFIER: Le répertoire home existe
    assert.fileExists(context, '/home/alice', 'Le répertoire home /home/alice devrait être créé avec -m');
    assert.isDirectory(context, '/home/alice', '/home/alice devrait être un répertoire');
    
    // 🔥 VÉRIFICATION CRITIQUE: Les fichiers /etc/skel ont été copiés
    const expectedHomeFiles = [
        '/home/alice/.bashrc',
        '/home/alice/.profile',
        '/home/alice/.bash_logout', 
        '/home/alice/.vimrc'
    ];
    
    expectedHomeFiles.forEach(filePath => {
        assert.fileExists(context, filePath, 
            `❌ ERREUR CRITIQUE: ${filePath} devrait être copié depuis /etc/skel (comportement Debian standard)`);
        assert.isFile(context, filePath, `${filePath} devrait être un fichier`);
    });
    
    // VÉRIFIER: Le contenu des fichiers a été copié correctement
    const homeBashrc = context.fileSystem['/home/alice/.bashrc'];
    assert.isTrue(homeBashrc && homeBashrc.content, '/home/alice/.bashrc devrait avoir du contenu');
    assert.equals(homeBashrc.content, skelBashrcContent, 
        'Le contenu de .bashrc devrait être identique à celui de /etc/skel/.bashrc');
    
    // VÉRIFIER: Les permissions et propriétaires sont corrects (Debian)
    const homeDir = context.fileSystem['/home/alice'];
    assert.equals(homeDir.owner, 'alice', 'Le répertoire home devrait appartenir à alice');
    assert.equals(homeDir.group, 'alice', 'Le groupe du répertoire home devrait être alice');
    assert.equals(homeDir.permissions, 'drwxr-xr-x', 'Permissions du home selon Debian');
    
    // VÉRIFIER: Les fichiers copiés appartiennent au bon utilisateur
    expectedHomeFiles.forEach(filePath => {
        const file = context.fileSystem[filePath];
        assert.equals(file.owner, 'alice', `${filePath} devrait appartenir à alice`);
        assert.equals(file.group, 'alice', `${filePath} devrait avoir le groupe alice`);
    });
    
    console.log('✅ COMPORTEMENT DEBIAN CORRECT: /etc/skel copié dans le home avec -m');
    console.log(`✅ Fichiers copiés: ${expectedHomeFiles.length} fichiers depuis /etc/skel`);
    return true;
}

/**
 * Test de comparaison: useradd sans -m ne copie rien
 */
function testUseraddWithoutMDoesNotCopyFiles() {
    console.log('🧪 TEST COMPARATIF: useradd sans -m ne copie pas /etc/skel');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer un utilisateur SANS l'option -m
    cmdUseradd(['bob'], context);
    
    // COMPORTEMENT DEBIAN : Aucune sortie en cas de succès
    const captures = getCaptures();
    assert.captureCount(0, 'useradd sans -m ne devrait produire aucune sortie');
    
    // Vérifier que l'utilisateur a été créé dans /etc/passwd
    const users = parsePasswdFile(context.fileSystem);
    const user = users.find(u => u.username === 'bob');
    assert.isTrue(user !== undefined, 'bob devrait être créé dans /etc/passwd');
    assert.equals(user.home, '/home/bob', 'bob devrait avoir /home/bob défini dans passwd');
    
    // VÉRIFIER: Le répertoire home NE DOIT PAS être créé
    assert.fileNotExists(context, '/home/bob', 
        '❌ /home/bob ne devrait PAS être créé sans option -m (comportement Debian)');
    
    // DONC: Aucun fichier de /etc/skel ne devrait être copié
    const skelFiles = [
        '/home/bob/.bashrc',
        '/home/bob/.profile',
        '/home/bob/.bash_logout',
        '/home/bob/.vimrc'
    ];
    
    skelFiles.forEach(filePath => {
        assert.fileNotExists(context, filePath, 
            `${filePath} ne devrait PAS exister car le home n'est pas créé`);
    });
    
    console.log('✅ COMPORTEMENT DEBIAN CORRECT: aucune copie de /etc/skel sans -m');
    return true;
}

/**
 * Test de vérification du contenu des fichiers /etc/skel par défaut
 */
function testSkelDefaultContent() {
    console.log('🧪 TEST: Contenu par défaut de /etc/skel (fichiers Debian standards)');
    
    const context = createTestContext();
    
    // Vérifier que /etc/skel contient les fichiers standards Debian
    const skelBashrc = context.fileSystem['/etc/skel/.bashrc'];
    assert.isTrue(skelBashrc && skelBashrc.content, '/etc/skel/.bashrc devrait exister avec du contenu');
    
    // Vérifier quelques éléments du contenu .bashrc
    const bashrcContent = skelBashrc.content;
    assert.isTrue(bashrcContent.includes('HISTSIZE=1000'), '.bashrc devrait contenir HISTSIZE=1000');
    assert.isTrue(bashrcContent.includes('alias ll='), '.bashrc devrait contenir l\'alias ll');
    assert.isTrue(bashrcContent.includes('debian_chroot'), '.bashrc devrait contenir les variables Debian');
    
    // Vérifier .profile
    const skelProfile = context.fileSystem['/etc/skel/.profile'];
    assert.isTrue(skelProfile && skelProfile.content, '/etc/skel/.profile devrait exister');
    assert.isTrue(skelProfile.content.includes('if [ -n "$BASH_VERSION" ]'), 
        '.profile devrait contenir la logique bash');
    
    // Vérifier .bash_logout
    const skelLogout = context.fileSystem['/etc/skel/.bash_logout'];
    assert.isTrue(skelLogout && skelLogout.content, '/etc/skel/.bash_logout devrait exister');
    assert.isTrue(skelLogout.content.includes('clear_console'), 
        '.bash_logout devrait contenir clear_console');
    
    // Vérifier .vimrc
    const skelVimrc = context.fileSystem['/etc/skel/.vimrc'];
    assert.isTrue(skelVimrc && skelVimrc.content, '/etc/skel/.vimrc devrait exister');
    assert.isTrue(skelVimrc.content.includes('syntax on'), '.vimrc devrait activer la coloration syntaxique');
    
    console.log('✅ Contenu par défaut de /etc/skel conforme aux standards Debian');
    return true;
}

/**
 * Test avec un répertoire home personnalisé
 */
function testUseraddMWithCustomHome() {
    console.log('🧪 TEST: useradd -m -d avec répertoire home personnalisé copie /etc/skel');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer un utilisateur avec home personnalisé et -m
    cmdUseradd(['-m', '-d', '/opt/charlie', 'charlie'], context);
    
    // COMPORTEMENT DEBIAN : Aucune sortie en cas de succès
    const captures = getCaptures();
    assert.captureCount(0, 'useradd -m -d ne devrait produire aucune sortie');
    
    // Vérifier que l'utilisateur a été créé avec le bon home
    const users = parsePasswdFile(context.fileSystem);
    const user = users.find(u => u.username === 'charlie');
    assert.isTrue(user !== undefined, 'charlie devrait être créé');
    assert.equals(user.home, '/opt/charlie', 'charlie devrait avoir /opt/charlie comme home');
    
    // Vérifier que le répertoire personnalisé a été créé
    assert.fileExists(context, '/opt/charlie', 'Le répertoire home personnalisé devrait être créé');
    assert.isDirectory(context, '/opt/charlie', '/opt/charlie devrait être un répertoire');
    
    // VÉRIFIER: Les fichiers /etc/skel ont été copiés dans le home personnalisé
    const expectedFiles = [
        '/opt/charlie/.bashrc',
        '/opt/charlie/.profile',
        '/opt/charlie/.bash_logout',
        '/opt/charlie/.vimrc'
    ];
    
    expectedFiles.forEach(filePath => {
        assert.fileExists(context, filePath, 
            `${filePath} devrait être copié depuis /etc/skel dans le home personnalisé`);
        
        const file = context.fileSystem[filePath];
        assert.equals(file.owner, 'charlie', `${filePath} devrait appartenir à charlie`);
        assert.equals(file.group, 'charlie', `${filePath} devrait avoir le groupe charlie`);
    });
    
    console.log('✅ Copie de /etc/skel fonctionne avec un répertoire home personnalisé');
    return true;
}

// Exporter les tests
export const tests = [
    createTest('useradd -m copie les fichiers /etc/skel', testUseraddMCopiesSkelFiles),
    createTest('useradd sans -m ne copie pas /etc/skel', testUseraddWithoutMDoesNotCopyFiles),
    createTest('Contenu par défaut de /etc/skel', testSkelDefaultContent),
    createTest('useradd -m avec home personnalisé', testUseraddMWithCustomHome)
];

export default tests;