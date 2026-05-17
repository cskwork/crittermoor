import type { Rng } from '@/shared/rng';
import type { CritterType } from '../Critters/types';
import type { StatusKind } from './moves';
export interface BattleCritter {
    speciesId: number;
    level: number;
    types: [CritterType, CritterType | null];
    hp: number;
    maxHp: number;
    atk: number;
    def: number;
    satk: number;
    sdef: number;
    spd: number;
    moves: readonly string[];
    status: StatusKind | null;
    statusTurns: number;
}
export type Side = 0 | 1;
export interface BattleSide {
    team: BattleCritter[];
    activeSlot: number;
    switchesUsed: number;
}
export interface BattleState {
    sides: [BattleSide, BattleSide];
    rngState: number;
    turn: number;
    log: string[];
}
export type BattleAction = {
    kind: 'move';
    moveId: string;
} | {
    kind: 'switch';
    toSlot: number;
};
export declare function createBattleState(team0: BattleCritter[], team1: BattleCritter[], rng: Rng): BattleState;
export declare function activeOf(state: BattleState, side: Side): BattleCritter;
export declare function isBattleOver(state: BattleState): {
    over: boolean;
    winner: Side | null;
};
