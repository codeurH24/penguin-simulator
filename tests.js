import { createContext } from './core/context.js';
import { executeCommand as execCommand } from './bin/bash.js';

const context = createContext();
execCommand(command, context);
    
