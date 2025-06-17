// modules/users/defaults/skel-content.js
// Structure par défaut de /etc/skel avec imports modulaires

import { createFileEntry, createDirEntry } from '../../filesystem/file-entries.js';
import { DEFAULT_BASHRC_CONTENT } from './skel-files/bashrc-content.js';
import { DEFAULT_PROFILE_CONTENT } from './skel-files/profile-content.js';
import { DEFAULT_VIMRC_CONTENT } from './skel-files/vimrc-content.js';
import { DEFAULT_BASH_LOGOUT_CONTENT } from './skel-files/bash_logout-content.js';


/**
 * Crée la structure par défaut de /etc/skel
 * @param {Object} fileSystem - Système de fichiers
 */
export function createSkelStructure(fileSystem) {
    // Créer le répertoire /etc/skel
    fileSystem['/etc/skel'] = createDirEntry('root', 'root', 'drwxr-xr-x');

    // Fichiers de configuration par défaut
    fileSystem['/etc/skel/.bashrc'] = createFileEntry(DEFAULT_BASHRC_CONTENT);
    fileSystem['/etc/skel/.profile'] = createFileEntry(DEFAULT_PROFILE_CONTENT);
    fileSystem['/etc/skel/.vimrc'] = createFileEntry(DEFAULT_VIMRC_CONTENT);
    fileSystem['/etc/skel/.bash_logout'] = createFileEntry(DEFAULT_BASH_LOGOUT_CONTENT);

    // console.log('📁 Structure /etc/skel créée avec tous les fichiers Debian standards');
}