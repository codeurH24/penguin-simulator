// modules/filesystem/export-utils.js
// Utilitaires pour exporter/importer des parties du filesystem

/**
 * Exporte une partie du filesystem en JSON
 * @param {Object} fileSystem - Le filesystem complet
 * @param {string|Array} paths - Chemin(s) à exporter
 * @returns {string} - JSON formaté
 */
export function exportFilesystemToJSON(fileSystem, paths) {
    const pathsArray = Array.isArray(paths) ? paths : [paths];
    const exported = {};
    
    pathsArray.forEach(targetPath => {
        if (targetPath === '/') {
            // Cas spécial : exporter tout le filesystem
            Object.assign(exported, fileSystem);
        } else {
            // Chemin exact
            if (fileSystem[targetPath]) {
                exported[targetPath] = fileSystem[targetPath];
            }
            
            // Sous-chemins
            Object.keys(fileSystem).forEach(path => {
                if (path.startsWith(targetPath + '/')) {
                    exported[path] = fileSystem[path];
                }
            });
        }
    });
    
    return JSON.stringify(exported, null, 2);
}
/**
 * Importe des données JSON dans le filesystem
 * @param {Object} fileSystem - Le filesystem à modifier
 * @param {Object} jsonData - Données JSON parsées
 */
export function importFilesystemFromJSON(fileSystem, jsonData) {
    Object.assign(fileSystem, jsonData);
}

/**
 * Exporte et crée une URL de téléchargement
 * @param {Object} fileSystem - Le filesystem
 * @param {string|Array} paths - Chemin(s) à exporter
 * @param {string} filename - Nom du fichier (optionnel)
 * @returns {string} - URL de téléchargement
 */
export function exportAsDownloadURL(fileSystem, paths, filename = 'filesystem-export.json') {
    const json = exportFilesystemToJSON(fileSystem, paths);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Créer un lien de téléchargement automatique
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    console.log(`📁 Export créé: ${filename} (${Object.keys(JSON.parse(json)).length} entrées)`);
    return url;
}

/**
 * Exporte et copie dans le presse-papiers (ancienne méthode)
 * @param {Object} fileSystem - Le filesystem
 * @param {string|Array} paths - Chemin(s) à exporter
 * @returns {Promise<boolean>} - true si copié avec succès
 */
export async function exportAndCopy(fileSystem, paths) {
    const json = exportFilesystemToJSON(fileSystem, paths);
    
    try {
        await navigator.clipboard.writeText(json);
        console.log(`✅ JSON exporté dans le presse-papiers (${Object.keys(JSON.parse(json)).length} entrées)`);
        return true;
    } catch (err) {
        console.log('📋 JSON exporté (copiez manuellement):');
        console.log(json);
        return false;
    }
}

/**
 * Usage simple pour debugging/développement
 * @param {Object} context - Contexte avec filesystem
 * @param {string} path - Chemin à exporter
 */
export function quickExport(context, path = '/etc') {
    const json = exportFilesystemToJSON(context.fileSystem, path);
    console.log(`📁 Export de ${path}:`);
    console.log(json);
    return json;
}