import { isBattleOver, type BattleAction, type BattleState } from './BattleState';
export type SidePair<T> = [T, T];
export declare function executeTurn(state: BattleState, actions: SidePair<BattleAction>): BattleState;
export { isBattleOver };
