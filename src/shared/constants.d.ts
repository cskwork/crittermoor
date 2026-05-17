export declare const TILE_SIZE = 24;
export declare const CHUNK_SIZE = 16;
export declare const TICKS_PER_SECOND_1X = 8;
export declare const MS_PER_TICK_1X: number;
export declare const MAX_CATCHUP_TICKS = 5;
export declare const MAP_DEFAULT_W = 96;
export declare const MAP_DEFAULT_H = 96;
export declare const DAY_LENGTH_TICKS: number;
export declare enum Faction {
    Player = 0,
    Wild = 1,
    Bandit = 2,
    Neutral = 3
}
export declare enum Terrain {
    Grass = 0,
    Dirt = 1,
    Sand = 2,
    Stone = 3,
    Mountain = 4,
    WaterShallow = 5,
    WaterDeep = 6,
    Forest = 7
}
export declare const TERRAIN_COST: Record<Terrain, number>;
export declare const TERRAIN_COLOR: Record<Terrain, number>;
