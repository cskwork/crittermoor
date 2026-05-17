import type { Rng } from '@/shared/rng';
import type { BattleCritter } from './BattleState';
import type { MoveDef } from './moves';
export interface DamageResult {
    dmg: number;
    effectiveness: number;
    crit: boolean;
    hit: boolean;
}
export declare function computeDamage(attacker: BattleCritter, defender: BattleCritter, move: MoveDef, rng: Rng, level?: number): DamageResult;
