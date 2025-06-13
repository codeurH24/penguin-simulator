import { Keyboard } from "./keyboard.js";
import { History } from "./History.js";
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

export class TerminalService {

    constructor(context = null) {
        this.term = this.#_getTerminal();
        this.term.write('$ ');
        this.term.write('\x1b[4h');
        this.term.terminalService = this;
        
        this.context = null;
        this.prompt = new Prompt(this); 
        this.setContext(context);
    
        this.term.open(document.getElementById('terminal'));
        this.keyboard = new Keyboard(this.term);
        this.history = new History();
        this.term.focus();
    
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

    showPrompt() {
        this.prompt.showPrompt();
    }

    getContext() {
        this.context.terminal = this.term;
        return this.context;
    }

    sendCommand(command=null) {

        if (command !== null) this.inputStr = command;

        this.history.add(this.inputStr);
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
    
    processCommand(str) {
        const trimmedCommand = str.trim();
        if (!trimmedCommand) {
            return;
        }

        if (isVariableAssignment(str.trim())) {
            handleVariableAssignment(str.trim(), this.context);
            return;
        }

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

    setContext(context) {
        console.log('TerminalSercice context', context);
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