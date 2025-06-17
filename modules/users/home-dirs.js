// modules/users/home-dirs.js
// Gestion des répertoires home et copie depuis /etc/skel

/**
 * Copie les fichiers depuis /etc/skel vers le répertoire home d'un utilisateur
 * @param {Object} fileSystem - Système de fichiers
 * @param {string} homePath - Chemin du répertoire home
 * @param {string} owner - Propriétaire des fichiers
 * @param {string} group - Groupe des fichiers
 */
export function copySkelFiles(fileSystem, homePath, owner, group) {
    // Vérifier si /etc/skel existe
    if (!fileSystem['/etc/skel']) {
        console.log('⚠️  /etc/skel non trouvé, création du home vide');
        return;
    }

    // Préfixe pour tous les fichiers/dossiers dans /etc/skel
    const skelPrefix = '/etc/skel/';
    
    // Trouver tous les fichiers et dossiers dans /etc/skel
    const skelPaths = Object.keys(fileSystem).filter(path => 
        path.startsWith(skelPrefix) && path !== '/etc/skel'
    );

    skelPaths.forEach(skelPath => {
        // Calculer le chemin de destination
        const relativePath = skelPath.substring(skelPrefix.length);
        const destPath = `${homePath}/${relativePath}`;
        
        // Copier le fichier/dossier avec les bonnes permissions
        const skelEntry = fileSystem[skelPath];
        const newEntry = {
            ...skelEntry,
            owner,
            group,
            modified: new Date(),
            created: new Date()
        };
        
        fileSystem[destPath] = newEntry;
        // console.log(`📄 Copié ${skelPath} → ${destPath}`);
    });
}