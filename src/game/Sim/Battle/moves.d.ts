import { CritterType } from '../Critters/types';
export type MoveCategory = 'physical' | 'special' | 'status';
export type StatusKind = 'burn' | 'soak' | 'quill' | 'daze' | 'snare' | 'bloom';
export interface MoveDef {
    id: string;
    name: string;
    type: CritterType;
    power: number;
    accuracy: number;
    category: MoveCategory;
    statusChance?: number;
    status?: StatusKind;
    description: string;
}
export declare const MOVES: readonly MoveDef[];
export declare function getMove(id: string): MoveDef | undefined;
