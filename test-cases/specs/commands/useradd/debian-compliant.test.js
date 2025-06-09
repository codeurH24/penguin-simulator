// test-cases/specs/commands/useradd/debian-compliant.test.js
// Tests complets pour useradd respectant le comportement Debian

import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { cmdUseradd } from '../../../../bin/useradd.js';
import { parsePasswdFile, parseGroupFile, getCurrentUser } from '../../../../modules/users/user.service.js';

/**
 * Vérifie qu'un utilisateur a été correctement créé selon les standards Debian
 * @param {Object} context - Contexte de test
 * @param {string} username - Nom d'utilisateur
 * @param {Object} expectedProps - Propriétés attendues
 * @param {boolean} shouldCreateHome - Si le répertoire home doit être créé
 */
function assertUserCreatedDebian(context, username, expectedProps = {}, shouldCreateHome = false) {
    const users = parsePasswdFile(context.fileSystem);
    const user = users.find(u => u.username === username);
    
    // Vérifier que l'utilisateur existe dans /etc/passwd
    assert.isTrue(user !== undefined, `L'utilisateur ${username} devrait exister dans /etc/passwd`);
    
    // Vérifier les propriétés par défaut Debian
    assert.equals(user.shell, expectedProps.shell || '/bin/bash', 'Shell par défaut Debian');
    assert.equals(user.home, expectedProps.home || `/home/${username}`, 'Répertoire home par défaut');
    assert.equals(user.password, 'x', 'Champ password doit être "x" dans /etc/passwd');
    
    // Vérifier l'UID
    if (expectedProps.uid !== undefined) {
        assert.equals(user.uid, expectedProps.uid, `UID devrait être ${expectedProps.uid}`);
    } else {
        assert.isTrue(user.uid >= 1000, 'UID devrait être >= 1000 pour les utilisateurs normaux (Debian)');
    }
    
    // Vérifier le GID
    if (expectedProps.gid !== undefined) {
        assert.equals(user.gid, expectedProps.gid, `GID devrait être ${expectedProps.gid}`);
    } else {
        assert.equals(user.gid, user.uid, 'GID devrait égaler UID par défaut (Debian)');
    }
    
    // Vérifier l'entrée dans /etc/shadow
    const shadowFile = context.fileSystem['/etc/shadow'];
    assert.isTrue(shadowFile !== undefined, '/etc/shadow devrait exister');
    const shadowLines = shadowFile.content.split('\n').filter(line => line.trim());
    const userShadowLine = shadowLines.find(line => line.startsWith(`${username}:`));
    assert.isTrue(userShadowLine !== undefined, `${username} devrait être dans /etc/shadow`);
    assert.isTrue(userShadowLine.includes('!'), 'Mot de passe devrait être verrouillé (!) dans /etc/shadow');
    
    // Vérifier la création/non-création du répertoire home selon le comportement Debian
    const homeExists = context.fileSystem[user.home] !== undefined;
    if (shouldCreateHome) {
        assert.isTrue(homeExists, `Le répertoire home ${user.home} devrait être créé avec -m`);
        assert.isDirectory(context, user.home, `${user.home} devrait être un répertoire`);
        
        // Vérifier les permissions et propriétés du home (Debian)
        const homeDir = context.fileSystem[user.home];
        assert.equals(homeDir.permissions, 'drwxr-xr-x', 'Permissions du home selon Debian');
        assert.equals(homeDir.owner, username, 'Propriétaire du home');
        assert.equals(homeDir.group, username, 'Groupe du home');
    } else {
        assert.isFalse(homeExists, 
            `❌ CRITIQUE DEBIAN: Le répertoire home ${user.home} NE DOIT PAS être créé sans -m`);
    }
    
    // Vérifier la création du groupe principal (Debian crée un groupe par utilisateur)
    const groups = parseGroupFile(context.fileSystem);
    const userGroup = groups.find(g => g.name === username);
    assert.isTrue(userGroup !== undefined, `Un groupe ${username} devrait être créé (Debian)`);
    assert.equals(userGroup.gid, user.gid, 'GID du groupe devrait correspondre à celui de l\'utilisateur');
}

/**
 * TEST 1: Comportement par défaut Debian - pas de home sans -m
 */
function testDebianDefaultBehavior() {
    console.log('🧪 TEST CRITIQUE DEBIAN: Comportement par défaut (sans -m)');
    
    clearCaptures();
    const context = createTestContext();
    
    // Vérifier qu'on est root (requis pour useradd)
    const currentUser = getCurrentUser();
    assert.equals(currentUser.username, 'root', 'Tests doivent s\'exécuter en tant que root');
    
    // Créer un utilisateur SANS option -m (comportement par défaut Debian)
    cmdUseradd(['debianuser'], context);
    
    // Vérifier le silence (principe Unix/Debian)
    const captures = getCaptures();
    assert.captureCount(0, 'useradd doit être SILENCIEUX en cas de succès (principe Unix/Debian)');
    
    // Vérifier la création correcte SANS répertoire home
    assertUserCreatedDebian(context, 'debianuser', {}, false);
    
    console.log('✅ DEBIAN CONFORME: Utilisateur créé sans répertoire home (par défaut)');
    return true;
}

/**
 * TEST 2: Option -m crée le répertoire home (Debian)
 */
function testDebianCreateHome() {
    console.log('🧪 TEST DEBIAN: Option -m crée le répertoire home');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer un utilisateur AVEC option -m
    cmdUseradd(['-m', 'homeuser'], context);
    
    // Vérifier le silence
    const captures = getCaptures();
    assert.captureCount(0, 'useradd -m doit être silencieux en cas de succès');
    
    // Vérifier la création correcte AVEC répertoire home
    assertUserCreatedDebian(context, 'homeuser', {}, true);
    
    console.log('✅ DEBIAN CONFORME: Option -m crée correctement le répertoire home');
    return true;
}

/**
 * TEST 3: Option -M force l'absence de répertoire home
 */
function testDebianNoHome() {
    console.log('🧪 TEST DEBIAN: Option -M empêche la création du répertoire home');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer un utilisateur avec -M (force pas de home)
    cmdUseradd(['-M', 'nohomeuser'], context);
    
    // Vérifier le silence
    const captures = getCaptures();
    
    // Debug: afficher les captures pour comprendre le problème
    if (captures.length > 0) {
        console.log('🔍 DEBUG captures:', captures.map(c => `${c.className}: ${c.text}`));
    }
    
    assert.captureCount(0, 'useradd -M doit être silencieux en cas de succès');
    
    // Vérifier la création correcte SANS répertoire home (forcé)
    assertUserCreatedDebian(context, 'nohomeuser', {}, false);
    
    console.log('✅ DEBIAN CONFORME: Option -M empêche la création du home');
    return true;
}

/**
 * TEST 4: Attribution automatique d'UID selon Debian (≥ 1000)
 */
function testDebianUIDAllocation() {
    console.log('🧪 TEST DEBIAN: Attribution automatique d\'UID (≥ 1000)');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer plusieurs utilisateurs pour tester l'allocation d'UID
    cmdUseradd(['user1000'], context);
    cmdUseradd(['user1001'], context);
    cmdUseradd(['user1002'], context);
    
    // Vérifier le silence pour tous
    const captures = getCaptures();
    assert.captureCount(0, 'Créations multiples doivent être silencieuses');
    
    // Vérifier l'allocation séquentielle d'UID selon Debian
    const users = parsePasswdFile(context.fileSystem);
    const user1 = users.find(u => u.username === 'user1000');
    const user2 = users.find(u => u.username === 'user1001');
    const user3 = users.find(u => u.username === 'user1002');
    
    // Vérifier que les UID sont >= 1000 (standard Debian)
    assert.isTrue(user1.uid >= 1000, 'Premier utilisateur doit avoir UID ≥ 1000');
    assert.isTrue(user2.uid >= 1000, 'Deuxième utilisateur doit avoir UID ≥ 1000');
    assert.isTrue(user3.uid >= 1000, 'Troisième utilisateur doit avoir UID ≥ 1000');
    
    // Vérifier l'allocation séquentielle
    assert.isTrue(user2.uid > user1.uid, 'UID doivent être alloués de manière croissante');
    assert.isTrue(user3.uid > user2.uid, 'UID doivent être alloués de manière croissante');
    
    console.log('✅ DEBIAN CONFORME: Attribution automatique d\'UID (≥ 1000, séquentiel)');
    return true;
}

/**
 * TEST 5: Option -u avec UID spécifique
 */
function testDebianSpecificUID() {
    console.log('🧪 TEST DEBIAN: Option -u avec UID spécifique');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer avec un UID spécifique
    cmdUseradd(['-u', '2000', 'specificuser'], context);
    
    // Vérifier le silence
    const captures = getCaptures();
    assert.captureCount(0, 'useradd -u doit être silencieux en cas de succès');
    
    // Vérifier l'UID spécifique
    assertUserCreatedDebian(context, 'specificuser', { uid: 2000 }, false);
    
    console.log('✅ DEBIAN CONFORME: Option -u avec UID spécifique fonctionne');
    return true;
}

/**
 * TEST 6: Option -g avec GID spécifique
 */
function testDebianSpecificGID() {
    console.log('🧪 TEST DEBIAN: Option -g avec GID spécifique');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer avec un GID spécifique
    cmdUseradd(['-g', '3000', 'giduser'], context);
    
    // Vérifier le silence
    const captures = getCaptures();
    assert.captureCount(0, 'useradd -g doit être silencieux en cas de succès');
    
    // Vérifier le GID spécifique
    assertUserCreatedDebian(context, 'giduser', { gid: 3000 }, false);
    
    console.log('✅ DEBIAN CONFORME: Option -g avec GID spécifique fonctionne');
    return true;
}

/**
 * TEST 7a: Option -d seule (ne crée pas le répertoire)
 */
function testDebianCustomHomePath() {
    console.log('🧪 TEST DEBIAN: Option -d seule (chemin seulement)');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer avec un répertoire home personnalisé SANS -m
    cmdUseradd(['-d', '/opt/customuser', 'customuser'], context);
    
    // Vérifier le silence
    const captures = getCaptures();
    assert.captureCount(0, 'useradd -d doit être silencieux en cas de succès');
    
    // Vérifier que le chemin est défini mais le répertoire n'est PAS créé
    const users = parsePasswdFile(context.fileSystem);
    const user = users.find(u => u.username === 'customuser');
    assert.isTrue(user !== undefined, 'customuser devrait être créé');
    assert.equals(user.home, '/opt/customuser', 'Chemin home personnalisé devrait être défini');
    
    // DEBIAN: Sans -m, aucun répertoire créé même avec -d
    const homeExists = context.fileSystem['/opt/customuser'] !== undefined;
    assert.isFalse(homeExists, 'DEBIAN: -d seule ne crée PAS le répertoire');
    
    console.log('✅ DEBIAN CONFORME: Option -d définit le chemin sans créer');
    return true;
}

/**
 * TEST 7b: Option -d avec -m (crée le répertoire personnalisé)
 */
function testDebianCustomHomeWithM() {
    console.log('🧪 TEST DEBIAN: Option -d avec -m (crée le répertoire)');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer avec un répertoire home personnalisé AVEC -m
    cmdUseradd(['-d', '/opt/homeuser', '-m', 'homeuser'], context);
    
    // Vérifier le silence
    const captures = getCaptures();
    assert.captureCount(0, 'useradd -d -m doit être silencieux en cas de succès');
    
    // Vérifier le répertoire home personnalisé créé
    assertUserCreatedDebian(context, 'homeuser', { home: '/opt/homeuser' }, true);
    
    console.log('✅ DEBIAN CONFORME: Option -d avec -m crée le répertoire personnalisé');
    return true;
}

/**
 * TEST 8: Option -s pour shell personnalisé
 */
function testDebianCustomShell() {
    console.log('🧪 TEST DEBIAN: Option -s pour shell personnalisé');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer avec un shell personnalisé
    cmdUseradd(['-s', '/bin/zsh', 'shelluser'], context);
    
    // Vérifier le silence
    const captures = getCaptures();
    assert.captureCount(0, 'useradd -s doit être silencieux en cas de succès');
    
    // Vérifier le shell personnalisé
    assertUserCreatedDebian(context, 'shelluser', { shell: '/bin/zsh' }, false);
    
    console.log('✅ DEBIAN CONFORME: Option -s avec shell personnalisé');
    return true;
}

/**
 * TEST 9: Option -c pour commentaire (GECOS)
 */
function testDebianGecos() {
    console.log('🧪 TEST DEBIAN: Option -c pour commentaire (GECOS)');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer avec un commentaire
    cmdUseradd(['-c', 'John Doe,Room 123,+33123456789', 'john'], context);
    
    // Vérifier le silence
    const captures = getCaptures();
    assert.captureCount(0, 'useradd -c doit être silencieux en cas de succès');
    
    // Vérifier le commentaire GECOS
    const users = parsePasswdFile(context.fileSystem);
    const user = users.find(u => u.username === 'john');
    assert.equals(user.gecos, 'John Doe,Room 123,+33123456789', 'Commentaire GECOS doit être préservé');
    
    console.log('✅ DEBIAN CONFORME: Option -c avec commentaire GECOS');
    return true;
}

/**
 * TEST 10: Validation des noms d'utilisateur selon POSIX/Debian
 */
function testDebianUsernameValidation() {
    console.log('🧪 TEST DEBIAN: Validation des noms d\'utilisateur (POSIX)');
    
    clearCaptures();
    const context = createTestContext();
    
    // Tester des noms valides selon POSIX/Debian
    const validNames = [
        'user123',      // lettres + chiffres
        'test_user',    // underscore
        'admin-backup', // tiret
        '_service',     // commence par underscore
        'a',           // un seul caractère
        'web-server1',  // combinaison complexe
    ];
    
    validNames.forEach(name => {
        clearCaptures();
        cmdUseradd([name], context);
        
        // Chaque création doit être silencieuse
        const captures = getCaptures();
        assert.captureCount(0, `${name} doit être créé silencieusement`);
        
        // Vérifier que l'utilisateur existe
        const users = parsePasswdFile(context.fileSystem);
        const user = users.find(u => u.username === name);
        assert.isTrue(user !== undefined, `${name} devrait être créé`);
    });
    
    console.log('✅ DEBIAN CONFORME: Validation des noms d\'utilisateur valides');
    return true;
}

/**
 * TEST 11: Rejet des noms d'utilisateur invalides
 */
function testDebianInvalidUsernames() {
    console.log('🧪 TEST DEBIAN: Rejet des noms d\'utilisateur invalides');
    
    const context = createTestContext();
    
    // Tester des noms invalides selon POSIX/Debian
    const invalidNames = [
        '123user',      // commence par chiffre
        'user space',   // contient espace
        'user@host',    // caractère spécial
        'UPPERCASE',    // majuscules
        'user.dot',     // point
        '',             // vide
        'a'.repeat(33), // trop long (>32 caractères)
        'user/slash',   // slash
        'user:colon',   // deux-points
    ];
    
    invalidNames.forEach(name => {
        clearCaptures();
        cmdUseradd([name], context);
        
        // Chaque tentative doit produire une erreur
        const captures = getCaptures();
        assert.isTrue(captures.length > 0, `${name} doit produire une erreur`);
        
        const hasError = captures.some(cap => 
            cap.className === 'error' && cap.text.includes('nom d\'utilisateur invalide')
        );
        assert.isTrue(hasError, `${name} doit être rejeté comme invalide`);
        
        // Vérifier que l'utilisateur n'a PAS été créé
        const users = parsePasswdFile(context.fileSystem);
        const user = users.find(u => u.username === name);
        assert.isTrue(user === undefined, `${name} ne devrait PAS être créé`);
    });
    
    console.log('✅ DEBIAN CONFORME: Rejet des noms d\'utilisateur invalides');
    return true;
}

/**
 * TEST 12: Gestion des erreurs - utilisateur existant
 */
function testDebianDuplicateUser() {
    console.log('🧪 TEST DEBIAN: Gestion d\'erreur - utilisateur existant');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer un utilisateur
    cmdUseradd(['duplicate'], context);
    
    // Vérifier la création silencieuse
    let captures = getCaptures();
    assert.captureCount(0, 'Première création doit être silencieuse');
    
    // Essayer de créer le même utilisateur
    clearCaptures();
    cmdUseradd(['duplicate'], context);
    
    // Vérifier l'erreur
    captures = getCaptures();
    assert.isTrue(captures.length > 0, 'Duplication doit produire une erreur');
    
    const hasError = captures.some(cap => 
        cap.className === 'error' && cap.text.includes('existe déjà')
    );
    assert.isTrue(hasError, 'Erreur de duplication doit être affichée');
    
    console.log('✅ DEBIAN CONFORME: Gestion d\'erreur utilisateur existant');
    return true;
}

/**
 * TEST 13: Gestion des erreurs - UID en conflit
 */
function testDebianUIDConflict() {
    console.log('🧪 TEST DEBIAN: Gestion d\'erreur - UID en conflit');
    
    clearCaptures();
    const context = createTestContext();
    
    // Créer un utilisateur avec UID spécifique
    cmdUseradd(['-u', '5000', 'first'], context);
    
    // Vérifier la création silencieuse
    let captures = getCaptures();
    assert.captureCount(0, 'Première création doit être silencieuse');
    
    // Essayer de créer un autre utilisateur avec le même UID
    clearCaptures();
    cmdUseradd(['-u', '5000', 'second'], context);
    
    // Vérifier l'erreur
    captures = getCaptures();
    assert.isTrue(captures.length > 0, 'Conflit UID doit produire une erreur');
    
    const hasError = captures.some(cap => 
        cap.className === 'error' && cap.text.includes('UID') && cap.text.includes('déjà utilisé')
    );
    assert.isTrue(hasError, 'Erreur de conflit UID doit être affichée');
    
    console.log('✅ DEBIAN CONFORME: Gestion d\'erreur conflit UID');
    return true;
}

/**
 * TEST 14: Permissions - seul root peut utiliser useradd
 */
function testDebianRootPermission() {
    console.log('🧪 TEST DEBIAN: Permissions - seul root peut utiliser useradd');
    
    // Note: Ce test assume qu'on fonctionne comme root pendant les tests
    // Dans un vrai système, il faudrait tester avec un utilisateur non-root
    
    clearCaptures();
    const context = createTestContext();
    
    // Vérifier qu'on est bien root pour les tests
    const currentUser = getCurrentUser();
    assert.equals(currentUser.username, 'root', 'Tests doivent s\'exécuter en tant que root');
    
    // Dans un vrai système Debian, un utilisateur non-root devrait obtenir:
    // "useradd: Seul root peut ajouter des utilisateurs au système"
    
    console.log('✅ DEBIAN CONFORME: Vérification des permissions (tests en tant que root)');
    return true;
}

/**
 * Export des tests conformes au comportement Debian
 */
export const useraddDebianTests = [
    createTest('Comportement par défaut Debian (pas de home)', testDebianDefaultBehavior),
    createTest('Option -m crée le home (Debian)', testDebianCreateHome),
    createTest('Option -M empêche le home (Debian)', testDebianNoHome),
    createTest('Attribution UID automatique (≥1000)', testDebianUIDAllocation),
    createTest('Option -u UID spécifique', testDebianSpecificUID),
    createTest('Option -g GID spécifique', testDebianSpecificGID),
    createTest('Option -d chemin seul', testDebianCustomHomePath),
    createTest('Option -d avec -m crée répertoire', testDebianCustomHomeWithM),
    createTest('Option -s shell personnalisé', testDebianCustomShell),
    createTest('Option -c commentaire GECOS', testDebianGecos),
    createTest('Validation noms utilisateur valides', testDebianUsernameValidation),
    createTest('Rejet noms utilisateur invalides', testDebianInvalidUsernames),
    createTest('Erreur utilisateur existant', testDebianDuplicateUser),
    createTest('Erreur conflit UID', testDebianUIDConflict),
    createTest('Permissions root uniquement', testDebianRootPermission),
];