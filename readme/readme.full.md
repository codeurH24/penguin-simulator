# 🐧 Penguin Simulator - Terminal Linux/Debian

Un simulateur de terminal Linux complet fonctionnant dans le navigateur, s'efforçant de reproduire le plus fidèlement possible le comportement de Debian avec Bash.

## 🚀 Fonctionnalités

### Terminal Authentique
- **Interface xterm.js** : Terminal moderne avec support couleur et historique
- **Shell intégré** : Simulation la plus fidèle possible des commandes et réponses bash
- **Standards Debian** : Respect des conventions et structure de fichiers Debian

### Système de Fichiers Complet
- **Stockage IndexedDB** : Persistance des données dans le navigateur
- **Permissions Unix** : Système complet de droits utilisateurs/groupes
- **Structure FHS** : Hiérarchie standard `/bin`, `/etc`, `/home`, `/usr`, etc.

### Commandes Implémentées
| Commande | Statut | Options supportées |
|----------|--------|--------------------|
| `ls`     | ✅     | `-l`, `-a`, `-h` |
| `rm`     | ✅     | `-r`, `-f` |
| `mkdir`  | ✅     | `-p` |
| `mv`     | ✅     | Déplacement/renommage |
| `echo`   | ✅     | `-n`, `-e`, `-E` |
| `cd`     | ✅     | Navigation (builtin) |
| `pwd`    | ✅     | Répertoire courant |
| `useradd`| ✅     | `-m`, `-d`, `-g`, `-s` |
| `su`     | ✅     | Changement d'utilisateur |

> 📚 **[Voir la référence complète des commandes](readme/commandes.md)** - Documentation exhaustive avec toutes les options et comportements

### Gestion des Utilisateurs
- **Fichiers système** : `/etc/passwd`, `/etc/group`, `/etc/shadow`
- **Répertoires home** : Création automatique avec `/etc/skel`
- **Permissions** : Système complet de droits et appartenance

## 📁 Structure du Projet

> 🏗️ **[Voir la structure détaillée du projet](readme/structure.md)** - Architecture complète avec organisation des modules, répertoires et conventions

Le projet suit une architecture modulaire claire séparant l'interface, les commandes système et les modules de base :

```
📁 Penguin Simulator
├── modules/              # Bibliothèques système
│   ├── storage.js        # Gestion IndexedDB
│   ├── filesystem.js     # Système de fichiers Unix
│   ├── terminal.js       # Interface terminal
│   └── users/            # Gestion utilisateurs
│       ├── user.service.js
│       ├── defaults/
│       └── file-utils.js
├── bin/                  # Exécutables système
│   ├── bash.js          # Shell principal + builtins (cd, pwd, etc.)
│   ├── ls.js            # Commande ls
│   ├── rm.js            # Commande rm
│   ├── mkdir.js         # Commande mkdir
│   ├── mv.js            # Commande mv
│   ├── echo.js          # Commande echo
│   ├── useradd.js       # Gestion utilisateurs
│   └── su.js            # Changement d'utilisateur
├── test-cases/          # Suite de tests automatisés
│   ├── main.js          # Runner de tests
│   ├── lib/             # Utilitaires de test
│   └── specs/           # Spécifications de test
├── assets/              # Ressources statiques
│   ├── style.css        # Styles terminal
│   └── terminal-favicon.svg
├── readme/              # Documentation détaillée
│   └── commandes.md     # Référence exhaustive des commandes
├── index.js             # Point d'entrée principal
├── index.html           # Interface web
└── README.md            # Cette documentation
```

## 🛠️ Installation et Utilisation

### Prérequis
- Navigateur moderne (support ES6 modules)
- Serveur HTTP local (pour les modules ES6)

### Démarrage Rapide

1. **Cloner le repository**
   ```bash
   git clone git@github.com:codeurH24/penguin-simulator.git
   cd penguin-simulator
   ```

2. **Lancer un serveur HTTP local**
   ```bash
   # Python
   python3 -m http.server 8000
   
   # Node.js
   npx http-server
   
   # PHP
   php -S localhost:8000
   ```

3. **Ouvrir dans le navigateur**
   ```
   http://localhost:8000
   ```

### Exemple d'index.html

```html
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terminal Linux - Debian Bash Simulator</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.min.css" />
    <link rel="stylesheet" href="/assets/style.css">
    <script src="https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.min.js"></script>
</head>
<body>
    <div id="terminal"></div>
    <script type="module" src="index.js"></script>
</body>
</html>
```

## 🧪 Tests Automatisés

Le projet inclut une suite de tests complète vérifiant :

- **Système de fichiers** : Permissions, navigation, opérations
- **Commandes** : Vérification du comportement par rapport à Debian/Bash
- **Utilisateurs** : Création, permissions, /etc/skel
- **Standards Debian** : Conformité aux conventions

### Lancer les tests

```javascript
// Dans la console du navigateur
window.testRunner.runAllTests()     // Tous les tests
window.testRunner.runSystemTests()  // Tests système uniquement
```

## 🎯 Objectifs du Projet

### Fidélité au Système
- Reproduction la plus exacte possible du comportement Bash/Debian
- Respect des standards Unix (permissions, codes de retour)
- Gestion complète des erreurs et cas limites

### Architecture Modulaire
- Séparation claire des responsabilités
- Modules réutilisables et testables
- Structure évolutive pour nouvelles commandes

### Expérience Utilisateur
- Interface terminal native (xterm.js)
- Persistance des données (IndexedDB)
- Performance optimisée en JavaScript

### Limitations et Défis
- **Environnement navigateur** : Certaines fonctionnalités système ne peuvent être parfaitement simulées
- **Évolution continue** : Amélioration constante de la fidélité au comportement Debian
- **Compromis performance** : Balance entre authenticité et réactivité web

## 🔧 Développement

### Ajouter une Nouvelle Commande

1. **Créer le fichier** dans `/bin/`
   ```javascript
   // bin/ma-commande.js
   export function cmdMaCommande(args, context) {
       // Implémentation
   }
   ```

2. **Enregistrer dans le terminal** (`modules/terminal/xterm/terminal.js`) dans les imports et la logique de commandes

3. **Créer les tests** dans `/test-cases/specs/commands/`

> 📖 **[Guide complet de développement](readme/structure.md#développement)** - Architecture détaillée et conventions

### Standards de Code
- **JavaScript ES6+** : Modules, arrow functions, destructuring
- **Commentaires en français** : Documentation claire
- **Tests obligatoires** : Couverture de tous les cas
- **Respect Debian** : Comportement le plus proche possible du système réel

## 📝 Licence

Projet open source - Consultez le fichier LICENSE pour les détails.

## 🤝 Contribution

Les contributions sont les bienvenues ! Merci de :

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/ma-fonctionnalite`)
3. Ajouter des tests pour votre code
4. Commit avec des messages clairs
5. Push et créer une Pull Request

## 🐛 Issues et Support

- **GitHub Issues** : [Signaler un bug](https://github.com/codeurH24/penguin-simulator/issues)
- **Discussions** : [Forum du projet](https://github.com/codeurH24/penguin-simulator/discussions)

---

> 🐧 "Un pingouin dans votre navigateur vaut mieux qu'un serveur dans la nature !"