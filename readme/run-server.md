# 🚀 Comment lancer un serveur frontend

Ce guide présente toutes les méthodes pour lancer un serveur HTTP local afin de servir les fichiers statiques du projet Penguin Simulator.

## 📥 Prérequis - Cloner le projet

```bash
# Cloner le projet depuis GitHub
git clone https://github.com/codeurH24/penguin-simulator.git
cd penguin-simulator
```

## 🐳 Docker + Nginx (Recommandé pour la production)

### Commande simple (One-liner)

```bash
# Cloner le projet
git clone https://github.com/codeurH24/penguin-simulator.git
cd penguin-simulator

# Lancer directement avec nginx (le plus rapide)
docker run -d -p 4050:80 -v $(pwd):/usr/share/nginx/html:ro --name penguin-terminal nginx:alpine
```

**Accès :** http://localhost:4050

### Alternative avec Apache

```bash
# Cloner le projet
git clone https://github.com/codeurH24/penguin-simulator.git
cd penguin-simulator

# Lancer avec Apache
docker run -d -p 4050:80 -v $(pwd):/usr/local/apache2/htdocs:ro --name penguin-terminal httpd:alpine
```

**Accès :** http://localhost:4050

### Docker Compose (Recommandé)

```bash
# Cloner le projet
git clone https://github.com/codeurH24/penguin-simulator.git
cd penguin-simulator
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  penguin-simulator:
    image: nginx:alpine
    ports:
      - "4050:80"
    volumes:
      - .:/usr/share/nginx/html:ro
    restart: unless-stopped
    container_name: penguin-terminal
```

```bash
# Lancer avec Docker Compose
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter
docker-compose down
```

**Accès :** http://localhost:4050

## 🐍 Python

### Python 3 (Recommandé)
```bash
# Cloner le projet
git clone https://github.com/codeurH24/penguin-simulator.git
cd penguin-simulator

# Serveur HTTP simple
python3 -m http.server 4050

# Avec binding sur une interface spécifique
python3 -m http.server 4050 --bind 127.0.0.1
```

### Python 2 (Legacy)
```bash
# Pour les anciens systèmes
python2 -m SimpleHTTPServer 4050
```

**Accès :** http://localhost:4050

## 📦 Node.js / npm

### Avec npx (sans installation)
```bash
# Cloner le projet
git clone https://github.com/codeurH24/penguin-simulator.git
cd penguin-simulator

# http-server (le plus populaire)
npx http-server -p 4050 -c-1

# serve (simple et rapide)
npx serve . -p 4050

# live-server (avec auto-reload)
npx live-server --port=4050 --host=localhost

# http-server avec CORS
npx http-server -p 4050 --cors
```

### Avec installation globale
```bash
# Installer http-server globalement
npm install -g http-server
http-server -p 4050

# Installer serve globalement  
npm install -g serve
serve -s . -p 4050

# Installer live-server globalement
npm install -g live-server
live-server --port=4050
```

### Avec Yarn
```bash
# Avec yarn et serve
yarn global add serve
serve -s . -p 4050

# Avec yarn et http-server
yarn global add http-server
http-server -p 4050
```

**Accès :** http://localhost:4050

## 🐘 PHP

### PHP Built-in Server
```bash
# Cloner le projet
git clone https://github.com/codeurH24/penguin-simulator.git
cd penguin-simulator

# Serveur PHP simple
php -S localhost:4050

# Avec un répertoire personnalisé
php -S localhost:4050 -t .

# Avec un fichier de configuration
php -S localhost:4050 -c /path/to/php.ini
```

**Accès :** http://localhost:4050

## 💎 Ruby

```bash
# Ruby avec WEBrick
ruby -run -e httpd . -p 4050

# Avec une gem
gem install adsf
adsf -p 4050
```

**Accès :** http://localhost:4050

## 🦀 Rust

```bash
# Avec basic-http-server
cargo install basic-http-server
basic-http-server -a 127.0.0.1:4050

# Avec miniserve (plus de fonctionnalités)
cargo install miniserve
miniserve --index index.html -p 4050 .
```

**Accès :** http://localhost:4050

## 🏃 Go

```bash
# Serveur HTTP simple en Go (à sauvegarder dans server.go)
cat > server.go << 'EOF'
package main

import (
    "net/http"
    "log"
)

func main() {
    fs := http.FileServer(http.Dir("."))
    http.Handle("/", fs)
    
    log.Println("Serveur démarré sur http://localhost:4050")
    log.Fatal(http.ListenAndServe(":4050", nil))
}
EOF

# Exécuter
go run server.go
```

**Accès :** http://localhost:4050

## 🔧 Autres solutions

### Avec Deno
```bash
# Serveur simple avec Deno
deno run --allow-net --allow-read https://deno.land/std@0.140.0/http/file_server.ts --port 4050
```

### Avec Bun
```bash
# Serveur avec Bun
bunx serve . -p 4050
```

## ⚡ Recommandations par cas d'usage

### 🔬 **Développement local rapide**
```bash
# Cloner le projet
git clone https://github.com/codeurH24/penguin-simulator.git
cd penguin-simulator

# Puis au choix :
npx serve . -p 4050
# ou
python3 -m http.server 4050
```

### 🏗️ **Développement avec hot reload**
```bash
# Cloner le projet
git clone https://github.com/codeurH24/penguin-simulator.git
cd penguin-simulator

# Serveur avec auto-reload
npx live-server --port=4050
```

### 🐳 **Test en environnement proche de la production**
```bash
# Cloner le projet
git clone https://github.com/codeurH24/penguin-simulator.git
cd penguin-simulator

# Solution simple avec nginx
docker run -d -p 4050:80 -v $(pwd):/usr/share/nginx/html:ro --name penguin-terminal nginx:alpine

# Ou avec Docker Compose
docker-compose up -d
```

### 🚀 **Déploiement production**
- Docker + Nginx avec reverse proxy
- Serveur web statique (Netlify, Vercel, GitHub Pages)

## 🛠️ Résolution des problèmes courants

### Erreur CORS
```bash
# Utiliser http-server avec CORS
npx http-server -p 4050 --cors
```

### Port déjà utilisé
```bash
# Vérifier les ports utilisés
netstat -tlnp | grep :4050
# ou
lsof -i :4050

# Utiliser un autre port
python3 -m http.server 4051
```

### Modules ES6 non chargés
- Vérifiez que vous accédez via HTTP (pas file://)
- Utilisez un serveur local, pas l'ouverture directe du fichier
- Vérifiez la configuration MIME type pour .js

### Conteneur Docker déjà en cours d'exécution
```bash
# Arrêter et supprimer le conteneur existant
docker stop penguin-terminal
docker rm penguin-terminal

# Relancer
docker run -d -p 4050:80 -v $(pwd):/usr/share/nginx/html:ro --name penguin-terminal nginx:alpine
```

## 📚 Ressources

- [MDN - Utilisation des modules JavaScript](https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide/Modules)
- [Docker Documentation](https://docs.docker.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)