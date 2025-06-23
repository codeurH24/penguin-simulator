export class CommandLogger {
    constructor() {
        this.commandHistory = [];
    }

    logCommand(command, metadata = {}) {
        this.commandHistory.push({
            timestamp: Date.now(),
            command: command,
            user: metadata.user || 'unknown',
            workingDirectory: metadata.workingDirectory || '/',
            ...metadata
        });
        
        if (this.commandHistory.length > 1000) {
            this.commandHistory = this.commandHistory.slice(-500);
        }
    }

    getCommandHistory() { return this.commandHistory; }
    getTotalCommands() { return this.commandHistory.length; }
    getRecentCommands(timeWindow) {
        const cutoff = Date.now() - timeWindow;
        return this.commandHistory.filter(entry => entry.timestamp >= cutoff);
    }
    clear() { this.commandHistory = []; }
}