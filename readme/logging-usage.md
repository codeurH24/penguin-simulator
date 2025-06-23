# 📊 Guide d'Utilisation des Logs - Penguin Simulator

## 🎹 Logs des Touches (Keystrokes)

### Commandes de base
```javascript
// Voir le nombre total de touches pressées
console.log(window.terminal.getTotalKeystrokes());

// Voir toutes les touches avec timestamps
console.log(window.terminal.getKeystrokes());

// Statistiques générales
console.log(window.terminal.getKeystrokeStats());

// Touches des 30 dernières secondes
console.log(window.terminal.getRecentKeystrokes(30000));
```

### Affichage formaté des touches
```javascript
// Dernières 10 touches avec formatage
const keystrokes = window.terminal.getKeystrokes();
keystrokes.slice(-10).forEach((k, i) => {
    const time = new Date(k.timestamp).toLocaleTimeString();
    const displayKey = k.charCode < 32 ? `[${k.charCode}]` : k.key;
    console.log(`${i+1}. [${time}] "${displayKey}" (code: ${k.charCode}, user: ${k.user})`);
});
```

## 📝 Logs des Commandes (History)

### Commandes de base
```javascript
// Voir l'historique complet avec timestamps
console.log(window.terminal.getCommandHistory());

// Nombre total de commandes
console.log(window.terminal.getTotalCommands());

// Commandes des 60 dernières secondes
console.log(window.terminal.getRecentCommands(60000));

// Dernières 10 commandes
const history = window.terminal.getCommandHistory();
console.log(history.slice(-10));
```

### Affichage formaté des commandes
```javascript
// Historique formaté
window.terminal.getCommandHistory().forEach((entry, i) => {
    const time = new Date(entry.timestamp).toLocaleTimeString();
    console.log(`${i+1}. [${time}] ${entry.user}@${entry.workingDirectory}: ${entry.command}`);
});

// Juste les dernières 5 commandes
window.terminal.getCommandHistory().slice(-5).forEach((entry, i) => {
    const time = new Date(entry.timestamp).toLocaleTimeString();
    console.log(`${i+1}. [${time}] ${entry.command}`);
});
```

## 🔧 Utilitaires

### Vider les logs
```javascript
// Vider les keystrokes
window.terminal.clearKeystrokes();

// Vider l'historique des commandes
window.terminal.clearCommandHistory();
```

### Export des données
```javascript
// Export keystrokes en JSON
const keystrokeData = window.terminal.exportKeystrokes();
console.log(keystrokeData);

// Créer un fichier téléchargeable
const blob = new Blob([keystrokeData], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `terminal-logs-${Date.now()}.json`;
a.click();
```

## 📈 Analyses Avancées

### Analyse des patterns de frappe
```javascript
function analyzeTypingPatterns() {
    const keystrokes = window.terminal.getKeystrokes();
    const commands = window.terminal.getCommandHistory();
    
    console.log('=== ANALYSE GLOBALE ===');
    console.log(`Total touches: ${keystrokes.length}`);
    console.log(`Total commandes: ${commands.length}`);
    
    if (keystrokes.length > 0) {
        const duration = keystrokes[keystrokes.length-1].timestamp - keystrokes[0].timestamp;
        const normalChars = keystrokes.filter(k => k.charCode >= 32 && k.charCode <= 126);
        const speed = (normalChars.length / (duration / 1000)) * 60;
        console.log(`Vitesse de frappe: ${Math.round(speed)} caractères/minute`);
    }
}

// Exécuter l'analyse
analyzeTypingPatterns();
```

### Commandes les plus utilisées
```javascript
function mostUsedCommands() {
    const commands = window.terminal.getCommandHistory();
    const cmdCount = {};
    
    commands.forEach(entry => {
        const baseCmd = entry.command.split(' ')[0];
        cmdCount[baseCmd] = (cmdCount[baseCmd] || 0) + 1;
    });
    
    console.log('=== COMMANDES LES PLUS UTILISÉES ===');
    Object.entries(cmdCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .forEach(([cmd, count]) => {
            console.log(`${cmd}: ${count} fois`);
        });
}

// Exécuter l'analyse
mostUsedCommands();
```

### Monitoring en temps réel
```javascript
function startMonitoring() {
    let lastKeystrokeCount = window.terminal.getTotalKeystrokes();
    let lastCommandCount = window.terminal.getTotalCommands();
    
    const monitor = setInterval(() => {
        const currentKeystrokes = window.terminal.getTotalKeystrokes();
        const currentCommands = window.terminal.getTotalCommands();
        
        const newKeystrokes = currentKeystrokes - lastKeystrokeCount;
        const newCommands = currentCommands - lastCommandCount;
        
        if (newKeystrokes > 0 || newCommands > 0) {
            console.log(`[${new Date().toLocaleTimeString()}] +${newKeystrokes} touches, +${newCommands} commandes`);
            lastKeystrokeCount = currentKeystrokes;
            lastCommandCount = currentCommands;
        }
    }, 2000);
    
    console.log('Monitoring démarré. Pour arrêter: clearInterval(' + monitor + ')');
    return monitor;
}

// Démarrer le monitoring
const monitorId = startMonitoring();

// Pour arrêter: clearInterval(monitorId);
```

## 🎯 Raccourcis Pratiques

```javascript
// Raccourcis à copier-coller dans la console

// Vue rapide des dernières activités
const last5 = window.terminal.getCommandHistory().slice(-5);
last5.forEach(c => console.log(`${new Date(c.timestamp).toLocaleTimeString()}: ${c.command}`));

// Statistiques rapides
console.log(`Touches: ${window.terminal.getTotalKeystrokes()}, Commandes: ${window.terminal.getTotalCommands()}`);

// Activité des 5 dernières minutes
const recent = window.terminal.getRecentCommands(300000);
console.log(`${recent.length} commandes dans les 5 dernières minutes`);
```