import type { SimWorld } from '../world';
export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';
export declare function phaseOf(sim: SimWorld): DayPhase;
export declare function dayOf(sim: SimWorld): number;
export declare function system_time(_sim: SimWorld): void;
