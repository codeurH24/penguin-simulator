import { stages as commandMkdirStages } from './stages/commands/mkdir.stages.js';

export function stages(suites) {
    commandMkdirStages(suites);
}
