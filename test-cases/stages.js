import { stages as commandMkdirStages } from './stages/commands/mkdir.stages.js';
import { stages as commandLsStages } from './stages/commands/ls.stages.js';
import { stages as commandTouchStages } from './stages/commands/touch.stages.js';

export function stages(suites) {
    commandMkdirStages(suites);
    commandLsStages(suites);
    commandTouchStages(suites);
}