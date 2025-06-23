import { Keyboard } from "./keyboard.js";
import { History } from "./History.js";
import { KeystrokeLogger } from "./KeystrokeLogger.js";
import { CommandLogger } from "./CommandLogger.js";
import { FileSystemLogger } from "./FileSystemLogger.js";
import {
    handleVariableAssignment,
    isVariableAssignment
} from '../../../lib/bash-variables.js';
import { executeWithRedirection, hasRedirection } from '../../../lib/bash-redirections.js';

import { cmd } from "./commands.js";
import { Input } from "./Input.js";
import { Prompt } from "./Prompt.js";
import { captureOutput, getCapture } from "./output.js";
import { parseCommand } from "./commandParser.js";
import { hasPipes, parsePipeline, executePipeline } from '../../../lib/bash-pipes.js';

export class TerminalService {

    constructor(context = null, terminalId=null) {
        this.term = this.#_getTerminal();
        this.term.write('$ ');
        this.term.write('\x1b[4h');
        this.term.terminalService = this;

        this.context = null;
        this.prompt = new Prompt(this);
        this.keystrokeLogger = new KeystrokeLogger();
        this.commandLogger = new CommandLogger();
        this.fileSystemLogger = new FileSystemLogger();
        this.logs = this.keystrokeLogger; 
        this.setContext(context);

        const teminalElement = (terminalId === null) ? 
            document.getElementById('terminal')
            :
            document.getElementById(terminalId);

        this.term.open(teminalElement);
        this.keyboard = new Keyboard(this.term);
        this.history = new History();
        this.term.focus();
        this._setupKeystrokeLogging();

        this.username = "";
        this.hostname = "";
        this.currentPath = '';
        this.uid = 0;
        this.gid = 0;

        new Input(this);
        this.cmd = cmd.bind(this);
        this.captureOutput = captureOutput.bind(this);
        this.getCapture = getCapture.bind(this);
        this.parseCommand = parseCommand.bind(this);
    }

    _setupKeystrokeLogging() {
        this.term.onData((data) => {
            this.keystrokeLogger.logKeystroke(data, {
                user: this.context?.currentUser?.username || 'unknown'
            });
        });
    }

    showPrompt() {
        this.prompt.showPrompt();
    }

    getContext() {
        this.context.terminal = this.term;
        return this.context;
    }

    sendCommand(command = null) {

        if (command !== null) this.inputStr = command;

        this.history.add(this.inputStr);
        this.commandLogger.logCommand(this.inputStr, {
            user: this.username || this.context?.currentUser?.username || 'unknown',
            workingDirectory: this.context?.getCurrentPath ? this.context.getCurrentPath() : '/'
        });

        this.fileSystemLogger.updateMetadata({
            user: this.username || this.context?.currentUser?.username || 'unknown',
            workingDirectory: this.context.getCurrentPath() ? this.context?.getCurrentPath : '/',
            command: this.inputStr
        });

        console.log('Send', this.inputStr);

        this.captureOutput();
        this.processCommand(this.inputStr);
        const out = this.getCapture();

        if (out && out.trim()) {
            this.term.write(out);
        }

        this.inputStr = '';
        this.keyboard.updatePosition(this.inputStr);

        // NE PAS afficher le prompt si on est en mode password
        if (!this.term.passwordMode) {
            this.showPrompt();
        }

        return out;
    }

    // Modification à apporter dans modules/terminal/xterm/terminal.js
    // Remplacer la méthode processCommand existante

    processCommand(str) {
        const trimmedCommand = str.trim();
        if (!trimmedCommand) {
            return;
        }

        if (isVariableAssignment(str.trim())) {
            handleVariableAssignment(str.trim(), this.context);
            return;
        }

        // Vérifier s'il y a des pipes dans la commande
        if (this.hasPipes(trimmedCommand)) {
            this.executePipeline(trimmedCommand);
            return;
        }

        // Logique existante pour les commandes simples
        const parsedCommand = this.parseCommand(trimmedCommand);
        if (!parsedCommand) {
            this.term.write('\r\n');
            return;
        }

        const { cmd, args, redirections } = parsedCommand;

        if (hasRedirection(redirections)) {
            const commandExecutor = () => {
                this.cmd(cmd, args);
            };
            executeWithRedirection(commandExecutor, redirections, this.context);
        } else {
            this.cmd(cmd, args);
        }
    }

    // Nouvelle méthode pour vérifier les pipes
    hasPipes(command) {
        let inQuotes = false;
        let quoteChar = '';

        for (let i = 0; i < command.length; i++) {
            const char = command[i];

            if (!inQuotes) {
                if (char === '"' || char === "'") {
                    inQuotes = true;
                    quoteChar = char;
                } else if (char === '|') {
                    return true;
                }
            } else {
                if (char === quoteChar) {
                    inQuotes = false;
                    quoteChar = '';
                }
            }
        }

        return false;
    }

    // Nouvelle méthode pour parser les pipelines
    parsePipeline(command) {
        const pipeline = [];
        let current = '';
        let inQuotes = false;
        let quoteChar = '';

        for (let i = 0; i < command.length; i++) {
            const char = command[i];

            if (!inQuotes) {
                if (char === '"' || char === "'") {
                    inQuotes = true;
                    quoteChar = char;
                    current += char;
                } else if (char === '|') {
                    if (current.trim()) {
                        pipeline.push(current.trim());
                    }
                    current = '';
                } else {
                    current += char;
                }
            } else {
                current += char;
                if (char === quoteChar) {
                    inQuotes = false;
                    quoteChar = '';
                }
            }
        }

        if (current.trim()) {
            pipeline.push(current.trim());
        }

        return pipeline;
    }

    // Nouvelle méthode pour exécuter un pipeline
    executePipeline(commandString) {
        const pipeline = this.parsePipeline(commandString);

        if (pipeline.length === 0) {
            return;
        }

        if (pipeline.length === 1) {
            // Une seule commande, utiliser la logique existante
            this.processCommand(pipeline[0]);
            return;
        }

        // Plusieurs commandes avec pipes
        let currentOutput = '';

        for (let i = 0; i < pipeline.length; i++) {
            const isFirst = i === 0;
            const isLast = i === pipeline.length - 1;
            const commandString = pipeline[i];

            // Parser la commande
            const parsedCommand = this.parseCommand(commandString);
            if (!parsedCommand) {
                continue;
            }

            const { cmd, args } = parsedCommand;

            // Pour les commandes intermédiaires, capturer leur sortie
            if (!isLast) {
                // Capturer la sortie de cette commande
                let commandOutput = '';
                const originalAddLine = this.context.addLine;

                // Remplacer temporairement addLine pour capturer
                this.context.addLine = (text) => {
                    commandOutput += text;
                    if (!text.endsWith('\n')) {
                        commandOutput += '\n';
                    }
                };

                // Si ce n'est pas la première commande, passer l'entrée
                if (!isFirst) {
                    this.context.stdin = currentOutput;
                }

                try {
                    this.cmd(cmd, args);
                } finally {
                    // Restaurer addLine
                    this.context.addLine = originalAddLine;
                    delete this.context.stdin; // Nettoyer stdin
                }

                // Sauvegarder la sortie pour la commande suivante
                currentOutput = commandOutput;
            } else {
                // Dernière commande : utiliser la sortie normale du terminal
                if (!isFirst) {
                    this.context.stdin = currentOutput;
                }

                try {
                    this.cmd(cmd, args);
                } finally {
                    delete this.context.stdin; // Nettoyer stdin
                }
            }
        }
    }
    

    setContext(context) {
        console.log('TerminalService context', context);
        
        if (context && context.fileSystem) {
            // Sauvegarder l'état initial pour comparaison
            this.fileSystemLogger.originalFileSystem = this.fileSystemLogger.deepClone(context.fileSystem);
            this.fileSystemLogger.isActive = true;
        }
        
        this.context = context;
        this.setUser(context);
    
        if (this.userExist()) {
            this.clear();
            this.showPrompt();
        }
    }

    setCurrentPath(path) {

        this.context.setCurrentPath(path);
    }

    userExist() {
        if (!this.context) return false;
        return (this.context.currentUser) ? true : false;
    }

    setUser(context) {
        if (!this.userExist()) return;
        const { currentUser } = context;
        this.username = currentUser?.username;
        this.uid = currentUser?.uid;
        this.gid = currentUser?.gid;
    }

    setPath(newPath) {
        this.path = newPath;
    }

    setHostname(hostname) {
        this.hostname = hostname;
    }

    clear() {
        this.term.write('\x1b[2J');
        this.term.write('\x1b[H');
    }

    getKeystrokes() { return this.keystrokeLogger.getKeystrokes(); }
    getTotalKeystrokes() { return this.keystrokeLogger.getTotalKeystrokes(); }
    clearKeystrokes() { return this.keystrokeLogger.clear(); }

    getCommandHistory() { return this.commandLogger.getCommandHistory(); }
    getTotalCommands() { return this.commandLogger.getTotalCommands(); }
    getRecentCommands(timeWindow) { return this.commandLogger.getRecentCommands(timeWindow); }
    clearCommandHistory() { return this.commandLogger.clear(); }

    getFileOperations() { return this.fileSystemLogger.getFileOperations(); }
    getTotalFileOperations() { return this.fileSystemLogger.getTotalOperations(); }
    getRecentFileOperations(timeWindow) { return this.fileSystemLogger.getRecentOperations(timeWindow); }
    getFileSystemStats(timeWindow) { return this.fileSystemLogger.getStats(timeWindow); }
    clearFileOperations() { return this.fileSystemLogger.clear(); }

    #_getTerminal() {
        return new Terminal({
            fontSize: 22,
            fontFamily: 'Lucida Console, Monaco, Courier New,monospace',
            theme: {
                background: '#1e1e1e',
                foreground: '#ffffff',
                cursor: '#00ff00',
                cursorAccent: '#000000',
                selection: '#444444'
            },
            cursorBlink: true,
            cols: 80,
            rows: 24,
        });
    }
}