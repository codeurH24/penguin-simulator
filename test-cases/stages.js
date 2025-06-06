// test-cases/stages.js - Point d'entrée pour tous les stages de tests
import { stages as bashVariablesStages } from './stages/bash/variables.stages.js';
import { stages as commandMkdirStages } from './stages/commands/mkdir.stages.js';
import { stages as commandLsStages } from './stages/commands/ls.stages.js';
import { stages as commandTouchStages } from './stages/commands/touch.stages.js';
import { stages as commandRmStages } from './stages/commands/rm.stages.js';
import { stages as commandMvStages } from './stages/commands/mv.stages.js';
import { stages as commandCdStages } from './stages/commands/cd.stages.js';
import { stages as commandPwdStages } from './stages/commands/pwd.stages.js';
import { stages as commandEchoStages } from './stages/commands/echo.stages.js';

export function stages(suites) {
    bashVariablesStages(suites);
    commandMkdirStages(suites);
    commandLsStages(suites);
    commandTouchStages(suites);
    commandRmStages(suites);
    commandMvStages(suites);
    commandCdStages(suites);
    commandPwdStages(suites);
    commandEchoStages(suites);
}