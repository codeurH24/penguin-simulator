export class History {
    constructor(maxSize = 1000) {
        this.commands = [];
        this.maxSize = maxSize;
        this.currentIndex = -1;
        this.tempCommand = '';
    }

    add(command) {
        if (!command || command.trim() === '') return;
        
        // Évite les doublons consécutifs
        if (this.commands.length > 0 && this.commands[this.commands.length - 1] === command) {
            this.resetPosition();
            return;
        }

        this.commands.push(command);
        
        // Limite la taille de l'historique
        if (this.commands.length > this.maxSize) {
            this.commands.shift();
        }
        
        this.resetPosition();
    }

    getPrevious(currentInput = '') {
        if (this.commands.length === 0) return currentInput;
        
        // Sauvegarde la commande en cours de frappe si on est à la fin
        if (this.currentIndex === -1) {
            this.tempCommand = currentInput;
        }
        
        if (this.currentIndex < this.commands.length - 1) {
            this.currentIndex++;
        }
        
        return this.commands[this.commands.length - 1 - this.currentIndex];
    }

    getNext(currentInput = '') {
        if (this.currentIndex === -1) return currentInput;
        
        this.currentIndex--;
        
        if (this.currentIndex === -1) {
            // Retourne à la commande en cours de frappe
            return this.tempCommand;
        }
        
        return this.commands[this.commands.length - 1 - this.currentIndex];
    }

    resetPosition() {
        this.currentIndex = -1;
        this.tempCommand = '';
    }

    clear() {
        this.commands = [];
        this.resetPosition();
    }

    getCommands() {
        return [...this.commands];
    }
}