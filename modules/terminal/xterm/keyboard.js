export class Keyboard {
    constructor(term) {
        this.term = term;
        this.position = 0;
        this.positionMax = 0;

        this.term.onData(data => {
            // NOUVEAU : Gestion des prompts personnalisés EN PREMIER
            if (this.term.customPromptMode) {
                this.handleCustomPromptInput(data);
                return;
            }

            // ORIGINAL : Gestion du mode password (conservé pour compatibilité)
            if (this.term.passwordMode) {
                this.handlePasswordInput(data);
                return;
            }

            // ORIGINAL : Gestion normale du terminal (LOGIQUE EXISTANTE EXACTEMENT PRÉSERVÉE)
            const code = data.charCodeAt(0);
            if (code === 13) { // Enter
                this.keyEnter();
            }
            else if (code === 3) { // Ctrl+C
                this.keyCtrlC();
            }
            else if (code >= 32 && code <= 126) { // Regular chars
                this.keyPressed(data);
                this.position++;
                this.positionMax++;
            }
            else if (code === 127 || code === 8) { // Backspace
                if (this.position <= 0) return;
                this.term.write('\x1b[D\x1b[P');
                this.position--;
                this.positionMax--;
                this.keyBackspace(data);
            }
            else if (data === '\x1b[C') { // Right arrow
                if (this.position >= this.positionMax) return;
                this.term.write(data);
                this.position++;
            }
            else if (data === '\x1b[D') { // Left arrow
                if (this.position <= 0) return; 
                this.term.write(data);
                this.position--;
            }
            else if (data === '\x1b[A') { // Up arrow
                this.keyUp();
            }
            else if (data === '\x1b[B') { // Down arrow
                this.keyDown();
            }
            else if (code === 9) { // Tab
                this.keyTab();
            }
        });
    }

    /**
     * NOUVEAU : Gestion de la saisie pour les prompts personnalisés
     */
    handleCustomPromptInput(data) {
        const code = data.charCodeAt(0);
        const config = this.term.customPromptConfig || {};
        
        if (code === 13) { // Enter
            this.term.write('\r\n');
            const input = this.term.customPromptInput;
            
            // Traiter la réponse via le service terminal
            if (this.term.terminalService && this.term.terminalService.prompt) {
                this.term.terminalService.prompt.handleCustomPromptResponse(input);
            }
        } else if (code === 127 || code === 8) { // Backspace
            if (this.term.customPromptInput && this.term.customPromptInput.length > 0) {
                this.term.customPromptInput = this.term.customPromptInput.slice(0, -1);
                
                // En mode caché, ne rien afficher (comportement Linux authentique)
                if (!config.hidden) {
                    this.term.write('\b \b');
                }
            }
        } else if (code === 3) { // Ctrl+C
            // Annuler le prompt personnalisé
            if (this.term.terminalService && this.term.terminalService.prompt) {
                this.term.terminalService.prompt.cancelCustomPrompt();
            }
        } else if (code >= 32 && code <= 126) { // Caractères imprimables
            if (!this.term.customPromptInput) {
                this.term.customPromptInput = '';
            }
            this.term.customPromptInput += data;
            
            // Afficher le caractère selon le mode
            if (config.hidden) {
                // Mode password : ne rien afficher (comportement Linux authentique)
                // Pas d'écriture dans le terminal
            } else {
                this.term.write(data);
            }
        }
    }

    /**
     * ORIGINAL : Gestion de la saisie de mot de passe (conservée pour compatibilité)
     */
    handlePasswordInput(data) {
        const code = data.charCodeAt(0);
        
        if (code === 13) { // Enter
            this.term.write('\r\n');
            const password = this.term.currentPasswordInput;
            // Appeler le callback password si défini
            if (this.term.passwordCallback) {
                this.term.passwordCallback(password);
            }
        } else if (code === 127 || code === 8) { // Backspace
            if (this.term.currentPasswordInput && this.term.currentPasswordInput.length > 0) {
                this.term.currentPasswordInput = this.term.currentPasswordInput.slice(0, -1);
                // Mode password Linux authentique : ne rien afficher même pour backspace
            }
        } else if (code === 3) { // Ctrl+C
            this.term.write('^C\r\n');
            this.term.passwordMode = false;
            this.term.currentPasswordInput = '';
            if (this.term.passwordCancelCallback) {
                this.term.passwordCancelCallback();
            }
        } else if (code >= 32 && code <= 126) { // Caractères imprimables
            if (!this.term.currentPasswordInput) {
                this.term.currentPasswordInput = '';
            }
            this.term.currentPasswordInput += data;
            // Mode password Linux authentique : ne rien afficher
        }
    }
    
    updatePosition(str) {
        this.position = str.length;
        this.positionMax = str.length
    }

    keyEnter() {
        this.term.write('\r\n');
        this.eventEnter();
    }

    eventEnter() {
        console.log('eventEnter');
    }

    onKeyEnter(fn) {
        this.eventEnter = fn;
    }
    
    keyCtrlC() {
        this.term.write('^C\r\n');
        this.eventCtrlC();
    }

    eventCtrlC() {
        console.log('eventCtrlC');
    }

    onKeyCtrlC(fn) {
        this.eventCtrlC = fn;
    }

    keyPressed(data) {
        this.eventKeyPressed(data, this.position);
    }

    eventKeyPressed() {
        console.log('eventKeyPressed');
    }

    onkeyPressed(fn) {
        this.eventKeyPressed = fn;
    }

    keyUp() {
        this.eventKeyUp();
    }

    eventKeyUp() {
        console.log('eventKeyUp');
    }

    onKeyUp(fn) {
        this.eventKeyUp = fn;
    }

    keyDown() {
        this.eventKeyDown();
    }

    eventKeyDown() {
        console.log('eventKeyDown');
    }

    onKeyDown(fn) {
        this.eventKeyDown = fn;
    }

    keyBackspace() {
        this.eventkeyBackspace(this.position, this.positionMax);
    }

    eventkeyBackspace() {
        console.log('eventkeyBackspace');
    }

    onKeyBackspace(fn) {
        this.eventkeyBackspace = fn;
    }

    keyTab() {
        this.eventKeyTab();
    }
    
    eventKeyTab() {
        console.log('eventKeyTab');
    }
    
    onKeyTab(fn) {
        this.eventKeyTab = fn;
    }
}