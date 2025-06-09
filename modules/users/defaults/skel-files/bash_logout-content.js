// modules/users/defaults/skel-files/bash_logout-content.js
// Contenu par défaut du fichier ~/.bash_logout

export const DEFAULT_BASH_LOGOUT_CONTENT = `# ~/.bash_logout: executed by bash(1) when login shell exits.

# when leaving the console clear the screen to increase privacy

if [ "$SHLVL" = 1 ]; then
    [ -x /usr/bin/clear_console ] && /usr/bin/clear_console -q
fi`;