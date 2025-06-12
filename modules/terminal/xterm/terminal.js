import { Keyboard } from "./keyboard.js";
import { parseCommandLine, parseRedirections } from '../../../lib/bash-parser.js';
import { cmdPwd, cmdCd, cmdExport } from "../../../lib/bash-builtins.js";
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
import { Autocompletion } from "./Autocompletion.js";
import {
    substituteVariablesInArgs,
    handleVariableAssignment,
    isVariableAssignment
} from '../../../lib/bash-variables.js';
import { executeWithRedirection, hasRedirection } from '../../../lib/bash-redirections.js';
import { cmdUseradd } from "../../../bin/useradd.js";

export class TerminalService {

    constructor(context = null) {

        this.term = this.#_getTerminal();
        this.term.write('$ ');
        this.term.write('\x1b[4h');

        this.context = null;
        this.setContext(context);


        this.term.open(document.getElementById('terminal'));
        this.keyboard = new Keyboard(this.term);
        this.history = new History();
        this.autocompletion = new Autocompletion(this.term, context);
        this.term.focus();


        this.username = "";
        this.hostname = "";
        this.currentPath = '';
        this.uid = 0;
        this.gid = 0;

        this.inputStr = '';

        this.keyboard.onKeyEnter(() => {
            this.history.add(this.inputStr);
            console.log('Send', this.inputStr);
            this.processCommand(this.inputStr);

            this.inputStr = '';
            this.keyboard.updatePosition(this.inputStr);
            this.showPrompt();
        })

        this.keyboard.onkeyPressed((data, position) => {
            this.charAddAt(data, position)
            this.term.write(data);
        });

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

        this.keyboard.onKeyTab(() => {
            this.handleTabCompletion();
        })
    }

    /**
     * Gestion de l'auto-complétion avec la nouvelle classe
     */
    async handleTabCompletion() {
        const optionsDisplayed = await this.autocompletion.handleTabCompletion(
            this.inputStr,
            (text) => this.insertText(text)
        );

        // TOUJOURS réafficher le prompt si des options ont été affichées
        if (optionsDisplayed) {
            this.showPrompt();
            this.term.write(this.inputStr);
        }
    }

    /**
     * Insère du texte à la fin de la ligne de commande
     * @param {string} text - Texte à insérer
     */
    insertText(text) {
        this.inputStr += text;
        this.term.write(text);
        this.keyboard.updatePosition(this.inputStr);
    }

    charRemoveAt(position) {
        const strPrePosition = this.inputStr.slice(0, position);
        const strPostPosition = this.inputStr.slice(position + 1)
        this.inputStr = strPrePosition + strPostPosition;
    }
    charAddAt(char, position) {
        const strPrePosition = this.inputStr.slice(0, position);
        const strPostPosition = this.inputStr.slice(position);
        this.inputStr = strPrePosition + char + strPostPosition;
    }

    replaceCurrentInput(newInput) {
        // Efface la ligne actuelle
        this.term.write('\r\x1b[K');
        this.showPrompt();
        this.term.write(newInput);
        this.inputStr = newInput;
        this.keyboard.updatePosition(this.inputStr);
    }

    // Fonction principale - remplace l'ancienne cmd()
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
            return; // Supprimé showPrompt()
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
    
        // this.term.write('\r\n');
        // Supprimé showPrompt() - laissé dans onKeyEnter()
    }

    // Fonction de parsing
    parseCommand(trimmedCommand) {
        this.context.terminal = this.term;
        const parts = parseCommandLine(trimmedCommand);
        if (parts.length === 0) {
            return null;
        }

        const { command: cmdParts, redirections } = parseRedirections(parts);
        if (cmdParts.length === 0) {
            return null;
        }

        const cmd = cmdParts[0];
        let args = cmdParts.slice(1);
        args = substituteVariablesInArgs(args, this.context);

        return { cmd, args, redirections };
    }

    // cmd() garde la logique d'exécution
    cmd(cmd, args) {
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
        else if (cmd === 'echo') {
            cmdEcho(args, this.context);
        }
        else if (cmd === 'cat') {
            cmdCat(args, this.context);
        }
        else if (cmd === 'mv') {
            cmdMv(args, this.context);
        }
        else if (cmd === 'rm') {
            cmdRm(args, this.context);
        }
        else if (cmd === 'passwd') {
            cmdPasswd(args, this.context);
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
        else if (cmd === 'useradd') {
            cmdUseradd(args, this.context);
        }
        else {
            this.term.write(`bash: ${cmd}: commande introuvable\r\n`);
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
        // S'assurer que le username est à jour
        if (this.userExist()) {
            const { currentUser } = this.context;
            this.username = currentUser?.username || 'root';
        }

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

    getShellSymbol() {
        return this.uid === 0 ? "#" : "$";
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