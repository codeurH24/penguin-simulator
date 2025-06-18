import { cmdPwd, cmdCd, cmdExport, cmdExit } from "../../../lib/bash-builtins.js";
import { cmdLs } from "../../../bin/ls.js";
import { cmdMkdir } from "../../../bin/mkdir.js";
import { cmdTouch } from "../../../bin/touch.js";
import { cmdEcho } from "../../../bin/echo.js";
import { cmdCat } from "../../../bin/cat.js";
import { cmdMv } from "../../../bin/mv.js";
import { cmdPasswd } from "../../../bin/passwd.js";
import { cmdRm } from "../../../bin/rm.js";
import { cmdSu } from "../../../bin/su.js";
import { cmdUseradd } from "../../../bin/useradd.js";
import { cmdGroups } from "../../../bin/groups.js";
import { cmdId } from "../../../bin/id.js";
import { cmdChmod } from "../../../bin/chmod.js";
import { cmdChown } from "../../../bin/chown.js";
import { cmdUserdel } from "../../../bin/userdel.js";
import { cmdSudo } from "../../../bin/sudo/sudo.js";
import { cmdWhoami } from "../../../bin/whoami.js";

export function cmd(cmd, args) {
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
    else if (cmd === 'userdel') {
        cmdUserdel(args, this.context);
    }
    else if (cmd === 'exit') {
        cmdExit(args, this.context);
    }
    else if (cmd === 'chmod') {
        cmdChmod(args, this.context);
    }
    else if (cmd === 'chown') {
        cmdChown(args, this.context);
    }
    else if (cmd === 'export') {
        cmdExport(args, this.context);
    }
    else if (cmd === 'sudo') {
        cmdSudo(args, this.context);
    }
    else {
        this.term.write(`bash: ${cmd}: commande introuvable\r\n`);
    }
}
