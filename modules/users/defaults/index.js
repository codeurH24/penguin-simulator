// modules/users/defaults/index.js
// Point d'entrée unifié pour tous les contenus par défaut

// System files - Authentication
export { DEFAULT_PASSWD_CONTENT } from './system-files/auth/passwd-content.js';
export { DEFAULT_SHADOW_CONTENT } from './system-files/auth/shadow-content.js';
export { DEFAULT_GROUP_CONTENT } from './system-files/auth/group-content.js';
export { DEFAULT_SUDOERS_CONTENT } from './system-files/auth/sudoers-content.js';

// Skel files
export { DEFAULT_BASHRC_CONTENT } from './skel-files/bashrc-content.js';
export { DEFAULT_PROFILE_CONTENT } from './skel-files/profile-content.js';
export { DEFAULT_VIMRC_CONTENT } from './skel-files/vimrc-content.js';
export { DEFAULT_BASH_LOGOUT_CONTENT } from './skel-files/bash_logout-content.js';

// Export groupé par catégories
export const SYSTEM_FILES = {
    AUTH: {
        PASSWD: () => import('./system-files/auth/passwd-content.js'),
        SHADOW: () => import('./system-files/auth/shadow-content.js'),
        GROUP: () => import('./system-files/auth/group-content.js'),
        SUDOERS: () => import('./system-files/auth/sudoers-content.js')
    }
};

export const SKEL_FILES = {
    BASHRC: () => import('./skel-files/bashrc-content.js'),
    PROFILE: () => import('./skel-files/profile-content.js'),
    VIMRC: () => import('./skel-files/vimrc-content.js'),
    BASH_LOGOUT: () => import('./skel-files/bash_logout-content.js')
};