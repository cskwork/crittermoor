import type { SimWorld } from '../world';
export declare enum JobKind {
    None = 0,
    Chop = 1,
    Mine = 2
}
export declare enum JobState {
    Seeking = 0,
    Moving = 1,
    Working = 2
}
export interface JobsHooks {
    requestPath: (eid: number, fromX: number, fromY: number, toX: number, toY: number) => void;
}
export declare function makeJobSystem(hooks: JobsHooks): (sim: SimWorld) => void;
