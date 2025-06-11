export class Keyboard {
    constructor(term) {
        this.term = term;
        this.position = 0;
        this.positionMax = 0;

        this.term.onData(data => {
            const code = data.charCodeAt(0);
            if (code === 13) { // Enter
                this.keyEnter();
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

    setupEventHandlers() {
        this.term.onData(data => {
            // if (this.isPasswordMode) {
            //     this.handlePasswordInput(data);
            //     return;
            // }

            const code = data.charCodeAt(0);
            
            if (code === 13) { // Enter
                this.handleEnter();
            } else if (code === 127 || code === 8) { // Backspace
                this.handleBackspace();
            } else if (data === '\x1b[A') { // Up arrow
                this.handleHistoryUp();
            } else if (data === '\x1b[B') { // Down arrow
                this.handleHistoryDown();
            } else if (data === '\x1b[C') { // Right arrow
                this.handleCursorRight();
            } else if (data === '\x1b[D') { // Left arrow
                this.handleCursorLeft();
            } else if (code === 3) { // Ctrl+C
                this.handleCtrlC();
            } else if (code === 27) { // Escape
                this.handleEscape();
            } else if (code >= 32 && code <= 126) { // Regular chars
                this.handleCharInput(data);
            }
        });
    }

    // handlePasswordInput(data) {
    //     const code = data.charCodeAt(0);
        
    //     if (code === 13) { // Enter
    //         this.term.write('\r\n');
    //         const password = this.currentInput;
    //         this.exitPasswordMode();
    //         if (this.passwordCallback) {
    //             this.passwordCallback(password);
    //         }
    //     } else if (code === 127 || code === 8) { // Backspace
    //         if (this.currentInput.length > 0) {
    //             this.currentInput = this.currentInput.slice(0, -1);
    //             this.term.write('\b \b');
    //         }
    //     } else if (code === 27) { // Escape
    //         this.exitPasswordMode();
    //     } else if (code >= 32 && code <= 126) { // Caractères imprimables
    //         this.currentInput += data;
    //         this.term.write('*');
    //     }
    // }

    handleEnter() {
        this.term.write('\r\n');
        
        // if (this.currentInput.trim()) {
        //     this.history.push(this.currentInput);
        //     this.historyIndex = this.history.length;
            
        //     if (this.onCommandCallback) {
        //         this.onCommandCallback(this.currentInput);
        //     }
        // } else {
        //     this.showPrompt();
        // }
        
        this.currentInput = '';
        this.cursorPosition = 0;
    }

    handleBackspace() {
        if (this.cursorPosition > 0) {
            this.currentInput = this.currentInput.slice(0, this.cursorPosition - 1) + 
                              this.currentInput.slice(this.cursorPosition);
            this.cursorPosition--;
            this.redrawInputLine();
        }
    }

    handleCharInput(char) {
        this.currentInput = this.currentInput.slice(0, this.cursorPosition) + 
                           char + 
                           this.currentInput.slice(this.cursorPosition);
        this.cursorPosition++;
        this.redrawInputLine();
    }

    handleHistoryUp() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.currentInput = this.history[this.historyIndex];
            this.cursorPosition = this.currentInput.length;
            this.redrawInputLine();
        }
    }

    handleHistoryDown() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.currentInput = this.history[this.historyIndex];
            this.cursorPosition = this.currentInput.length;
            this.redrawInputLine();
        } else if (this.historyIndex === this.history.length - 1) {
            this.historyIndex = this.history.length;
            this.currentInput = '';
            this.cursorPosition = 0;
            this.redrawInputLine();
        }
    }

    handleCursorLeft() {
        if (this.cursorPosition > 0) {
            this.cursorPosition--;
            this.term.write('\x1b[D');
        }
    }

    handleCursorRight() {
        if (this.cursorPosition < this.currentInput.length) {
            this.cursorPosition++;
            this.term.write('\x1b[C');
        }
    }

    handleCtrlC() {
        this.term.write('^C\r\n');
        this.currentInput = '';
        this.cursorPosition = 0;
        this.showPrompt();
    }

    handleEscape() {
        if (this.isPasswordMode) {
            this.exitPasswordMode();
        }
    }
}