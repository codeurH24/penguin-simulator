# 🗨️ Système de Prompts Personnalisés

Le terminal Linux supporte maintenant des **prompts interactifs personnalisés** pour créer des commandes dynamiques et des interfaces utilisateur sophistiquées.

## 🚀 Utilisation de base

### API principale

```javascript
// Prompt personnalisé simple
terminal.prompt.showCustomPrompt('Question ? ', (response) => {
    console.log('Réponse utilisateur:', response);
});
```

### Question simple

```javascript
terminal.prompt.askQuestion('Quel est votre nom ? ', (name) => {
    terminal.term.write(`Bonjour ${name} !\r\n`);
});
```

## 🔐 Saisie sécurisée

### Mot de passe caché

```javascript
terminal.prompt.askPassword('Mot de passe: ', (password) => {
    if (password === 'secret') {
        terminal.term.write('Accès autorisé\r\n');
    } else {
        terminal.term.write('Accès refusé\r\n');
    }
});
```

> **🐧 Comportement Linux authentique :** La saisie ne s'affiche pas du tout à l'écran (ni caractères ni étoiles), exactement comme dans un vrai terminal Linux.

### Avec gestion d'annulation

```javascript
terminal.prompt.askPassword('Mot de passe: ', (password) => {
    terminal.term.write('Connexion réussie\r\n');
}, () => {
    terminal.term.write('Connexion annulée\r\n');
});
```

## ✅ Confirmations

### Confirmation oui/non

```javascript
terminal.prompt.askConfirmation('Supprimer le fichier ?', (confirmed) => {
    if (confirmed) {
        terminal.term.write('Fichier supprimé\r\n');
    } else {
        terminal.term.write('Opération annulée\r\n');
    }
});
```

**Réponses acceptées :** `y`, `yes`, `o`, `oui` (confirme) / tout autre chose (annule)

## 🔍 Validation des saisies

### Validation avec message d'erreur

```javascript
terminal.prompt.askWithValidation('Entrez un nombre (1-100): ', (input) => {
    const num = parseInt(input);
    if (isNaN(num)) {
        return { valid: false, message: 'Veuillez entrer un nombre valide.' };
    }
    if (num < 1 || num > 100) {
        return { valid: false, message: 'Le nombre doit être entre 1 et 100.' };
    }
    return { valid: true };
}, (validNumber) => {
    terminal.term.write(`Nombre valide: ${validNumber}\r\n`);
});
```

### Validation d'email

```javascript
terminal.prompt.askWithValidation('Email: ', (input) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input)) {
        return { valid: false, message: 'Format d\'email invalide.' };
    }
    return { valid: true };
}, (email) => {
    terminal.term.write(`Email enregistré: ${email}\r\n`);
});
```

## 🔧 Options avancées

### Prompt avec toutes les options

```javascript
terminal.prompt.showCustomPrompt('Choisissez [1-3]: ', (choice) => {
    terminal.term.write(`Option ${choice} sélectionnée\r\n`);
}, {
    validator: (input) => {
        if (!['1', '2', '3'].includes(input.trim())) {
            return { valid: false, message: 'Veuillez entrer 1, 2 ou 3.' };
        }
        return { valid: true };
    },
    onCancel: () => {
        terminal.term.write('Sélection annulée\r\n');
    }
});
```

### Options disponibles

| Option | Type | Description |
|--------|------|-------------|
| `hidden` | `boolean` | Masque complètement la saisie (rien ne s'affiche) |
| `validator` | `function` | Fonction de validation personnalisée |
| `onCancel` | `function` | Appelée lors d'une annulation (Ctrl+C) |

## 🔄 Séquences de prompts

### Enchaîner plusieurs questions

```javascript
function creerUtilisateur() {
    let userData = {};
    
    // Étape 1: Nom d'utilisateur
    terminal.prompt.askWithValidation('Nom d\'utilisateur: ', (input) => {
        if (input.length < 3) {
            return { valid: false, message: 'Au moins 3 caractères requis.' };
        }
        return { valid: true };
    }, (username) => {
        userData.username = username;
        demanderEmail();
    });
    
    // Étape 2: Email
    function demanderEmail() {
        terminal.prompt.askWithValidation('Email: ', (input) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(input) ? 
                { valid: true } : 
                { valid: false, message: 'Format invalide.' };
        }, (email) => {
            userData.email = email;
            demanderMotDePasse();
        });
    }
    
    // Étape 3: Mot de passe
    function demanderMotDePasse() {
        terminal.prompt.askPassword('Mot de passe: ', (password) => {
            userData.password = password;
            confirmerCreation();
        });
    }
    
    // Étape 4: Confirmation
    function confirmerCreation() {
        terminal.term.write(`\r\nUtilisateur: ${userData.username}\r\n`);
        terminal.term.write(`Email: ${userData.email}\r\n`);
        
        terminal.prompt.askConfirmation('Créer cet utilisateur ?', (confirmed) => {
            if (confirmed) {
                terminal.term.write('✅ Utilisateur créé avec succès !\r\n');
            } else {
                terminal.term.write('❌ Création annulée\r\n');
            }
        });
    }
}

// Utilisation
creerUtilisateur();
```

## 📝 Utilisation dans les commandes

### Exemple de commande interactive

```javascript
// Dans bin/mycommand.js
export function cmdMyCommand(args) {
    const terminalService = this; // 'this' est le TerminalService
    
    terminalService.prompt.askQuestion('Configuration à charger ? ', (config) => {
        terminalService.prompt.askConfirmation(`Charger ${config} ?`, (confirmed) => {
            if (confirmed) {
                terminalService.term.write(`Configuration ${config} chargée !\r\n`);
            }
        });
    });
}
```

### Intégration dans commands.js

```javascript
// Dans modules/terminal/xterm/commands.js
import { cmdMyCommand } from "../../../bin/mycommand.js";

export function cmd(cmd, args) {
    // ... autres commandes
    if (cmd === 'mycommand') {
        cmdMyCommand.call(this, args);
    }
    // ...
}
```

## ⌨️ Contrôles utilisateur

| Touche | Action |
|--------|--------|
| **Entrée** | Valider la saisie |
| **Backspace** | Effacer le caractère précédent |
| **Ctrl+C** | Annuler le prompt (déclenche `onCancel` si défini) |
| **Caractères** | Saisie normale ou invisible (mode caché) |

> **Note :** En mode caché (`hidden: true`), aucun caractère ne s'affiche à l'écran, respectant le comportement standard des terminaux Linux.

## 🔄 Compatibilité

- ✅ **Compatible** avec le système bash existant
- ✅ **Compatible** avec les commandes actuelles (`ls`, `cd`, `pwd`, etc.)
- ✅ **Compatible** avec le mode password existant
- ✅ **Compatible** avec l'historique et l'autocomplétion

## 🎯 Cas d'usage

- **Assistants de configuration** : Guides d'installation interactifs
- **Formulaires** : Collecte d'informations utilisateur
- **Confirmations** : Validation d'actions destructives
- **Authentification** : Saisie sécurisée de mots de passe
- **Menus interactifs** : Navigation dans des options
- **Wizards** : Processus étape par étape

---

> 💡 **Tip :** Utilisez toujours `terminal.term.write()` avec `\r\n` pour l'affichage dans les callbacks pour respecter le format terminal.