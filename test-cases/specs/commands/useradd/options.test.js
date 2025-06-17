// test-cases/specs/commands/useradd/options.test.js - Tests des options pour useradd (VERSION DEBIAN COMPLÈTE)
import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdUseradd } from '../../../../bin/useradd.js';
import { parsePasswdFile, parseGroupFile } from '../../../../modules/users/user.service.js';

/**
 * Vérifie si une erreur correspond aux messages d'erreur attendus de useradd
 * @param {Array} captures - Messages capturés
 * @param {string} expectedType - Type d'erreur attendu
 * @returns {boolean} - true si l'erreur correspond
 */
function hasExpectedError(captures, expectedType) {
    return captures.some(capture => {
        if (capture.className !== 'error') return false;
        
        const text = capture.text;
        
        switch (expectedType) {
            case 'invalid_uid':
                return text.includes('UID invalide');
                
            case 'invalid_gid':
                return text.includes('GID invalide');
                
            case 'uid_in_use':
                return (text.includes('UID') && text.includes('déjà utilisé')) || 
                       text.includes('ERREUR useradd:');
                
            case 'unknown_option':
                return text.includes('option inconnue');
                
            default:
                return false;
        }
    });
}

/**
 * Test de l'option -u (spécifier UID)
 */
function testOptionU() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un utilisateur avec UID spécifique
    cmdUseradd(['-u', '1500', 'alice'], context);
    
    // COMPORTEMENT DEBIAN : Aucune sortie en cas de succès
    const captures = getCaptures();
    assert.captureCount(0, 'useradd ne devrait produire aucune sortie avec -u valide');
    
    // Vérifier que l'utilisateur a le bon UID
    const users = parsePasswdFile(context.fileSystem);
    const user = users.find(u => u.username === 'alice');
    
    assert.isTrue(user !== undefined, 'alice devrait être créée');
    assert.equals(user.uid, 1500, 'UID devrait être 1500');
    
    // DEBIAN : Vérifier qu'aucun home n'est créé par défaut
    assert.fileNotExists(context, '/home/alice', 'alice ne devrait pas avoir de home sans -m');
    
    console.log('✅ Option -u (UID spécifique) fonctionne (silencieuse, Debian)');
    return true;
}

/**
 * Test de l'option -g (spécifier GID)
 */
function testOptionG() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un utilisateur avec GID spécifique
    cmdUseradd(['-g', '1600', 'bob'], context);
    
    // COMPORTEMENT DEBIAN : Aucune sortie en cas de succès
    const captures = getCaptures();
    assert.captureCount(0, 'useradd ne devrait produire aucune sortie avec -g valide');
    
    // Vérifier que l'utilisateur a le bon GID
    const users = parsePasswdFile(context.fileSystem);
    const user = users.find(u => u.username === 'bob');
    
    assert.isTrue(user !== undefined, 'bob devrait être créé');
    assert.equals(user.gid, 1600, 'GID devrait être 1600');
    
    // DEBIAN : Vérifier qu'aucun home n'est créé par défaut
    assert.fileNotExists(context, '/home/bob', 'bob ne devrait pas avoir de home sans -m');
    
    console.log('✅ Option -g (GID spécifique) fonctionne (silencieuse, Debian)');
    return true;
}

/**
 * Test de l'option -d (spécifier répertoire home) - VERSION DEBIAN CORRIGÉE
 */
function testOptionD() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un utilisateur avec répertoire home personnalisé SANS -m
    cmdUseradd(['-d', '/opt/charlie', 'charlie'], context);
    
    // COMPORTEMENT DEBIAN : Aucune sortie en cas de succès
    const captures = getCaptures();
    assert.captureCount(0, 'useradd ne devrait produire aucune sortie avec -d valide');
    
    // Vérifier que l'utilisateur a le bon répertoire home dans /etc/passwd
    const users = parsePasswdFile(context.fileSystem);
    const user = users.find(u => u.username === 'charlie');
    
    assert.isTrue(user !== undefined, 'charlie devrait être créé');
    assert.equals(user.home, '/opt/charlie', 'Home devrait être /opt/charlie');
    
    // DEBIAN CRITIQUE: -d seule ne crée PAS le répertoire physique
    const homeExists = context.fileSystem['/opt/charlie'] !== undefined;
    assert.isFalse(homeExists, 'DEBIAN: -d seule ne crée PAS le répertoire physique');
    
    console.log('✅ Option -d (chemin home) fonctionne sans créer le répertoire (Debian)');
    return true;
}

/**
 * Test spécialisé: -d avec -m crée le répertoire
 */
function testOptionDWithM() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un utilisateur avec répertoire home personnalisé AVEC -m
    cmdUseradd(['-d', '/custom/homedir', '-m', 'customhome'], context);
    
    // COMPORTEMENT DEBIAN : Aucune sortie en cas de succès
    const captures = getCaptures();
    assert.captureCount(0, 'useradd -d -m ne devrait produire aucune sortie en cas de succès');
    
    // Vérifier que l'utilisateur a le bon répertoire home
    const users = parsePasswdFile(context.fileSystem);
    const user = users.find(u => u.username === 'customhome');
    
    assert.isTrue(user !== undefined, 'customhome devrait être créé');
    assert.equals(user.home, '/custom/homedir', 'Home devrait être /custom/homedir');
    
    // AVEC -m: Le répertoire DOIT être créé
    assert.fileExists(context, '/custom/homedir', 'Le répertoire home personnalisé devrait être créé avec -m');
    assert.isDirectory(context, '/custom/homedir', '/custom/homedir devrait être un dossier');
    
    console.log('✅ Option -d avec -m crée le répertoire personnalisé (Debian)');
    return true;
}

/**
 * Test de l'option -s (spécifier shell)
 */
function testOptionS() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un utilisateur avec shell personnalisé
    cmdUseradd(['-s', '/bin/zsh', 'dave'], context);
    
    // COMPORTEMENT DEBIAN : Aucune sortie en cas de succès
    const captures = getCaptures();
    assert.captureCount(0, 'useradd ne devrait produire aucune sortie avec -s valide');
    
    // Vérifier que l'utilisateur a le bon shell
    const users = parsePasswdFile(context.fileSystem);
    const user = users.find(u => u.username === 'dave');
    
    assert.isTrue(user !== undefined, 'dave devrait être créé');
    assert.equals(user.shell, '/bin/zsh', 'Shell devrait être /bin/zsh');
    
    // DEBIAN : Vérifier qu'aucun home n'est créé par défaut
    assert.fileNotExists(context, '/home/dave', 'dave ne devrait pas avoir de home sans -m');
    
    console.log('✅ Option -s (shell personnalisé) fonctionne (silencieuse, Debian)');
    return true;
}

/**
 * Test de l'option -c (spécifier commentaire GECOS)
 */
function testOptionC() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un utilisateur avec commentaire
    cmdUseradd(['-c', 'Eve User', 'eve'], context);
    
    // COMPORTEMENT DEBIAN : Aucune sortie en cas de succès
    const captures = getCaptures();
    assert.captureCount(0, 'useradd ne devrait produire aucune sortie avec -c valide');
    
    // Vérifier que l'utilisateur a le bon commentaire
    const users = parsePasswdFile(context.fileSystem);
    const user = users.find(u => u.username === 'eve');
    
    assert.isTrue(user !== undefined, 'eve devrait être créée');
    assert.equals(user.gecos, 'Eve User', 'GECOS devrait être "Eve User"');
    
    // DEBIAN : Vérifier qu'aucun home n'est créé par défaut
    assert.fileNotExists(context, '/home/eve', 'eve ne devrait pas avoir de home sans -m');
    
    console.log('✅ Option -c (commentaire GECOS) fonctionne (silencieuse, Debian)');
    return true;
}

/**
 * Test d'options combinées - VERSION DEBIAN CORRIGÉE
 */
function testCombinedOptions() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un utilisateur avec options combinées INCLUANT -m pour créer le home
    cmdUseradd(['-u', '2500', '-g', '2600', '-d', '/srv/frank', '-s', '/bin/zsh', '-c', 'Frank Admin', '-m', 'frank'], context);
    
    // COMPORTEMENT DEBIAN : Aucune sortie en cas de succès
    const captures = getCaptures();
    assert.captureCount(0, 'useradd avec options combinées ne devrait produire aucune sortie en cas de succès');
    
    // Vérifier que toutes les options ont été prises en compte
    const users = parsePasswdFile(context.fileSystem);
    const user = users.find(u => u.username === 'frank');
    
    assert.isTrue(user !== undefined, 'frank devrait être créé');
    assert.equals(user.uid, 2500, 'UID devrait être 2500');
    assert.equals(user.gid, 2600, 'GID devrait être 2600');
    assert.equals(user.home, '/srv/frank', 'Home devrait être /srv/frank');
    assert.equals(user.shell, '/bin/zsh', 'Shell devrait être /bin/zsh');
    assert.equals(user.gecos, 'Frank Admin', 'GECOS devrait être "Frank Admin"');
    
    // Vérifier que le répertoire home a été créé (grâce à -m)
    assert.fileExists(context, '/srv/frank', 'Le répertoire home devrait être créé avec -m');
    
    console.log('✅ Options combinées fonctionnent (silencieuses, Debian)');
    return true;
}

/**
 * Test d'erreur UID invalide
 */
function testInvalidUID() {
    clearCaptures();
    const context = createTestContext();
    
    // Tester UID négatif
    clearCaptures();
    cmdUseradd(['-u', '-500', 'invalid1'], context);
    
    let captures = getCaptures();
    let hasError = hasExpectedError(captures, 'invalid_uid');
    assert.isTrue(hasError, 'UID négatif devrait être invalide');
    
    // Tester UID non numérique
    clearCaptures();
    cmdUseradd(['-u', 'abc', 'invalid2'], context);
    
    captures = getCaptures();
    hasError = hasExpectedError(captures, 'invalid_uid');
    assert.isTrue(hasError, 'UID non numérique devrait être invalide');
    
    console.log('✅ Validation UID invalide fonctionne');
    return true;
}

/**
 * Test d'erreur GID invalide
 */
function testInvalidGID() {
    clearCaptures();
    const context = createTestContext();
    
    // Tester GID négatif
    clearCaptures();
    cmdUseradd(['-g', '-600', 'invalid3'], context);
    
    let captures = getCaptures();
    let hasError = hasExpectedError(captures, 'invalid_gid');
    assert.isTrue(hasError, 'GID négatif devrait être invalide');
    
    // Tester GID non numérique
    clearCaptures();
    cmdUseradd(['-g', 'xyz', 'invalid4'], context);
    
    captures = getCaptures();
    hasError = hasExpectedError(captures, 'invalid_gid');
    assert.isTrue(hasError, 'GID non numérique devrait être invalide');
    
    console.log('✅ Validation GID invalide fonctionne');
    return true;
}

/**
 * Test d'erreur UID déjà utilisé
 */
function testUIDInUse() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un utilisateur avec UID spécifique
    cmdUseradd(['-u', '3000', 'first'], context);
    
    clearCaptures(); // Vider les captures de la première création
    
    // Essayer de créer un autre utilisateur avec le même UID
    cmdUseradd(['-u', '3000', 'second'], context);
    
    // Vérifier qu'une erreur a été capturée
    const captures = getCaptures();
    const hasError = hasExpectedError(captures, 'uid_in_use');
    
    assert.isTrue(hasError, 'Une erreur devrait être affichée pour UID déjà utilisé');
    
    // Vérifier que le second utilisateur n'a pas été créé
    const users = parsePasswdFile(context.fileSystem);
    const secondUser = users.find(u => u.username === 'second');
    assert.isTrue(secondUser === undefined, 'second ne devrait pas être créé');
    
    console.log('✅ Erreur UID déjà utilisé fonctionne');
    return true;
}

/**
 * Test d'option inconnue
 */
function testUnknownOption() {
    clearCaptures();
    const context = createTestContext();
    
    // Essayer une option qui n'existe pas
    cmdUseradd(['-z', 'unknown'], context);
    
    // Vérifier qu'une erreur a été capturée
    const captures = getCaptures();
    const hasError = hasExpectedError(captures, 'unknown_option');
    
    assert.isTrue(hasError, 'Une erreur devrait être affichée pour option inconnue');
    
    console.log('✅ Erreur option inconnue fonctionne');
    return true;
}

/**
 * Test de l'option -m (créer home explicite)
 */
function testOptionM() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un utilisateur avec -m explicite
    cmdUseradd(['-m', 'grace'], context);
    
    // COMPORTEMENT DEBIAN : Aucune sortie en cas de succès
    const captures = getCaptures();
    assert.captureCount(0, 'useradd -m ne devrait produire aucune sortie en cas de succès');
    
    // Vérifier que l'utilisateur et son home ont été créés
    const users = parsePasswdFile(context.fileSystem);
    const user = users.find(u => u.username === 'grace');
    
    assert.isTrue(user !== undefined, 'grace devrait être créée');
    assert.fileExists(context, '/home/grace', 'Le répertoire home devrait être créé avec -m');
    
    console.log('✅ Option -m (créer home explicite) fonctionne (silencieuse, Debian)');
    return true;
}

/**
 * Test de valeurs par défaut sans options
 */
function testDefaultValues() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un utilisateur sans options
    cmdUseradd(['henry'], context);
    
    // COMPORTEMENT DEBIAN : Aucune sortie en cas de succès
    const captures = getCaptures();
    assert.captureCount(0, 'useradd sans options ne devrait produire aucune sortie en cas de succès');
    
    // Vérifier les valeurs par défaut
    const users = parsePasswdFile(context.fileSystem);
    const user = users.find(u => u.username === 'henry');
    
    assert.isTrue(user !== undefined, 'henry devrait être créé');
    assert.isTrue(user.uid >= 1000, 'UID par défaut devrait être >= 1000 (Debian)');
    assert.equals(user.gid, user.uid, 'GID par défaut devrait égaler UID (Debian)');
    assert.equals(user.home, '/home/henry', 'Home par défaut devrait être /home/username');
    assert.equals(user.shell, '/bin/bash', 'Shell par défaut devrait être /bin/bash');
    assert.equals(user.gecos, '', 'GECOS par défaut devrait être vide');
    assert.equals(user.password, 'x', 'Password field devrait être "x"');
    
    // DEBIAN : Vérifier qu'aucun home n'est créé par défaut
    assert.fileNotExists(context, '/home/henry', 'henry ne devrait pas avoir de home sans -m');
    
    console.log('✅ Valeurs par défaut correctes (Debian)');
    return true;
}

/**
 * Test de création de groupe principal automatique
 */
function testAutomaticGroupCreation() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un utilisateur sans spécifier de GID
    cmdUseradd(['ivan'], context);
    
    // COMPORTEMENT DEBIAN : Aucune sortie en cas de succès
    const captures = getCaptures();
    assert.captureCount(0, 'useradd ne devrait produire aucune sortie en cas de succès');
    
    // Vérifier que l'utilisateur a été créé
    const users = parsePasswdFile(context.fileSystem);
    const user = users.find(u => u.username === 'ivan');
    assert.isTrue(user !== undefined, 'ivan devrait être créé');
    
    // Vérifier qu'un groupe principal a été créé automatiquement
    const groups = parseGroupFile(context.fileSystem);
    const userGroup = groups.find(g => g.name === 'ivan');
    
    assert.isTrue(userGroup !== undefined, 'Un groupe principal "ivan" devrait être créé (Debian)');
    assert.equals(userGroup.gid, user.gid, 'Le GID du groupe devrait correspondre au GID de l\'utilisateur');
    assert.equals(userGroup.members.length, 0, 'Le groupe principal ne devrait pas avoir de membres explicites');
    
    // DEBIAN : Vérifier qu'aucun home n'est créé par défaut
    assert.fileNotExists(context, '/home/ivan', 'ivan ne devrait pas avoir de home sans -m');
    
    console.log('✅ Création automatique de groupe principal fonctionne (Debian)');
    return true;
}

/**
 * Test avec commentaire contenant des espaces et caractères spéciaux
 */
function testComplexGECOS() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un utilisateur avec commentaire complexe
    cmdUseradd(['-c', 'Jane Doe,Room 123,555-1234,555-5678', 'jane'], context);
    
    // COMPORTEMENT DEBIAN : Aucune sortie en cas de succès
    const captures = getCaptures();
    assert.captureCount(0, 'useradd avec GECOS complexe ne devrait produire aucune sortie en cas de succès');
    
    // Vérifier que l'utilisateur a été créé avec le bon commentaire
    const users = parsePasswdFile(context.fileSystem);
    const user = users.find(u => u.username === 'jane');
    
    assert.isTrue(user !== undefined, 'jane devrait être créée');
    assert.equals(user.gecos, 'Jane Doe,Room 123,555-1234,555-5678', 'GECOS complexe devrait être préservé');
    
    // DEBIAN : Vérifier qu'aucun home n'est créé par défaut
    assert.fileNotExists(context, '/home/jane', 'jane ne devrait pas avoir de home sans -m');
    
    console.log('✅ GECOS complexe avec espaces et caractères spéciaux fonctionne (Debian)');
    return true;
}

/**
 * Test d'ordre des options
 */
function testOptionsOrder() {
    clearCaptures();
    const context = createTestContext();
    
    // Créer un utilisateur avec options dans différents ordres
    cmdUseradd(['kate', '-u', '4000', '-d', '/var/kate', '-c', 'Kate User'], context);
    
    // COMPORTEMENT DEBIAN : Aucune sortie en cas de succès
    const captures = getCaptures();
    assert.captureCount(0, 'useradd avec ordre flexible ne devrait produire aucune sortie en cas de succès');
    
    // Vérifier que toutes les options ont été prises en compte
    const users = parsePasswdFile(context.fileSystem);
    const user = users.find(u => u.username === 'kate');
    
    assert.isTrue(user !== undefined, 'kate devrait être créée');
    assert.equals(user.uid, 4000, 'UID devrait être 4000 même avec nom en premier');
    assert.equals(user.home, '/var/kate', 'Home devrait être correct');
    assert.equals(user.gecos, 'Kate User', 'GECOS devrait être correct');
    
    // DEBIAN : Vérifier qu'aucun home n'est créé par défaut (pas de -m)
    assert.fileNotExists(context, '/var/kate', 'kate ne devrait pas avoir de home sans -m');
    
    console.log('✅ Ordre des options flexible fonctionne (Debian)');
    return true;
}

/**
 * Export des tests des options pour useradd - VERSION DEBIAN COMPLÈTE
 */
export const useraddOptionsTests = [
    createTest('Option -u (UID spécifique)', testOptionU),
    createTest('Option -g (GID spécifique)', testOptionG),
    createTest('Option -d (chemin home)', testOptionD),
    createTest('Option -d avec -m (crée répertoire)', testOptionDWithM),
    createTest('Option -s (shell)', testOptionS),
    createTest('Option -c (commentaire GECOS)', testOptionC),
    createTest('Options combinées', testCombinedOptions),
    createTest('UID invalide (erreur)', testInvalidUID),
    createTest('GID invalide (erreur)', testInvalidGID),
    createTest('UID déjà utilisé (erreur)', testUIDInUse),
    createTest('Option inconnue (erreur)', testUnknownOption),
    createTest('Option -m (créer home explicite)', testOptionM),
    createTest('Valeurs par défaut', testDefaultValues),
    createTest('Création groupe principal automatique', testAutomaticGroupCreation),
    createTest('GECOS complexe', testComplexGECOS),
    createTest('Ordre des options flexible', testOptionsOrder)
];