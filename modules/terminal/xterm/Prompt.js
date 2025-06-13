// modules/terminal/xterm/Prompt.js
export class Prompt {

    constructor(terminal) {
        this.terminal = terminal;
    }

    showPrompt() {

        // Ne pas afficher le prompt si on est en mode password
        if (this.terminal.term.passwordMode) {
            return;
        }

        const username = this.terminal.context?.currentUser?.username || 'root';
        const currentPath = this.terminal.context?.getCurrentPath() || '/';
        this.uid = this.terminal.context?.currentUser?.uid || 0;

        this.terminal.term.write(`${username}@bash:${currentPath}${this.getShellSymbol()} `);
    }

    getShellSymbol() {
        return this.uid === 0 ? "#" : "$";
    }
}