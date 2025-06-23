// modules/backup/loaders.js
export async function loadBackupTestData(context, options = {}) {
    const { force = false } = options;
    
    const testdirData = await fetch('/assets/templates/modules/bash/data/filesystem/testdir.json').then(r => r.json());
    
    let loaded = 0;
    const paths = Object.keys(testdirData);
    
    Object.entries(testdirData).forEach(([path, data]) => {
        if (force || !context.fileSystem[path]) {
            context.fileSystem[path] = data;
            loaded++;
        }
    });
    
    // Analyser le contenu pour le message
    const mainPath = paths[0];
    const mainName = mainPath.split('/').filter(p => p).pop();
    const mainEntry = testdirData[mainPath];
    
    let message;
    if (mainEntry.type === 'dir') {
        const childCount = paths.length - 1; // -1 pour exclure le dossier lui-même
        message = childCount > 0 ? `Nouveau dossier ${mainName}(${childCount})` : `Nouveau dossier ${mainName}`;
    } else {
        message = `Nouveau fichier ${mainName}`;
    }
    
    console.log(`✅ ${message}`);
}

// modules/backup/loaders.js
export async function removeBackupTestData(context) {
    const testdirData = await fetch('/assets/templates/modules/bash/data/filesystem/testdir.json').then(r => r.json());
    
    let removed = 0;
    const paths = Object.keys(testdirData);
    
    paths.forEach(path => {
        if (context.fileSystem[path]) {
            delete context.fileSystem[path];
            removed++;
        }
    });
    
    const mainName = paths[0].split('/').filter(p => p).pop();
    console.log(`🗑️ Dossier ${mainName} supprimé (${removed} éléments)`);
}

// Fonction générique pour charger n'importe quel fichier de backup
export async function loadBackupFromFile(context, filePath, options = {}) {
    const { force = false, verbose = true } = options;
    
    try {
        if (verbose) {
            console.log(`🌐 Chargement backup depuis: ${filePath}`);
        }
        
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const backupData = await response.json();
        
        let loaded = 0;
        const paths = Object.keys(backupData);
        
        Object.entries(backupData).forEach(([path, data]) => {
            if (force || !context.fileSystem[path]) {
                context.fileSystem[path] = data;
                loaded++;
            }
        });
        
        if (verbose) {
            // Analyser le contenu pour le message
            const mainPath = paths[0];
            const mainName = mainPath.split('/').filter(p => p).pop();
            const mainEntry = backupData[mainPath];
            
            let message;
            if (mainEntry?.type === 'dir') {
                const childCount = paths.length - 1;
                message = childCount > 0 ? `Backup ${mainName}(${childCount}) chargé` : `Backup ${mainName} chargé`;
            } else {
                message = `Backup ${mainName} chargé`;
            }
            
            console.log(`✅ ${message} - ${loaded}/${paths.length} éléments`);
        }
        
        return { loaded, total: paths.length };
        
    } catch (error) {
        console.error(`❌ Erreur chargement backup: ${error.message}`);
        throw error;
    }
}

// Fonction pour supprimer un backup spécifique
export async function removeBackupFromFile(context, filePath, options = {}) {
    const { verbose = true } = options;
    
    try {
        if (verbose) {
            console.log(`🗑️ Suppression backup depuis: ${filePath}`);
        }
        
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const backupData = await response.json();
        
        let removed = 0;
        const paths = Object.keys(backupData);
        
        paths.forEach(path => {
            if (context.fileSystem[path]) {
                delete context.fileSystem[path];
                removed++;
            }
        });
        
        if (verbose) {
            const mainName = paths[0]?.split('/').filter(p => p).pop() || 'backup';
            console.log(`🗑️ Backup ${mainName} supprimé (${removed}/${paths.length} éléments)`);
        }
        
        return { removed, total: paths.length };
        
    } catch (error) {
        console.error(`❌ Erreur suppression backup: ${error.message}`);
        throw error;
    }
}

// Fonction helper pour charger plusieurs backups
export async function loadMultipleBackups(context, filePaths, options = {}) {
    const results = [];
    
    for (const filePath of filePaths) {
        try {
            const result = await loadBackupFromFile(context, filePath, options);
            results.push({ filePath, success: true, ...result });
        } catch (error) {
            results.push({ filePath, success: false, error: error.message });
        }
    }
    
    const successful = results.filter(r => r.success).length;
    console.log(`📦 ${successful}/${filePaths.length} backups chargés avec succès`);
    
    return results;
}