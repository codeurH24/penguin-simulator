// modules/users/system-init.js
// Initialisation du système d'utilisateurs

import { createFileEntry } from './file-utils.js';
import { 
    DEFAULT_PASSWD_CONTENT,
    DEFAULT_SHADOW_CONTENT, 
    DEFAULT_GROUP_CONTENT,
    DEFAULT_SUDOERS_CONTENT
} from './defaults/index.js';
import { createSkelStructure } from './defaults/skel-content.js';

/**
 * Initialise le système d'utilisateurs complet
 * @param {Object} fileSystem - Système de fichiers
 * @param {Function} saveFileSystem - Fonction de sauvegarde
 */
export function initializeUserSystem(fileSystem, saveFileSystem) {
    console.log('🔧 Initialisation du système d\'utilisateurs...');

    // Créer /etc/passwd
    if (!fileSystem['/etc/passwd']) {
        fileSystem['/etc/passwd'] = createFileEntry(DEFAULT_PASSWD_CONTENT);
        console.log('📝 Création de /etc/passwd');
    }

    // Créer /etc/shadow avec permissions restrictives
    if (!fileSystem['/etc/shadow']) {
        fileSystem['/etc/shadow'] = createFileEntry(DEFAULT_SHADOW_CONTENT);
        fileSystem['/etc/shadow'].permissions = '-rw-------';
        console.log('📝 Création de /etc/shadow');
    }

    // Créer /etc/group
    if (!fileSystem['/etc/group']) {
        fileSystem['/etc/group'] = createFileEntry(DEFAULT_GROUP_CONTENT);
        console.log('📝 Création de /etc/group');
    }

    // Créer /etc/sudoers avec permissions spéciales
    if (!fileSystem['/etc/sudoers']) {
        fileSystem['/etc/sudoers'] = createFileEntry(DEFAULT_SUDOERS_CONTENT);
        fileSystem['/etc/sudoers'].permissions = '-r--r-----';
        fileSystem['/etc/sudoers'].owner = 'root';
        fileSystem['/etc/sudoers'].group = 'root';
        console.log('📝 Création de /etc/sudoers');
    }

    // Créer la structure /etc/skel
    createSkelStructure(fileSystem);
    
    saveFileSystem();
    console.log('✅ Système d\'utilisateurs initialisé avec /etc/skel');
}