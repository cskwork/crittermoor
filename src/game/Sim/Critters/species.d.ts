import { CritterType } from './types';
export interface SpeciesStats {
    hp: number;
    atk: number;
    def: number;
    satk: number;
    sdef: number;
    spd: number;
}
export interface SpeciesDef {
    id: number;
    key: string;
    name: string;
    types: readonly CritterType[];
    baseStats: SpeciesStats;
    movePool: readonly string[];
    workTags: readonly string[];
    spriteKey: string;
    flavor: string;
}
export declare const SPECIES: readonly SpeciesDef[];
export declare function speciesById(id: number): SpeciesDef | undefined;
export declare function speciesByKey(key: string): SpeciesDef | undefined;
