import { Autocompletion } from "./Autocompletion.js";

export class Input {

    constructor(terminal) {

        this.terminal = terminal
        this.autocompletion = new Autocompletion(this.terminal.term, this.terminal.context);
        this.terminal.inputStr = '';

        this.terminal.keyboard.onKeyEnter(() => {
            this.terminal.sendCommand();
        })
        
        this.terminal.keyboard.onKeyCtrlC(() => {
            this.handleCtrlC();
        })

        this.terminal.keyboard.onkeyPressed((data, position) => {
            this.charAddAt(data, position)
            this.terminal.term.write(data);
        });

        this.terminal.keyboard.onKeyUp(() => {
            const previous = this.terminal.history.getPrevious(this.terminal.inputStr);
            this.replaceCurrentInput(previous);
        })

        this.terminal.keyboard.onKeyDown(() => {
            const next = this.terminal.history.getNext(this.terminal.inputStr);
            this.replaceCurrentInput(next);
        })

        this.terminal.keyboard.onKeyBackspace((position) => {
            this.charRemoveAt(position);
        })

        this.terminal.keyboard.onKeyTab(() => {
            this.handleTabCompletion();
        })
    }
    
    handleCtrlC() {
        // Vider la ligne de commande actuelle
        this.terminal.inputStr = '';
        
        // Réinitialiser la position du curseur
        this.terminal.keyboard.updatePosition(this.terminal.inputStr);
        
        // Afficher un nouveau prompt (comme dans un vrai terminal bash)
        this.terminal.showPrompt();
    }

    charRemoveAt(position) {
        const strPrePosition = this.terminal.inputStr.slice(0, position);
        const strPostPosition = this.terminal.inputStr.slice(position + 1)
        this.terminal.inputStr = strPrePosition + strPostPosition;
    }
    charAddAt(char, position) {
        const strPrePosition = this.terminal.inputStr.slice(0, position);
        const strPostPosition = this.terminal.inputStr.slice(position);
        this.terminal.inputStr = strPrePosition + char + strPostPosition;
    }

    /**
     * Gestion de l'auto-complétion avec la nouvelle classe
     */
    async handleTabCompletion() {
        const optionsDisplayed = await this.autocompletion.handleTabCompletion(
            this.terminal.inputStr,
            (text) => this.insertText(text)
        );

        // TOUJOURS réafficher le prompt si des options ont été affichées
        if (optionsDisplayed) {
            this.terminal.showPrompt();
            this.terminal.term.write(this.terminal.inputStr);
        }
    }

    /**
     * Insère du texte à la fin de la ligne de commande
     * @param {string} text - Texte à insérer
     */
    insertText(text) {
        this.terminal.inputStr += text;
        this.terminal.term.write(text);
        this.terminal.keyboard.updatePosition(this.terminal.inputStr);
    }

    replaceCurrentInput(newInput) {
        // Efface la ligne actuelle
        this.terminal.term.write('\r\x1b[K');
        this.terminal.showPrompt();
        this.terminal.term.write(newInput);
        this.terminal.inputStr = newInput;
        this.terminal.keyboard.updatePosition(this.terminal.inputStr);
    }

}