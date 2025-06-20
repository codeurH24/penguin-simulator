# 📚 Référence des Commandes - Penguin Simulator

## 🎯 Tableau de Synthèse

| Commande | Type | Options principales | Description | Statut |
|----------|------|-------------------|-------------|--------|
| [`ls`](#ls---lister-le-contenu) | Externe | `-l`, `-a`, `-h` | Lister le contenu d'un répertoire | ✅ |
| [`cd`](#cd---changer-de-répertoire) | Builtin | `~`, `-` | Changer de répertoire | ✅ |
| [`pwd`](#pwd---répertoire-courant) | Builtin | - | Afficher le répertoire courant | ✅ |
| [`mkdir`](#mkdir---créer-des-répertoires) | Externe | `-p` | Créer des répertoires | ✅ |
| [`rm`](#rm---supprimer) | Externe | `-r`, `-f` | Supprimer fichiers/répertoires | ✅ |
| [`mv`](#mv---déplacerrenommer) | Externe | - | Déplacer/renommer | ✅ |
| [`echo`](#echo---afficher-du-texte) | Externe | `-n`, `-e`, `-E` | Afficher du texte | ✅ |
| [`touch`](#touch---créer-fichiers-vides) | Externe | - | Créer fichiers vides | ✅ |
| [`cat`](#cat---afficher-le-contenu) | Externe | - | Afficher le contenu de fichiers | ✅ |
| [`help`](#help---aide) | Builtin | - | Afficher l'aide des commandes | 🔴 |
| [`clear`](#clear---vider-lécran) | Builtin | - | Vider l'écran du terminal | ✅ |
| [`reset`](#reset---réinitialiser) | Builtin | - | Réinitialiser le terminal | 🔴 |
| [`set`](#set---variables-denvironnement) | Builtin | - | Afficher les variables d'environnement | 🔴 |
| [`export`](#export---exporter-des-variables) | Builtin | `[var[=value]]` | Exporter des variables | ✅ |
| [`exit`](#exit---quitter) | Builtin | `[code]` | Quitter une session utilisateur | ✅ |
| [`useradd`](#useradd---ajouter-un-utilisateur) | Externe | `-m`, `-d`, `-g`, `-s` | Ajouter un utilisateur | ✅ |
| [`usermod`](#usermod---modifier-un-utilisateur) | Externe | `-G`, `-a` | Modifier un utilisateur | 🟠 |
| [`groupadd`](#groupadd---ajouter-un-groupe) | Externe | - | Ajouter un groupe | 🟠 |
| [`chmod`](#chmod---modifier-les-permissions) | Externe | `mode` | Modifier les permissions | ✅ |
| [`su`](#su---changer-dutilisateur) | Externe | `[user]` | Changer d'utilisateur | ✅ |
| [`passwd`](#passwd---changer-mot-de-passe) | Externe | `[user]` | Changer mot de passe | ✅ |
| [`sudo`](#sudo---exécution-avec-privilèges-élevés) | Externe | `-u`, `-l`, `-k`, `-v` | Exécuter avec privilèges élevés | 🟠 |
| [`whoami`](#whoami---utilisateur-courant) | Externe | - | Afficher l'utilisateur courant | ✅ |
| [`id`](#id---informations-didentité) | Externe | `[user]` | Afficher infos d'identité | 🟠 |
| [`groups`](#groups---groupes-de-lutilisateur) | Externe | `[user]` | Afficher les groupes | 🟠 |

**Légende :**
- **Externe** : Commande implémentée dans `/bin/`
- **Builtin** : Commande intégrée au shell dans `/lib/bash-builtins.js`
- ✅ **Fonctionnel** : Implémentation complète et testée
- 🟠 **Partiellement fonctionnel** : Fonctionnel et / ou tests incomplets, voir même absents. 
- 🔴 **Non fonctionnel** : Implémentation manquante ou défectueuse

---

## 📂 Commandes de Navigation et Fichiers

### `ls` - Lister le contenu

**Syntaxe :** `ls [options] [répertoire]`

**Options :**
- `-l` : Format long (permissions, propriétaire, taille, date)
- `-a` : Afficher tous les fichiers (y compris cachés avec `.`)
- `-h` : Tailles lisibles par l'homme (avec `-l`)

**Exemples :**
```bash
ls                    # Contenu du répertoire courant
ls -l                 # Format détaillé
ls -la                # Tout afficher en format détaillé
ls /etc               # Contenu de /etc
```

**Couleurs :**
- 🔵 Bleu : Répertoires
- ⚪ Blanc : Fichiers normaux
- 🟢 Vert : Exécutables

---

### `cd` - Changer de répertoire

**Syntaxe :** `cd [répertoire]`

**Raccourcis spéciaux :**
- `cd` ou `cd ~` : Retour au répertoire home
- `cd -` : Répertoire précédent
- `cd ..` : Répertoire parent
- `cd /` : Racine du système

**Exemples :**
```bash
cd /etc               # Aller dans /etc
cd                    # Retour home
cd -                  # Répertoire précédent
cd ~/Documents        # Sous-dossier du home
```

---

### `pwd` - Répertoire courant

**Syntaxe :** `pwd`

Affiche le chemin absolu du répertoire de travail actuel.

**Exemple :**
```bash
pwd                   # Affiche : /home/utilisateur
```

---

### `mkdir` - Créer des répertoires

**Syntaxe :** `mkdir [options] répertoire...`

**Options :**
- `-p` : Créer les répertoires parents si nécessaire

**Exemples :**
```bash
mkdir dossier         # Créer un dossier
mkdir dir1 dir2       # Créer plusieurs dossiers
mkdir -p a/b/c        # Créer la hiérarchie complète
```

---

### `rm` - Supprimer

**Syntaxe :** `rm [options] fichier...`

**Options :**
- `-r` : Récursif (pour les répertoires)
- `-f` : Forcer (pas de confirmation)

**Support wildcards :**
- `*` : N'importe quelle séquence de caractères
- `?` : Un seul caractère

**Exemples :**
```bash
rm fichier.txt        # Supprimer un fichier
rm -r dossier         # Supprimer un dossier
rm *.txt              # Supprimer tous les .txt
rm -rf temp           # Forcer suppression récursive
```

---

### `mv` - Déplacer/Renommer

**Syntaxe :** `mv source destination`

**Utilisations :**
- Renommer : `mv ancien_nom nouveau_nom`
- Déplacer : `mv fichier /autre/répertoire/`
- Les deux : `mv fichier /autre/répertoire/nouveau_nom`

**Exemples :**
```bash
mv fichier.txt doc.txt          # Renommer
mv fichier.txt /tmp/           # Déplacer
mv dossier /home/user/nouveau  # Déplacer et renommer
```

---

## 📝 Commandes de Texte et Affichage

### `echo` - Afficher du texte

**Syntaxe :** `echo [options] [texte...]`

**Options :**
- `-n` : Pas de nouvelle ligne à la fin
- `-e` : Interpréter les séquences d'échappement
- `-E` : Désactiver l'interprétation (défaut)

**Séquences d'échappement (avec `-e`) :**
- `\n` : Nouvelle ligne
- `\t` : Tabulation
- `\\` : Antislash littéral

**Exemples :**
```bash
echo "Bonjour monde"           # Affichage simple
echo -n "Sans retour ligne"    # Sans \n
echo -e "Ligne1\nLigne2"      # Avec nouvelle ligne
echo $HOME                     # Afficher une variable
```

---

### `cat` - Afficher le contenu

**Syntaxe :** `cat [options] fichier...`

**Options :**
- `-n` : Numéroter les lignes

Affiche le contenu complet d'un ou plusieurs fichiers.

**Exemples :**
```bash
cat fichier.txt               # Afficher un fichier
cat file1.txt file2.txt      # Plusieurs fichiers
```

---

### `touch` - Créer fichiers vides

**Syntaxe :** `touch fichier...`

Crée des fichiers vides ou met à jour la date de modification.

**Exemples :**
```bash
touch nouveau.txt             # Créer fichier vide
touch file1 file2 file3      # Plusieurs fichiers
```

---

### `chmod` - Modifier les permissions

**Syntaxe :** `chmod mode fichier...`

**Modes supportés :**
- **Numérique** : `755`, `644`, etc.
- **Symbolique** : `u+x`, `g-w`, `o=r`, etc.

**Options :**
- Aucune option spécifique implémentée actuellement

**Exemples :**
```bash
chmod 755 script.sh           # Mode numérique
chmod u+x fichier.txt         # Ajouter exécution pour propriétaire
chmod g-w,o-r fichier.txt     # Retirer écriture groupe et lecture autres
chmod a=r fichier.txt         # Lecture pour tous, rien d'autre
```

---

## 👤 Gestion des Utilisateurs

### `useradd` - Ajouter un utilisateur

**Syntaxe :** `useradd [options] username`

**Options :**
- `-m` : Créer le répertoire home
- `-d répertoire` : Spécifier le home
- `-g groupe` : Groupe principal
- `-s shell` : Shell par défaut

**Exemples :**
```bash
useradd -m john               # Créer avec home
useradd -m -s /bin/bash alice # Avec shell spécifique
useradd -m -d /home/custom bob # Home personnalisé
```

---

### `usermod` - Modifier un utilisateur 🟠

**Syntaxe :** `usermod [options] utilisateur`

**Options supportées :**
- `-G groupes` : Définir les groupes secondaires (remplace les existants)
- `-a -G groupes` : Ajouter aux groupes secondaires (sans remplacer)

**⚠️ STATUT : PARTIELLEMENT FONCTIONNEL**
- Fonctionnalité principale : Ajout de groupes secondaires
- Limitations : Autres options non implémentées

**Exemples :**
```bash
usermod -G sudo,users alice   # Définir groupes secondaires
usermod -a -G docker bob      # Ajouter au groupe docker
```
---

### `groupadd` - Ajouter un groupe 🟠

**Syntaxe :** `groupadd [options] GROUPE`

**Options supportées :**
- `-g, --gid GID` : Utiliser GID comme identifiant de groupe
- `-h, --help` : Afficher l'aide et quitter
- `-r, --system` : Créer un groupe système (GID 100-999)
- `-f, --force` : Forcer la création (succès silencieux si groupe existe)

**⚠️ STATUT : PARTIELLEMENT FONCTIONNEL**
- **Fonctionnalités implémentées :**
  - Création de groupes utilisateur et système
  - Attribution automatique de GID ou GID personnalisé
  - Validation des noms de groupe et plages de GID
  - Gestion des permissions (nécessite root)
  - Comportement silencieux en cas de succès (conforme Unix)

**Restrictions :**
- **Permissions** : Seul root peut exécuter cette commande
- **Validation** : Noms de groupe limités à `[a-z][a-z0-9_-]*`
- **GID** : Plage 0-65535, recommandations système (100-999) et utilisateur (≥1000)

**Fonctionnalités :**
- **Génération automatique de GID** : Attribution du prochain GID disponible
- **Groupes système** : Avec `-r`, crée un groupe dans la plage système
- **Validation robuste** : Vérification des doublons et contraintes
- **Gestion d'erreurs** : Messages d'aide contextuels
- **Conformité Debian** : Format `/etc/group` standard

**Exemples :**
```bash
groupadd developers           # Créer groupe utilisateur (GID auto)
groupadd -g 500 staff        # Créer avec GID spécifique
groupadd -r services         # Créer groupe système
groupadd -f existing         # Forcer (pas d'erreur si existe)
sudo groupadd docker         # Avec privilèges élevés
```

---

### `su` - Changer d'utilisateur

**Syntaxe :** `su [utilisateur]`

**Comportement :**
- `su` sans argument : Devenir root
- `su utilisateur` : Changer vers cet utilisateur
- Demande le mot de passe de l'utilisateur cible

**Exemples :**
```bash
su                            # Devenir root
su john                       # Devenir john
```

---

### `passwd` - Changer mot de passe

**Syntaxe :** `passwd [utilisateur]`

**Comportement :**
- `passwd` : Changer son propre mot de passe
- `passwd user` : Changer le mot de passe d'un autre utilisateur (root requis)

**Exemples :**
```bash
passwd                        # Mon mot de passe
passwd john                   # Mot de passe de john (si root)
```

---

#### `sudo` - Exécution avec privilèges élevés 🟠
**⚠️ STATUT : TESTS INCOMPLETS** - Implémentation avancée mais tests absents

```bash
sudo ls /root                 # Exécuter ls en tant que root
sudo -u alice cat file.txt    # Exécuter en tant qu'alice  
sudo -l                       # Lister les privilèges
sudo -k                       # Effacer le timestamp
```

---

### Commandes d'information

#### `whoami` - Utilisateur courant ✅
**✅ STATUT : COMPLET AVEC TESTS** - Implémentation complète et tests de conformité Debian

```bash
whoami                        # Affiche : root
```

#### `id` - Informations d'identité 🟠
**⚠️ STATUT : TESTS INCOMPLETS** - Fonctionnel mais tests absents ou incomplets

```bash
id                            # uid=1000(john) gid=1000(john) groups=1000(john)
id root                       # Infos sur root
```

#### `groups` - Groupes de l'utilisateur 🟠
**⚠️ STATUT : TESTS INCOMPLETS** - Fonctionnel mais tests absents ou incomplets

```bash
groups                        # john
groups alice                  # Groupes d'alice
```

---

## ⚙️ Commandes du Shell

### `help` - Aide 🔴

**Syntaxe :** `help`

**⚠️ STATUT : NON FONCTIONNEL**
- Fonctionnalité incertaine
- Aucun test disponible

Devrait afficher la liste complète des commandes disponibles avec une description courte.

---

### `clear` - Vider l'écran

**Syntaxe :** `clear`

Efface tout le contenu visible du terminal.

---

### `reset` - Réinitialiser 🔴

**Syntaxe :** `reset`

**⚠️ STATUT : NON FONCTIONNEL**
- Implémentation manquante dans `lib/bash-builtins.js`
- Non géré dans `modules/terminal/xterm/terminal.js`
- Aucun test disponible

Devrait réinitialiser complètement l'état du terminal.

---

### `set` - Variables d'environnement 🔴

**Syntaxe :** `set`

**⚠️ STATUT : NON FONCTIONNEL**
- Fonctionnalité incertaine
- Tests requis pour validation

Devrait afficher toutes les variables d'environnement actuelles triées par ordre alphabétique.

**Variables système automatiques attendues :**
- `HOME` : Répertoire home de l'utilisateur
- `USER` : Nom d'utilisateur courant
- `PWD` : Répertoire de travail actuel
- `SHELL` : Shell par défaut
- `PATH` : Chemins de recherche des exécutables

---

### `export` - Exporter des variables

**Syntaxe :** `export [variable[=valeur]]...`

**Utilisations :**
- `export` : Afficher les variables exportées
- `export VAR=valeur` : Définir et exporter
- `export VAR` : Exporter une variable existante

**Exemples :**
```bash
export EDITOR=nano            # Définir et exporter
VAR=test
export VAR                    # Exporter variable existante
export                        # Voir toutes les exportées
```

---

### `exit` - Quitter

**Syntaxe :** `exit [code]`

**Comportement :**
- Quitte la session utilisateur courante
- Si une pile d'utilisateurs existe (suite à `su`), retourne à l'utilisateur précédent
- Si aucun utilisateur dans la pile, affiche un message de sortie final
- Code de sortie optionnel (défaut : 0)

**Fonctionnalités :**
- **Dépilement des sessions** : Gestion automatique de la pile créée par `su`
- **Restauration du contexte** : Retour à l'utilisateur et répertoire précédents
- **Gestion d'erreurs** : Validation des codes de sortie
- **Comportement silencieux** : Aucune sortie lors du dépilement (conforme bash)

**Exemples :**
```bash
su alice                      # Passer à alice
exit                          # Retourner à l'utilisateur précédent
```

**Tests disponibles :**
- Séquence complète de dépilement (root→alice→bob→charlie)
- Gestion des codes de sortie et arguments invalides
- Préservation des répertoires avec différents types de `su`

---

## 🔄 Fonctionnalités Avancées

### Variables d'environnement

**Définition :** `VARIABLE=valeur`
**Utilisation :** `$VARIABLE` ou `${VARIABLE}`

```bash
NAME="Jean"
echo "Bonjour $NAME"          # Bonjour Jean
export PATH="/usr/bin:$PATH"  # Modifier PATH
```

### Redirections

**Redirection de sortie :**
- `commande > fichier` : Écraser le fichier
- `commande >> fichier` : Ajouter au fichier

```bash
echo "Hello" > test.txt       # Créer/écraser
echo "World" >> test.txt      # Ajouter
ls -l > listing.txt          # Sauver listing
```

### Autocomplétion

- **TAB** : Complétion automatique des noms de fichiers/répertoires
- **↑/↓** : Navigation dans l'historique des commandes

---

> 📖 **Pour les développeurs :** Consultez [`readme/structure.md`](structure.md) pour comprendre l'architecture détaillée et apprendre à ajouter de nouvelles commandes.