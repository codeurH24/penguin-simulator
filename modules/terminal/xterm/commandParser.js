import { parseCommandLine, parseRedirections, expandWildcards } from "../../../lib/bash-parser.js";
import { substituteVariablesInArgs } from "../../../lib/bash-variables.js";

export function parseCommand(trimmedCommand) {
    this.context.terminal = this.term;
    
    // Le parseCommandLine fait maintenant automatiquement l'expansion des braces
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
    args = expandWildcards(args, this.context.fileSystem, this.context.getCurrentPath());

    return { cmd, args, redirections };
}