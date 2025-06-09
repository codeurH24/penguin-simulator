// modules/users/defaults/skel-content.js
// Structure par défaut de /etc/skel

import { createFileEntry, createDirEntry } from '../file-utils.js'

/**
 * Crée la structure par défaut de /etc/skel
 * @param {Object} fileSystem - Système de fichiers
 */
export function createSkelStructure(fileSystem) {
    // Créer le répertoire /etc/skel
    fileSystem['/etc/skel'] = createDirEntry('root', 'root', 'drwxr-xr-x');

    // Fichiers de configuration par défaut
    fileSystem['/etc/skel/.bashrc'] = createFileEntry(`# ~/.bashrc: executed by bash(1) for non-login shells.

# If not running interactively, don't do anything
case $- in
    *i*) ;;
      *) return;;
esac

# History control
HISTCONTROL=ignoreboth
HISTSIZE=1000
HISTFILESIZE=2000

# Check window size after each command
shopt -s checkwinsize

# Enable color support
if [ -x /usr/bin/dircolors ]; then
    test -r ~/.dircolors && eval "$(dircolors -b ~/.dircolors)" || eval "$(dircolors -b)"
    alias ls='ls --color=auto'
    alias grep='grep --color=auto'
fi

# Some useful aliases
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'
`);

    fileSystem['/etc/skel/.bash_logout'] = createFileEntry(`# ~/.bash_logout: executed by bash(1) when login shell exits.

# Clear console on logout
if [ "$SHLVL" = 1 ]; then
    [ -x /usr/bin/clear_console ] && /usr/bin/clear_console -q
fi
`);

    fileSystem['/etc/skel/.profile'] = createFileEntry(`# ~/.profile: executed by the command interpreter for login shells.

# If running bash
if [ -n "$BASH_VERSION" ]; then
    # Include .bashrc if it exists
    if [ -f "$HOME/.bashrc" ]; then
        . "$HOME/.bashrc"
    fi
fi

# Set PATH so it includes user's private bin if it exists
if [ -d "$HOME/bin" ] ; then
    PATH="$HOME/bin:$PATH"
fi

if [ -d "$HOME/.local/bin" ] ; then
    PATH="$HOME/.local/bin:$PATH"
fi
`);

    console.log('📁 Structure /etc/skel créée');
}