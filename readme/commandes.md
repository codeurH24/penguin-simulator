# 📁 Structure du Projet

## Organisation générale

```
📁 Penguin Simulator
├── modules/              # Bibliothèques système
│   ├── storage.js        # Gestion IndexedDB
│   ├── filesystem.js     # Système de fichiers Unix
│   ├── terminal.js       # Interface terminal
│   └── users/            # Gestion utilisateurs ✅
│       ├── user.service.js
│       ├── current-user.js
│       ├── user-crud.js
│       ├── defaults/
│       └── file-utils.js
├── lib/                  # Bibliothèques shell
│   ├── bash-builtins.js  # Commandes intégrées (cd, pwd, help, etc.)
│   ├── bash-parser.js    # Parser de lignes de commande
│   ├── bash-variables.js # Gestion des variables
│   └── bash-redirections.js # Redirections (>, >>)
├── bin/                  # Exécutables système
│   ├── ls.js            # Commande ls
│   ├── rm.js            # Commande rm
│   ├── mkdir.js         # Commande mkdir
│   ├── mv.js            # Commande mv
│   ├── echo.js          # Commande echo
│   ├── touch.js         # Commande touch
│   ├── cat.js           # Commande cat
│   ├── useradd.js       # Gestion utilisateurs
│   ├── su.js            # Changement d'utilisateur
│   ├── passwd.js        # Changement mot de passe
│   └── user-info.js     # whoami, id, groups
├── test-cases/          # Suite de tests automatisés
│   ├── main.js          # Runner de tests
│   ├── lib/             # Utilitaires de test
│   └── specs/           # Spécifications de test
├── assets/              # Ressources statiques
│   ├── style.css        # Styles terminal
│   └── terminal-favicon.svg
├── readme/              # Documentation détaillée
│   ├── commandes.md     # Référence exhaustive des commandes
│   └── structure.md     # Architecture et organisation du projet
├── index.js             # Point d'entrée principal
├── index.html           # Interface web
└── README.md            # Documentation principale
```

## Détail des répertoires

### 📦 `/modules/` - Bibliothèques système

**Rôle :** Modules génériques réutilisables qui implémentent les fonctionnalités de base du système.

- **`storage.js`** : Gestion de la persistance via IndexedDB
- **`filesystem.js`** : Système de fichiers Unix avec permissions
- **`terminal.js`** : Interface terminal et gestion xterm.js
- **`users/`** : Gestion complète des utilisateurs
  - `user.service.js` : Services utilisateurs (authentification, etc.)
  - `defaults/` : Fichiers par défaut (`/etc/skel`, configurations)
  - `file-utils.js` : Utilitaires de manipulation de fichiers

### ⚙️ `/bin/` - Exécutables système

**Rôle :** Commandes exécutables du système, équivalentes aux binaires Unix.

**Commandes principales :**
- **`ls.js`** : Listage de répertoires avec support couleurs
- **`rm.js`** : Suppression de fichiers/répertoires
- **`mkdir.js`** : Création de répertoires
- **`mv.js`** : Déplacement/renommage
- **`echo.js`** : Affichage de texte
- **`touch.js`** : Création de fichiers vides
- **`cat.js`** : Affichage de contenu de fichiers

**Gestion des utilisateurs :**
- **`useradd.js`** : Ajout d'utilisateurs
- **`su.js`** : Changement d'utilisateur
- **`passwd.js`** : Gestion des mots de passe
- **`user-info.js`** : Commandes `whoami`, `id`, `groups`

### 📚 `/lib/` - Bibliothèques shell

**Rôle :** Bibliothèques pour le fonctionnement du shell bash.

- **`bash-builtins.js`** : Commandes intégrées
  - `help`, `pwd`, `cd`, `clear`, `reset`, `set`, `export`, `exit`
- **`bash-parser.js`** : Analyse des lignes de commande
- **`bash-variables.js`** : Gestion des variables d'environnement
- **`bash-redirections.js`** : Redirections (`>`, `>>`, `<`)

### 🧪 `/test-cases/` - Tests automatisés

**Rôle :** Suite de tests complète pour valider la conformité avec Debian/Bash.

- **`main.js`** : Point d'entrée principal des tests
- **`lib/`** : Bibliothèques de test
  - `context.js` : Contexte d'exécution des tests
  - `helpers.js` : Fonctions utilitaires d'assertion
  - `runner.js` : Moteur d'exécution des tests
- **`specs/`** : Spécifications de test par commande
  - `commands/` : Tests par commande
  - `system/` : Tests système (filesystem, utilisateurs)

### 🎨 `/assets/` - Ressources statiques

**Rôle :** Fichiers statiques pour l'interface utilisateur.

- **`style.css`** : Styles CSS pour le terminal
- **`terminal-favicon.svg`** : Icône du terminal

### 📚 `/readme/` - Documentation détaillée

**Rôle :** Documentation technique détaillée du projet.

- **`commandes.md`** : Référence exhaustive de toutes les commandes
- **`structure.md`** : Ce fichier - Architecture du projet

## Architecture des modules

### Séparation des responsabilités

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Interface     │    │   Commandes     │    │   Système       │
│   (xterm.js)    │◄──►│   (/bin/*.js)   │◄──►│   (/modules/)   │
│                 │    │   (/lib/*.js)   │    │                 │
│ • Terminal UI   │    │ • ls, rm, cd    │    │ • FileSystem    │
│ • Clavier       │    │ • useradd, su   │    │ • Users         │
│ • Historique    │    │ • echo, cat     │    │ • Storage       │
│ • Shell logic   │    │ • builtins      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Flux de données

1. **Utilisateur** → Saisie dans le terminal
2. **Terminal** → Parse de la commande (modules/terminal/xterm/terminal.js)
3. **Parser** → Analyse avec lib/bash-parser.js
4. **Shell** → Appel de la commande correspondante (/bin/ ou /lib/bash-builtins.js)
5. **Commande** → Utilise les modules système (/modules/)
6. **Modules** → Opérations sur filesystem/users/storage
7. **Retour** → Affichage du résultat dans le terminal

## Conventions de nommage

### Fichiers
- **Minuscules avec tirets** : `user-info.js`, `bash-parser.js`
- **Extensions JavaScript** : `.js` pour tous les modules

### Fonctions
- **Commandes** : préfixe `cmd` → `cmdLs()`, `cmdUseradd()`
- **Utilitaires** : camelCase → `resolvePath()`, `parsePasswdFile()`
- **Tests** : préfixe `test` → `testLsBasicListing()`

### Variables
- **Constants** : UPPER_SNAKE_CASE → `DEFAULT_SHELL`, `ROOT_UID`
- **Variables** : camelCase → `currentPath`, `fileSystem`
- **Contexte** : objet standard avec propriétés définies

## Points d'entrée

### Application principale
- **`index.html`** : Interface web avec xterm.js
- **`index.js`** : Initialisation du terminal et du système

### Tests
- **`test-cases/main.js`** : Lancement des tests
- **Console navigateur** : `window.testRunner.runAllTests()`

### Développement
- **Ajout de commande** : Créer dans `/bin/` et enregistrer dans `modules/terminal/xtml/terminal.js`
- **Nouveaux tests** : Ajouter dans `/test-cases/specs/`
- **Modules système** : Étendre `/modules/` selon les besoins
- **Commandes builtin** : Ajouter dans `/lib/bash-builtins.js`

## Évolutivité

### Architecture modulaire
- **Séparation claire** entre interface, commandes et système
- **APIs standardisées** pour l'ajout de nouvelles commandes
- **Tests automatisés** pour valider les nouvelles fonctionnalités

### Standards respectés
- **ES6 modules** : Import/export natif
- **Conventions Unix** : Permissions, codes de retour, messages d'erreur
- **Compatibilité Debian** : Comportement identique au système réel

---

> 🏗️ Cette architecture permet une maintenance facile et l'ajout de nouvelles fonctionnalités tout en gardant la compatibilité avec les standards Unix/Debian.