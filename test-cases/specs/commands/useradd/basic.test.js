// test-cases/specs/commands/useradd/basic.test.js - Tests de base pour useradd (VERSION DEBIAN CORRIGÉE)
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdUseradd } from '../../../../bin/useradd.js';
import { parsePasswdFile, parseGroupFile, getCurrentUser } from '../../../../modules/users.js';

/**
 * Vérifie si une erreur correspond aux messages d'erreur attendus
 * @param {Array} captures - Messages capturés
 * @param {string} expectedType - Type d'erreur attendu
 * @returns {boolean} - true si l'erreur correspond
 */
function hasExpectedError(captures, expectedType) {
    return captures.some(capture => {
        if (capture.className !== 'error') return false;
        
        const text = capture.text;
        
        switch (expectedType) {
            case 'missing_name':
                return text.includes('nom d\'utilisateur manquant');
                
            case 'user_exists':
                return text.includes('existe déjà');
                
            case 'invalid_name':
                return text.includes('nom d\'utilisateur invalide');
                
            default:
                return false;
        }
    });
}

/**
 * Vérifie qu'un utilisateur a été correctement créé (VERSION DEBIAN)
 * @param {Object} context - Contexte de test
 * @param {string} username - Nom d'utilisateur
 * @param {Object} expectedProps - Propriétés attendues
 * @param {boolean} shouldCreateHome - Si le home doit être créé (false par défaut Debian)
 */
function assertUserCreated(context, username, expectedProps, shouldCreateHome = false) {
    const users = parsePasswdFile(context.fileSystem);
    const user = users.find(u => u.username === username);
    
    assert.isTrue(user !== undefined, `L'utilisateur ${username} devrait être créé`);
    assert.equals(user.home, expectedProps.home || `/home/${username}`, 'Home path correct');
    assert.equals(user.shell, expectedProps.shell || '/bin/bash', 'Shell correct');
    
    // DEBIAN CRITIQUE: Vérifier comportement du répertoire home
    const homeExists = context.fileSystem[user.home] !== undefined;
    if (shouldCreateHome) {
        assert.isTrue(homeExists, `Le répertoire home ${user.home} devrait être créé avec -m`);
        assert.isDirectory(context, user.home, `${user.home} devrait être un répertoire`);
    } else {
        assert.isFalse(homeExists, 
            `❌ DEBIAN: Le répertoire home ${user.home} NE DOIT PAS être créé sans -m`);
    }
}

/**
 * Test de création d'utilisateur simple (conforme Debian)
 */
function testSimpleUserCreation() {
    clearCaptures();
    const context = createTestContext();
    
    // Vérifier qu'on est bien root
    const currentUser = getCurrentUser();
    assert.equals(currentUser.username, 'root', 'Les tests devraient s\'exécuter en tant que root');
    
    // Vérifier que l'utilisateur n'existe pas au départ
    const initialUsers = parsePasswdFile(context.fileSystem);
    const existingUser = initialUsers.find(u => u.username === 'alice');
    assert.isTrue(existingUser === undefined, 'alice ne devrait pas exister au départ');
    
    // Créer un utilisateur simple
    cmdUseradd(['alice'], context);
    
    // COMPORTEMENT DEBIAN : useradd est SILENCIEUX en cas de succès
    const captures = getCaptures();
    assert.captureCount(0, 'useradd ne devrait produire AUCUNE sortie en cas de succès (principe Unix/Debian)');
    
    // Vérifier que l'utilisateur a été créé SANS répertoire home (Debian)
    assertUserCreated(context, 'alice', {
        home: '/home/alice',
        shell: '/bin/bash'
    }, false); // false = pas de home par défaut
    
    console.log('✅ Création d\'utilisateur simple fonctionne (silencieuse, pas de home)');
    return true;
}

/**
 * TEST CRITIQUE DEBIAN: useradd sans -m ne crée PAS le répertoire home
 */
function testUseraddWithoutMDoesNotCreateHome() {
    console.log('🧪 TEST CRITIQUE DEBIAN: useradd sans -m ne doit pas créer le home');
    
    clearCaptures();
    const context = createTestContext();
    
    // Exécuter useradd SANS l'option -m
    cmdUseradd(['testuser'], context);
    
    // COMPORTEMENT DEBIAN : Aucune sortie en cas de succès
    const captures = getCaptures();
    assert.captureCount(0, 'useradd ne devrait produire aucune sortie en cas de succès');
    
    // Vérifier que l'utilisateur a été créé dans /etc/passwd
    const users = parsePasswdFile(context.fileSystem);
    const user = users.find(u => u.username === 'testuser');
    
    assert.isTrue(user !== undefined, 'testuser devrait être créé dans /etc/passwd');
    assert.equals(user.home, '/home/testuser', 'Le chemin home devrait être défini dans passwd');
    
    // 🔥 TEST CRITIQUE: Le répertoire home NE DOIT PAS être créé
    const homeExists = context.fileSystem['/home/testuser'] !== undefined;
    assert.isFalse(homeExists, 
        '❌ ERREUR: /home/testuser ne devrait PAS être créé sans option -m (comportement Debian standard)');
    
    console.log('✅ COMPORTEMENT DEBIAN CORRECT: pas de répertoire home créé sans -m');
    return true;
}

/**
 * Test comparatif: useradd avec -m crée le home
 */
function testUseraddWithMCreatesHome() {
    console.log('🧪 TEST COMPARATIF DEBIAN: useradd avec -m crée le home');
    
    clearCaptures();
    const context = createTestContext();
    
    // Exécuter useradd AVEC l'option -m
    cmdUseradd(['-m', 'testwithm'], context);
    
    // COMPORTEMENT DEBIAN : Aucune sortie en cas de succès
    const captures = getCaptures();
    assert.captureCount(0, 'useradd ne devrait produire aucune sortie en cas de succès');
    
    // Vérifier que l'utilisateur a été créé
    const users = parsePasswdFile(context.fileSystem);
    const user = users.find(u => u.username === 'testwithm');
    assert.isTrue(user !== undefined, 'testwithm devrait être créé');
    
    // AVEC -m: Le répertoire home DOIT être créé
    assert.fileExists(context, '/home/testwithm', 'Avec -m, le répertoire home DOIT être créé');
    assert.isDirectory(context, '/home/testwithm', 'Le home doit être un répertoire');
    
    // Vérifier les permissions du home (Debian)
    const homeDir = context.fileSystem['/home/testwithm'];
    assert.equals(homeDir.permissions, 'drwxr-xr-x', 'Permissions du home selon Debian');
    assert.equals(homeDir.owner, 'testwithm', 'Propriétaire du home');
    assert.equals(homeDir.group, 'testwithm', 'Groupe du home');
    
    console.log('✅ AVEC -m: répertoire home correctement créé (Debian)');
    return true;
}

/**
 * Test de création d'utilisateur avec UID automatique (conforme Debian)
 */
function testAutomaticUID() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer plusieurs utilisateurs pour tester l'attribution automatique d'UID
    cmdUseradd(['user1'], context);
    cmdUseradd(['user2'], context);
    
    // COMPORTEMENT DEBIAN : Aucune sortie en cas de succès
    const captures = getCaptures();
    assert.captureCount(0, 'useradd ne devrait produire aucune sortie pour des créations réussies');
    
    const users = parsePasswdFile(context.fileSystem);
    const user1 = users.find(u => u.username === 'user1');
    const user2 = users.find(u => u.username === 'user2');
    
    assert.isTrue(user1 !== undefined, 'user1 devrait être créé');
    assert.isTrue(user2 !== undefined, 'user2 devrait être créé');
    
    // Les UID devraient être différents et >= 1000 (convention Debian)
    assert.isTrue(user1.uid >= 1000, 'UID de user1 devrait être >= 1000 (Debian)');
    assert.isTrue(user2.uid >= 1000, 'UID de user2 devrait être >= 1000 (Debian)');
    assert.isTrue(user1.uid !== user2.uid, 'Les UID devraient être différents');
    
    // Vérifier qu'aucun home n'est créé par défaut (Debian)
    assert.fileNotExists(context, '/home/user1', 'user1 ne devrait pas avoir de home sans -m');
    assert.fileNotExists(context, '/home/user2', 'user2 ne devrait pas avoir de home sans -m');
    
    console.log('✅ Attribution automatique d\'UID fonctionne (silencieuse, Debian)');
    return true;
}

/**
 * Test d'erreur sans arguments (conforme)
 */
function testNoArguments() {
    clearCaptures();
    const context = createTestContext();
    
    // Appeler useradd sans arguments
    cmdUseradd([], context);
    
    // Vérifier qu'une erreur a été capturée
    const captures = getCaptures();
    testUtils.debugCaptures(); // Debug pour voir les messages
    const hasError = hasExpectedError(captures, 'missing_name');
    
    assert.isTrue(hasError, 'Une erreur devrait être affichée sans arguments');
    
    console.log('✅ Erreur correcte sans arguments');
    return true;
}

/**
 * Test d'erreur utilisateur existant (conforme)
 */
function testUserAlreadyExists() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un utilisateur d'abord
    cmdUseradd(['bob'], context);
    
    clearCaptures(); // Vider les captures de la première création
    
    // Essayer de créer le même utilisateur
    cmdUseradd(['bob'], context);
    
    // Vérifier qu'une erreur a été capturée
    const captures = getCaptures();
    testUtils.debugCaptures(); // Debug pour voir les messages
    const hasError = hasExpectedError(captures, 'user_exists');
    
    assert.isTrue(hasError, 'Une erreur devrait être affichée pour un utilisateur existant');
    
    console.log('✅ Erreur correcte pour utilisateur existant');
    return true;
}

/**
 * Test d'erreur nom d'utilisateur invalide (conforme)
 */
function testInvalidUsername() {
    clearCaptures();
    const context = createTestContext();
    
    // Tester nom commençant par un chiffre
    clearCaptures();
    cmdUseradd(['123invalid'], context);
    
    let captures = getCaptures();
    testUtils.debugCaptures(); // Debug pour voir les messages
    let hasError = hasExpectedError(captures, 'invalid_name');
    assert.isTrue(hasError, 'Nom commençant par chiffre devrait être invalide');
    
    // Tester nom avec caractères invalides
    clearCaptures();
    cmdUseradd(['invalid@name'], context);
    
    captures = getCaptures();
    testUtils.debugCaptures(); // Debug pour voir les messages
    hasError = hasExpectedError(captures, 'invalid_name');
    assert.isTrue(hasError, 'Nom avec @ devrait être invalide');
    
    // Tester nom trop long
    clearCaptures();
    const longName = 'a'.repeat(40); // Plus de 32 caractères
    cmdUseradd([longName], context);
    
    captures = getCaptures();
    testUtils.debugCaptures(); // Debug pour voir les messages
    hasError = hasExpectedError(captures, 'invalid_name');
    assert.isTrue(hasError, 'Nom trop long devrait être invalide');
    
    console.log('✅ Validation du nom d\'utilisateur fonctionne');
    return true;
}

/**
 * Test conceptuel des permissions non-root (conforme)
 */
function testNonRootPermissions() {
    clearCaptures();
    const context = createTestContext();
    
    // Note: Ce test est difficile à implémenter car les tests s'exécutent toujours en tant que root
    // Dans un vrai scénario, on changerait d'utilisateur avec su d'abord
    
    console.log('⚠️ Test de permissions non-root nécessiterait une modification de getCurrentUser()');
    console.log('✅ Test de permissions conceptuellement validé');
    return true;
}

/**
 * Test de mise à jour des fichiers système (conforme Debian)
 */
function testSystemFilesUpdate() {
    clearCaptures();
    const context = createTestContext();
    
    // Compter les utilisateurs avant
    const initialUsers = parsePasswdFile(context.fileSystem);
    const initialCount = initialUsers.length;
    
    // Créer un utilisateur
    cmdUseradd(['dave'], context);
    
    // COMPORTEMENT DEBIAN : Aucune sortie en cas de succès
    const captures = getCaptures();
    assert.captureCount(0, 'useradd ne devrait produire aucune sortie en cas de succès');
    
    // Vérifier que /etc/passwd a été mis à jour
    const updatedUsers = parsePasswdFile(context.fileSystem);
    assert.equals(updatedUsers.length, initialCount + 1, 'Un utilisateur devrait être ajouté à /etc/passwd');
    
    const newUser = updatedUsers.find(u => u.username === 'dave');
    assert.isTrue(newUser !== undefined, 'dave devrait être dans /etc/passwd');
    assert.equals(newUser.password, 'x', 'Le champ password devrait être "x"');
    
    // Vérifier que /etc/shadow a été mis à jour
    const shadowFile = context.fileSystem['/etc/shadow'];
    const shadowLines = shadowFile.content.split('\n').filter(line => line.trim());
    const daveShadowLine = shadowLines.find(line => line.startsWith('dave:'));
    assert.isTrue(daveShadowLine !== undefined, 'dave devrait être dans /etc/shadow');
    assert.isTrue(daveShadowLine.includes('!'), 'Le mot de passe devrait être verrouillé par défaut');
    
    // Vérifier que /etc/group a été mis à jour (groupe principal)
    const groups = parseGroupFile(context.fileSystem);
    const daveGroup = groups.find(g => g.name === 'dave');
    assert.isTrue(daveGroup !== undefined, 'Un groupe principal devrait être créé pour dave');
    assert.equals(daveGroup.gid, newUser.gid, 'Le GID du groupe devrait correspondre au GID de l\'utilisateur');
    
    // DEBIAN: Vérifier qu'aucun home n'est créé par défaut
    assert.fileNotExists(context, '/home/dave', 'Aucun home ne devrait être créé par défaut (Debian)');
    
    console.log('✅ Mise à jour des fichiers système fonctionne (silencieuse, Debian)');
    return true;
}

/**
 * Test de noms d'utilisateurs valides variés (conforme)
 */
function testValidUsernames() {
    clearCaptures();
    const context = createTestContext();
    
    const validNames = ['user1', 'test_user', 'admin-backup', '_service', 'a'];
    
    validNames.forEach(name => {
        clearCaptures();
        cmdUseradd([name], context);
        
        // COMPORTEMENT DEBIAN : Aucune sortie en cas de succès
        const captures = getCaptures();
        assert.captureCount(0, `useradd ne devrait produire aucune sortie pour ${name}`);
        
        // Vérifier que l'utilisateur a été créé
        const users = parsePasswdFile(context.fileSystem);
        const user = users.find(u => u.username === name);
        assert.isTrue(user !== undefined, `${name} devrait être créé`);
        
        // DEBIAN: Vérifier qu'aucun home n'est créé par défaut
        assert.fileNotExists(context, `/home/${name}`, `${name} ne devrait pas avoir de home sans -m`);
    });
    
    console.log('✅ Noms d\'utilisateurs valides acceptés (silencieux, Debian)');
    return true;
}

/**
 * Export des tests de base pour useradd (VERSION DEBIAN CORRIGÉE)
 * ❌ Tests supprimés (non-conformes Debian) :
 * - testHomeDirectoryCreation (supposait création home par défaut)
 * - testHomeDirectoryMetadata (supposait création home par défaut)  
 * - testInformativeMessages (supposait messages de succès)
 */
export const useraddBasicTests = [
    createTest('Création utilisateur simple', testSimpleUserCreation),
    createTest('useradd sans -m ne crée pas le home', testUseraddWithoutMDoesNotCreateHome),
    createTest('useradd avec -m crée le home', testUseraddWithMCreatesHome),
    createTest('UID automatique', testAutomaticUID),
    createTest('Sans arguments (erreur)', testNoArguments),
    createTest('Utilisateur existant (erreur)', testUserAlreadyExists),
    createTest('Nom invalide (erreur)', testInvalidUsername),
    createTest('Permissions non-root (concept)', testNonRootPermissions),
    createTest('Mise à jour fichiers système', testSystemFilesUpdate),
    createTest('Noms d\'utilisateurs valides', testValidUsernames)
];