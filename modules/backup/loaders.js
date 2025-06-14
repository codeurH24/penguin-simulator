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