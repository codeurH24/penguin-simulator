# Backup System - User Session

## Vue d'ensemble

Le système de backup de session utilisateur permet de sauvegarder et restaurer l'état complet d'une session : utilisateur courant, chemin, variables d'environnement, historique des commandes et pile d'utilisateurs.

## Modules

### `modules/backup/user/user-session-backup.js`

Fonctions de sauvegarde/restauration de sessions utilisateur.

## Fonctions principales

### `fetchLoadUserSession(context, url, options)`

Charge une session utilisateur depuis une URL JSON.

**Paramètres :**
- `context` - Contexte de l'application
- `url` - URL du fichier JSON de session
- `options` - Options de chargement (optionnel)

**Options disponibles :**
```javascript
{
  overwriteVariables: true,    // Écraser les variables existantes
  preserveCurrentUser: false,  // Garder l'utilisateur courant
  preserveCurrentPath: false,  // Garder le chemin courant
  force: false                 // Forcer la création si inexistant
}
```

## Utilisation

### Chargement basique
```javascript
import { fetchLoadUserSession } from './modules/backup/user/user-session-backup.js';

// Charger session existante
await fetchLoadUserSession(context, '/path/to/session.json');
```

### Chargement avec création automatique
```javascript
// Créer automatiquement l'utilisateur si inexistant
await fetchLoadUserSession(context, '/assets/templates/modules/bash/data/user/session-alice.json', {
    force: true
});
```

### Options de préservation
```javascript
// Garder utilisateur et chemin actuels
await fetchLoadUserSession(context, '/session.json', {
    preserveCurrentUser: true,
    preserveCurrentPath: true
});
```

## Comportements

### Mode normal (force: false)
- **Utilisateur inexistant** → Erreur avec message d'aide
- **Dossier home manquant** → Erreur avec message d'aide

### Mode forcé (force: true)
- **Utilisateur inexistant** → Création avec `useradd -m username`
- **Dossier home manquant** → Création manuelle du dossier

## Messages console

**Chargement normal :**
```
📦 Chargement session du 2025-06-14T19:54:03.275Z
👤 Utilisateur restauré: alice
📁 Chemin restauré: /home/alice
🔧 Variables restaurées
📜 Historique restauré (15 commandes)
👥 Pile utilisateurs restaurée (0 niveaux)
✅ Session utilisateur chargée avec succès
```

**Création automatique :**
```
🔧 Création automatique de l'utilisateur 'alice' avec useradd -m
✅ Utilisateur 'alice' créé automatiquement
👤 Utilisateur restauré: alice
```

**Création dossier home :**
```
🏠 Création du dossier home manquant: /home/alice
✅ Dossier home /home/alice créé
```

## Erreurs communes

### Utilisateur inexistant
```
❌ L'utilisateur 'alice' n'existe pas dans /etc/passwd. 
   Utilisez { force: true } pour forcer.
```

### Dossier home manquant
```
❌ Le dossier home '/home/alice' n'existe pas. 
   Utilisez { force: true } pour forcer.
```

### Fichier JSON invalide
```
❌ Erreur HTTP: 404
❌ Données de session invalides
```

## Format de session JSON

```json
{
  "exportDate": "2025-06-14T19:54:03.275Z",
  "version": "1.0",
  "currentPath": "/home/alice",
  "currentUser": {
    "username": "alice",
    "uid": 1000,
    "gid": 1000,
    "home": "/home/alice",
    "shell": "/bin/bash",
    "groups": ["alice"]
  },
  "userStack": [],
  "variables": {
    "environment": { "LANG": "fr_FR.UTF-8" },
    "session": { "EDITOR": "nano" },
    "shell": { "OLDPWD": "/root" },
    "local": {}
  },
  "commandHistory": ["ls", "cd Documents", "pwd"],
  "shellConfig": {
    "promptFormat": null,
    "shellOptions": {}
  }
}
```

## Intégration recommandée

### Dans index.js
```javascript
import { fetchLoadUserSession } from './modules/backup/user/user-session-backup.js';

export async function initApp() {
    let context = await getContextFromDB() || await createAndSaveContext();
    
    // Charger environnement utilisateur spécifique
    await fetchLoadUserSession(context, '/assets/sessions/dev-user.json', { 
        force: true 
    });
    
    return new TerminalService(context);
}
```

### Sauvegarde globale (console)
```javascript
// Disponible automatiquement après import du module
window.saveSession();  // Télécharge session-username-timestamp.json
```

## Cas d'usage

- **Développement** : Environnements utilisateur prédéfinis
- **Tests** : Sessions reproductibles avec données cohérentes  
- **Demo** : États d'application configurés pour présentations
- **Backup** : Sauvegarde complète de sessions de travail