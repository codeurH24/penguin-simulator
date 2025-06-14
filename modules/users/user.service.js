// modules/users/user.service.js
// Service principal - Point d'entrée du système utilisateur

// État utilisateur courant
export { 
    getCurrentUser, 
    isRoot, 
    switchUser 
} from './current-user.js';

// CRUD utilisateurs
export { 
    getUserInfo, 
    addUser, 
    removeUser 
} from './user-crud.js';

// Gestion mots de passe
export { 
    changePassword, 
    deleteUserPassword,
    lockUserAccount,
    unlockUserAccount
} from './password.js';

// Permissions et sudo
export { 
    canUseSudo 
} from './permissions.js';

// Parsing fichiers système
export { 
    parsePasswdFile, 
    parseGroupFile 
} from './parsers.js';

// Répertoires home
export { 
    copySkelFiles 
} from './home-dirs.js';

// Initialisation système
export { 
    initializeUserSystem,
    initializeUserSystem as initUserSystem  // Alias pour compatibilité
} from './system-init.js';

export { 
    pushUser, 
    popUser, 
    isUserStackEmpty, 
    getUserStackSize, 
    clearUserStack 
} from './user-stack.js';