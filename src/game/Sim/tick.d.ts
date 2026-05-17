import type { SimWorld } from './world';
import { type JobsHooks } from './systems/jobs';
export interface SimHooks {
    jobs: JobsHooks;
}
export declare function makeRunTick(hooks: SimHooks): (sim: SimWorld) => void;
export declare function runTick(sim: SimWorld): void;
