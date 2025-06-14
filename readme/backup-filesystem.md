# Backup System - Filesystem

## Vue d'ensemble

Le système de backup filesystem permet d'exporter/importer des parties du système de fichiers sous format JSON pour créer des environnements de test ou sauvegarder des configurations.

## Modules

### `modules/backup/filesystem/export-utils.js`

Utilitaires d'export du filesystem vers JSON.

#### `exportFilesystemToJSON(fileSystem, paths)`
Exporte une partie du filesystem en JSON.
```javascript
const json = exportFilesystemToJSON(context.fileSystem, '/etc');
const json = exportFilesystemToJSON(context.fileSystem, ['/etc', '/home']);
```

#### `exportAsDownloadURL(fileSystem, paths, filename)`
Crée un fichier de téléchargement automatique.
```javascript
exportAsDownloadURL(context.fileSystem, '/etc', 'etc-backup.json');
```

### `modules/backup/loaders.js`

Chargement et suppression de données de backup.

#### `loadBackupTestData(context, options)`
Charge des données JSON dans le filesystem.
```javascript
// Charge uniquement les nouveaux
await loadBackupTestData(context);

// Force l'écrasement
await loadBackupTestData(context, { force: true });
```

#### `removeBackupTestData(context)`
Supprime les données précédemment chargées.
```javascript
await removeBackupTestData(context);
```

## Workflow

### 1. Export
```javascript
// Dans la console développeur
exportAsDownloadURL(context.fileSystem, '/etc', 'etc-backup.json');
```

### 2. Import
```javascript
// Dans index.js ou autre
import { loadBackupTestData } from './modules/backup/loaders.js';
await loadBackupTestData(context);
```

### 3. Cleanup
```javascript
await removeBackupTestData(context);
```

## Messages Console

- `✅ Nouveau dossier etc(12)` - Dossier avec 12 éléments chargé
- `✅ Nouveau fichier passwd` - Fichier unique chargé  
- `🗑️ Dossier etc supprimé (13 éléments)` - Cleanup effectué

## Structure JSON

```json
{
  "/etc": {
    "type": "dir",
    "size": 4096,
    "created": "2025-06-14T...",
    "permissions": "drwxr-xr-x",
    "owner": "root",
    "group": "root"
  },
  "/etc/passwd": {
    "type": "file",
    "content": "root:x:0:0:...",
    "size": 42
  }
}
```

## Exemple d'intégration

```javascript
// index.js
import { loadBackupTestData, removeBackupTestData } from './modules/backup/loaders.js';

export async function initApp() {
    let context = await getContextFromDB() || await createAndSaveContext();
    
    // Charger environnement de test
    await loadBackupTestData(context);
    
    // Nettoyer si besoin
    // await removeBackupTestData(context);
    
    return new TerminalService(context);
}
```