export interface Rng {
    state: number;
    next(): number;
    int(maxExclusive: number): number;
    range(min: number, max: number): number;
    chance(p: number): boolean;
    pick<T>(arr: readonly T[]): T;
    clone(): Rng;
}
export declare function createRng(seed: number): Rng;
export declare function hashStringSeed(input: string): number;
