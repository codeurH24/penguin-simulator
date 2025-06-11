import { Keyboard } from "./keyboard.js";
import { parseCommandLine, parseRedirections } from '../../../lib/bash-parser.js';
import { cmdPwd, cmdCd } from "../../../lib/bash-builtins.js";
import { cmdLs } from "../../../bin/ls.js";
import { cmdMkdir } from "../../../bin/mkdir.js";
import { cmdTouch } from "../../../bin/touch.js";
import { cmdEcho } from "../../../bin/echo.js";
import { cmdCat } from "../../../bin/cat.js";
import { cmdMv } from "../../../bin/mv.js";
import { cmdPasswd } from "../../../bin/passwd.js";
import { cmdRm } from "../../../bin/rm.js";
import { cmdSu } from "../../../bin/su.js";
import { cmdGroups, cmdId, cmdWhoami } from "../../../bin/user-info.js";
import { History } from "./History.js";

export class TerminalService {

    constructor(context=null) {
        this.term = this.#_getTerminal();
        this.term.open(document.getElementById('terminal'));
        this.keyboard = new Keyboard(this.term);
        this.history = new History();
        this.term.focus();

        this.term.write('$ ');
        this.term.write('\x1b[4h');
        
        this.context = context;
        this.username = "";
        this.hostname = "";
        this.currentPath = '';
        this.uid = 0;
        this.gid = 0;

        this.inputStr = '';

        this.keyboard.onKeyEnter(() => {
            this.history.add(this.inputStr);
            this.cmd(this.inputStr);

            this.inputStr = '';
            this.keyboard.updatePosition(this.inputStr);
            this.showPrompt();
        })

        this.keyboard.onkeyPressed((data) => {
            this.inputStr += data;
            this.term.write(data);
        })

        this.keyboard.onKeyUp((data) => {
            const previous = this.history.getPrevious(this.inputStr);
            this.replaceCurrentInput(previous);
        })
        
        this.keyboard.onKeyDown((data) => {
            const next = this.history.getNext(this.inputStr);
            this.replaceCurrentInput(next);
        })
        this.keyboard.onKeyBackspace((position) => {
            this.charRemoveAt(position);
        })
    }

    charRemoveAt(position) {
        const strPrePosition = this.inputStr.slice(0, position);
        const strPostPosition = this.inputStr.slice(position + 1)
        this.inputStr = strPrePosition + strPostPosition;
        console.log('this.inputStr', this.inputStr);
    }

    replaceCurrentInput(newInput) {
        // Efface la ligne actuelle
        this.term.write('\r\x1b[K');
        this.showPrompt();
        this.term.write(newInput);
        this.inputStr = newInput;
        this.keyboard.updatePosition(this.inputStr);
    }

    cmd(str) {
        this.context.terminal = this.term;
        const parts = parseCommandLine(str);
        const { command: cmdParts } = parseRedirections(parts);

        const cmd = cmdParts[0];   // "cd"
        const args = cmdParts.slice(1); // ["/home/my folder"]
        
        if (cmd === 'cd') {
            cmdCd(args, this.context);
        }
        else if (cmd === 'pwd') {
            cmdPwd(args, this.context);
        }
        else if (cmd === 'ls') {
            cmdLs(args, this.context);
        }
        else if (cmd === 'mkdir') {
            cmdMkdir(args, this.context);
        }
        else if (cmd === 'touch') {
            cmdTouch(args, this.context);
        }
        else if (cmd === 'cat') {
            cmdCat(args, this.context);
        }
        else if (cmd === 'echo') {
            cmdEcho(args, this.context);
        }
        else if (cmd === 'mv') {
            cmdMv(args, this.context);
        }
        else if (cmd === 'passwd') {
            cmdPasswd(args, this.context);
        }
        else if (cmd === 'passwd') {
            cmdPasswd(args, this.context);
        }
        else if (cmd === 'rm') {
            cmdRm(args, this.context);
        }
        else if (cmd === 'su') {
            cmdSu(args, this.context);
        }
        else if (cmd === 'whoami') {
            cmdWhoami(args, this.context);
        }
        else if (cmd === 'id') {
            cmdId(args, this.context);
        }
        else if (cmd === 'groups') {
            cmdGroups(args, this.context);
        }
        else if (cmd === 'clear') {
            this.clear();
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

    showPrompt() {
        this.term.write(`${this.username}@bash:${this.context.getCurrentPath()}${this.getShellSymbol()} `);
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
        const {currentUser} = context;
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

    getShellSymbol() {
        return this.uid === 0 ? "#" : "$";
    }

    #_getTerminal() {
        return new Terminal({
            fontSize: 24,
            fontFamily: 'Courier New, monospace',
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