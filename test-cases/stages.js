// test-cases/stages.js - Point d'entrée pour tous les stages de tests
import { stages as commandMkdirStages } from './stages/commands/mkdir.stages.js';
import { stages as commandLsStages } from './stages/commands/ls.stages.js';
import { stages as commandTouchStages } from './stages/commands/touch.stages.js';
import { stages as commandRmStages } from './stages/commands/rm.stages.js';
import { stages as commandMvStages } from './stages/commands/mv.stages.js';
import { stages as commandCdStages } from './stages/commands/cd.stages.js';
import { stages as commandPwdStages } from './stages/commands/pwd.stages.js';
import { stages as commandEchoStages } from './stages/commands/echo.stages.js';
import { stages as commandCatStages } from './stages/commands/cat.stages.js';
import { stages as commandUseraddStages } from './stages/commands/useradd.stages.js';
import { stages as commandPasswdStages } from './stages/commands/passwd.stages.js';
import { stages as commandSuStages } from './stages/commands/su.stages.js';
import { stages as commandExitStages } from './stages/commands/exit.stages.js';
import { stages as commandChmodStages } from './stages/commands/chmod.stages.js';
import { stages as commandExportStages } from './stages/commands/export.stages.js';

export async function stages(suites) {
    commandMkdirStages(suites);
    commandLsStages(suites);
    commandTouchStages(suites);
    commandRmStages(suites);
    commandMvStages(suites);
    commandCdStages(suites);
    commandPwdStages(suites);
    commandEchoStages(suites);
    commandCatStages(suites);
    commandExportStages(suites);
    commandUseraddStages(suites);
    await commandPasswdStages(suites);
    commandSuStages(suites);
    commandExitStages(suites);
    commandChmodStages(suites);
}