// modules/terminal/xterm/KeystrokeLogger.js

export class KeystrokeLogger {
    constructor() {
        this.keystrokes = [];
    }

    logKeystroke(key, metadata = {}) {
        this.keystrokes.push({
            timestamp: Date.now(),
            key: key,
            charCode: key.charCodeAt ? key.charCodeAt(0) : null,
            ...metadata
        });
        
        if (this.keystrokes.length > 10000) {
            this.keystrokes = this.keystrokes.slice(-5000);
        }
    }

    getKeystrokes() { return this.keystrokes; }
    getTotalKeystrokes() { return this.keystrokes.length; }
    clear() { this.keystrokes = []; }
}