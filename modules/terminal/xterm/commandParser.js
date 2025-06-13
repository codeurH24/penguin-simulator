import { parseCommandLine, parseRedirections } from "../../../lib/bash-parser.js";
import { substituteVariablesInArgs } from "../../../lib/bash-variables.js";

export function parseCommand(trimmedCommand) {

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