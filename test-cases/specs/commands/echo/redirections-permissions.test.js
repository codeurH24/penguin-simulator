// test-cases/specs/commands/echo/redirections-permissions.test.js
// Tests des permissions pour les redirections echo

import { createTestContext, clearCaptures, getCaptures } from '../../../lib/context.js';
import { assert, validateFileSystem, testUtils } from '../../../lib/helpers.js';
import { createTest } from '../../../lib/runner.js';
import { parseCommandLine, parseRedirections } from '../../../../lib/bash-parser.js';
import { executeWithRedirection, hasRedirection, checkRedirectionPermissions } from '../../../../lib/bash-redirections.js';
import { substituteVariablesInArgs } from '../../../../lib/bash-variables.js';
import { cmdEcho } from '../../../../bin/echo.js';
import { cmdUseradd } from '../../../../bin/useradd.js';
import { cmdPasswd } from '../../../../bin/passwd.js';
import { cmdSu } from '../../../../bin/su.js';
import { cmdExit } from '../../../../lib/bash-builtins.js';
import { cmdChmod } from '../../../../bin/chmod.js';
import { cmdMkdir } from '../../../../bin/mkdir/mkdir.js';
import { clearUserStack } from '../../../../modules/users/user-stack.js';

/**
 * Fonction pour exécuter une commande avec redirections dans le contexte de test
 */
function executeCommand(commandString, context) {
    const trimmedCommand = commandString.trim();
    if (!trimmedCommand) {
        return;
    }

    const parts = parseCommandLine(trimmedCommand);
    if (parts.length === 0) {
        return;
    }

    const { command: cmdParts, redirections } = parseRedirections(parts);
    if (cmdParts.length === 0) {
        return;
    }

    const cmd = cmdParts[0];
    let args = cmdParts.slice(1);
    args = substituteVariablesInArgs(args, context);

    // Exécuter avec ou sans redirections
    if (hasRedirection(redirections)) {
        const commandExecutor = () => {
            executeCommandDirect(cmd, args, context);
        };
        executeWithRedirection(commandExecutor, redirections, context);
    } else {
        executeCommandDirect(cmd, args, context);
    }
}

/**
 * Exécute directement la commande sans redirection
 */
function executeCommandDirect(cmd, args, context) {
    if (cmd === 'echo') {
        cmdEcho(args, context);
    } else {
        context.showError(`Command not supported in tests: ${cmd}`);
    }
}

/**
 * Fonction utilitaire pour créer un utilisateur sans mot de passe
 */
function prepareUserWithoutPassword(context, username) {
    cmdUseradd(['-m', username], context);
    cmdPasswd(['-d', username], context);
    clearCaptures();
    return context;
}

/**
 * Vérifie si une erreur de permission denied a été capturée
 */
function hasPermissionDeniedError(captures) {
    return captures.some(capture => {
        if (capture.className !== 'error') return false;
        const text = capture.text.toLowerCase();
        return text.includes('permission denied') ||
            text.includes('permission refusée') ||
            text.includes('accès refusé');
    });
}

/**
 * TEST 1: echo > fichier - échec sans permission d'écriture dans répertoire parent
 */
function testEchoRedirectCreateNoWritePermissionInDirectory() {
    console.log('🧪 TEST PERMISSIONS: echo > fichier échoue sans permission d\'écriture dans répertoire');

    clearCaptures();
    clearUserStack();
    const context = createTestContext();

    // Créer un utilisateur alice
    prepareUserWithoutPassword(context, 'alice');

    // Root crée un répertoire sans permission d'écriture pour others
    cmdMkdir(['/tmp/readonly'], context);
    cmdChmod(['755', '/tmp/readonly'], context); // rwxr-xr-x (alice peut traverser mais pas écrire)

    // Passer à alice
    cmdSu(['alice'], context);

    // alice essaie de créer un fichier dans le répertoire en lecture seule
    clearCaptures();
    executeCommand('echo "test content" > /tmp/readonly/newfile.txt', context);

    const captures = getCaptures();
    const hasPermError = hasPermissionDeniedError(captures);

    // Vérifier qu'une erreur de permission a été générée
    assert.isTrue(hasPermError, 'Une erreur de permission denied devrait être générée');

    // Vérifier que le fichier n'a pas été créé
    assert.fileNotExists(context, '/tmp/readonly/newfile.txt', 'Le fichier ne devrait pas avoir été créé');

    console.log('✅ echo > échoue bien sans permission d\'écriture dans répertoire');
    return true;
}

/**
 * TEST 2: echo >> fichier - échec sans permission d'écriture sur fichier existant
 */
function testEchoRedirectAppendNoWritePermissionOnFile() {
    console.log('🧪 TEST PERMISSIONS: echo >> fichier échoue sans permission d\'écriture sur fichier');

    clearCaptures();
    clearUserStack();
    const context = createTestContext();

    // Créer utilisateurs
    prepareUserWithoutPassword(context, 'alice');
    prepareUserWithoutPassword(context, 'bob');

    // Root crée un fichier appartenant à alice
    testUtils.createTestFile(context, '/tmp/alice-file.txt', 'contenu initial\n');
    const file = context.fileSystem['/tmp/alice-file.txt'];
    file.owner = 'alice';
    file.group = 'alice';

    // Définir permissions lecture seule pour others
    cmdChmod(['644', '/tmp/alice-file.txt'], context); // rw-r--r-- (bob peut lire mais pas écrire)

    // Passer à bob
    cmdSu(['bob'], context);

    // bob essaie d'ajouter du contenu au fichier d'alice
    clearCaptures();
    executeCommand('echo "nouveau contenu" >> /tmp/alice-file.txt', context);

    const captures = getCaptures();
    const hasPermError = hasPermissionDeniedError(captures);

    // Vérifier qu'une erreur de permission a été générée
    assert.isTrue(hasPermError, 'Une erreur de permission denied devrait être générée');

    // Vérifier que le fichier n'a pas été modifié
    const finalFile = context.fileSystem['/tmp/alice-file.txt'];
    assert.equals(finalFile.content, 'contenu initial\n', 'Le fichier ne devrait pas avoir été modifié');

    console.log('✅ echo >> échoue bien sans permission d\'écriture sur fichier');
    return true;
}

/**
 * TEST 3: echo > fichier - échec en tentant d'écraser un répertoire
 */
function testEchoRedirectOverwriteDirectory() {
    console.log('🧪 TEST PERMISSIONS: echo > échoue en tentant d\'écraser un répertoire');

    clearCaptures();
    const context = createTestContext();

    // Créer un répertoire
    cmdMkdir(['/tmp/testdir'], context);

    // Essayer de rediriger vers le répertoire
    clearCaptures();
    executeCommand('echo "test" > /tmp/testdir', context);

    const captures = getCaptures();

    // Vérifier qu'une erreur a été générée (pas nécessairement "permission denied" mais une erreur)
    const hasError = captures.some(capture => capture.className === 'error');
    assert.isTrue(hasError, 'Une erreur devrait être générée en tentant d\'écraser un répertoire');

    // Vérifier que le répertoire existe toujours
    assert.fileExists(context, '/tmp/testdir', 'Le répertoire devrait toujours exister');
    assert.isDirectory(context, '/tmp/testdir', 'testdir devrait être un répertoire');

    console.log('✅ echo > échoue bien en tentant d\'écraser un répertoire');
    return true;
}

/**
 * TEST 4: echo > fichier - succès avec permissions appropriées
 */
function testEchoRedirectCreateWithWritePermission() {
    console.log('🧪 TEST PERMISSIONS: echo > réussit avec permissions d\'écriture appropriées');

    clearCaptures();
    clearUserStack();
    const context = createTestContext();

    // Créer un utilisateur alice
    prepareUserWithoutPassword(context, 'alice');

    // Root crée un répertoire avec permission d'écriture pour others
    cmdMkdir(['/tmp/writable'], context);
    cmdChmod(['777', '/tmp/writable'], context); // rwxrwxrwx (alice peut écrire)

    // Passer à alice
    cmdSu(['alice'], context);

    // alice crée un fichier dans le répertoire accessible en écriture
    clearCaptures();
    executeCommand('echo "contenu de alice" > /tmp/writable/alice-file.txt', context);

    const captures = getCaptures();
    const hasError = captures.some(capture => capture.className === 'error');

    // Aucune erreur ne devrait être générée
    assert.isFalse(hasError, 'Aucune erreur ne devrait être générée avec permissions appropriées');

    // Vérifier que le fichier a été créé avec le bon contenu
    assert.fileExists(context, '/tmp/writable/alice-file.txt', 'Le fichier devrait avoir été créé');
    const file = context.fileSystem['/tmp/writable/alice-file.txt'];
    assert.isTrue(file.content.includes('contenu de alice'), 'Le fichier devrait contenir le bon contenu');

    console.log('✅ echo > réussit bien avec permissions appropriées');
    return true;
}

/**
 * TEST 5: echo >> fichier - succès pour propriétaire avec permission d'écriture
 */
function testEchoRedirectAppendByOwner() {
    console.log('🧪 TEST PERMISSIONS: echo >> réussit pour propriétaire du fichier');

    clearCaptures();
    clearUserStack();
    const context = createTestContext();

    // Créer un utilisateur alice
    prepareUserWithoutPassword(context, 'alice');

    // Passer à alice
    cmdSu(['alice'], context);

    // alice crée un fichier
    executeCommand('echo "première ligne" > /home/alice/mon-fichier.txt', context);

    // alice ajoute du contenu à son propre fichier
    clearCaptures();
    executeCommand('echo "deuxième ligne" >> /home/alice/mon-fichier.txt', context);

    const captures = getCaptures();
    const hasError = captures.some(capture => capture.className === 'error');

    // Aucune erreur ne devrait être générée
    assert.isFalse(hasError, 'Aucune erreur ne devrait être générée pour le propriétaire');

    // Vérifier que le contenu a été ajouté
    const file = context.fileSystem['/home/alice/mon-fichier.txt'];
    assert.isTrue(file.content.includes('première ligne'), 'Le fichier devrait contenir la première ligne');
    assert.isTrue(file.content.includes('deuxième ligne'), 'Le fichier devrait contenir la deuxième ligne');

    console.log('✅ echo >> réussit bien pour le propriétaire');
    return true;
}

/**
 * TEST 6: Fonction utilitaire checkRedirectionPermissions
 */
function testCheckRedirectionPermissionsUtility() {
    console.log('🧪 TEST PERMISSIONS: Fonction utilitaire checkRedirectionPermissions');

    clearCaptures();
    clearUserStack();
    const context = createTestContext();

    // Créer un utilisateur alice
    prepareUserWithoutPassword(context, 'alice');

    // Root crée des fichiers et répertoires avec différentes permissions
    testUtils.createTestFile(context, '/tmp/readable.txt', 'contenu');
    cmdChmod(['444', '/tmp/readable.txt'], context); // r--r--r-- (lecture seule)

    cmdMkdir(['/tmp/readonly-dir'], context);
    cmdChmod(['555', '/tmp/readonly-dir'], context); // r-xr-xr-x (pas d'écriture)

    // Passer à alice
    cmdSu(['alice'], context);

    // Test 1: Tenter d'écrire dans un fichier en lecture seule
    let permCheck = checkRedirectionPermissions('/tmp/readable.txt', false, context);
    assert.isFalse(permCheck.allowed, 'Permission devrait être refusée pour fichier en lecture seule');
    assert.isTrue(permCheck.reason.includes('No write permission'), 'La raison devrait mentionner les permissions d\'écriture');

    // Test 2: Tenter de créer un fichier dans un répertoire en lecture seule
    permCheck = checkRedirectionPermissions('/tmp/readonly-dir/newfile.txt', false, context);
    assert.isFalse(permCheck.allowed, 'Permission devrait être refusée pour création dans répertoire en lecture seule');
    assert.isTrue(permCheck.reason.includes('No write permission in directory'), 'La raison devrait mentionner les permissions du répertoire');

    // Test 3: Tenter d'écrire dans un répertoire inexistant
    permCheck = checkRedirectionPermissions('/nonexistent/file.txt', false, context);
    assert.isFalse(permCheck.allowed, 'Permission devrait être refusée pour répertoire inexistant');
    assert.isTrue(permCheck.reason.includes('does not exist'), 'La raison devrait mentionner que le répertoire n\'existe pas');

    console.log('✅ Fonction utilitaire checkRedirectionPermissions fonctionne correctement');
    return true;
}

/**
 * TEST 7: root peut toujours écrire (même sur fichiers en lecture seule)
 */
function testRootCanAlwaysWriteWithRedirection() {
    console.log('🧪 TEST PERMISSIONS: root peut toujours écrire avec redirections');

    clearCaptures();
    clearUserStack();
    const context = createTestContext();

    // Créer un utilisateur alice
    prepareUserWithoutPassword(context, 'alice');

    // Passer à alice pour créer un fichier en lecture seule
    cmdSu(['alice'], context);
    executeCommand('echo "contenu alice" > /home/alice/readonly.txt', context);
    cmdChmod(['444', '/home/alice/readonly.txt'], context); // r--r--r--

    // Revenir à root
    cmdExit([], context);

    // root devrait pouvoir écraser le fichier en lecture seule
    clearCaptures();
    executeCommand('echo "root peut écrire" > /home/alice/readonly.txt', context);

    const captures = getCaptures();
    const hasError = captures.some(capture => capture.className === 'error');

    // Aucune erreur ne devrait être générée pour root
    assert.isFalse(hasError, 'root ne devrait avoir aucune restriction d\'écriture');

    // Vérifier que le contenu a été écrasé
    const file = context.fileSystem['/home/alice/readonly.txt'];
    assert.isTrue(file.content.includes('root peut écrire'), 'root devrait avoir pu écraser le fichier');

    console.log('✅ root peut bien écrire partout avec les redirections');
    return true;
}

// Export des tests
export const echoRedirectionsPermissionsTests = [
    createTest('echo > - échec sans permission écriture répertoire', testEchoRedirectCreateNoWritePermissionInDirectory),
    createTest('echo >> - échec sans permission écriture fichier', testEchoRedirectAppendNoWritePermissionOnFile),
    createTest('echo > - échec redirection vers répertoire', testEchoRedirectOverwriteDirectory),
    createTest('echo > - succès avec permissions appropriées', testEchoRedirectCreateWithWritePermission),
    createTest('echo >> - succès pour propriétaire', testEchoRedirectAppendByOwner),
    createTest('Fonction utilitaire checkRedirectionPermissions', testCheckRedirectionPermissionsUtility),
    createTest('root peut toujours écrire avec redirections', testRootCanAlwaysWriteWithRedirection)
];

export default echoRedirectionsPermissionsTests;