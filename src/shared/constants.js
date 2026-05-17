export const TILE_SIZE = 24;
export const CHUNK_SIZE = 16;
export const TICKS_PER_SECOND_1X = 8;
export const MS_PER_TICK_1X = 1000 / TICKS_PER_SECOND_1X;
export const MAX_CATCHUP_TICKS = 5;
export const MAP_DEFAULT_W = 96;
export const MAP_DEFAULT_H = 96;
export const DAY_LENGTH_TICKS = TICKS_PER_SECOND_1X * 60 * 10; // 10 real-minutes at 1x
export var Faction;
(function (Faction) {
    Faction[Faction["Player"] = 0] = "Player";
    Faction[Faction["Wild"] = 1] = "Wild";
    Faction[Faction["Bandit"] = 2] = "Bandit";
    Faction[Faction["Neutral"] = 3] = "Neutral";
})(Faction || (Faction = {}));
export var Terrain;
(function (Terrain) {
    Terrain[Terrain["Grass"] = 0] = "Grass";
    Terrain[Terrain["Dirt"] = 1] = "Dirt";
    Terrain[Terrain["Sand"] = 2] = "Sand";
    Terrain[Terrain["Stone"] = 3] = "Stone";
    Terrain[Terrain["Mountain"] = 4] = "Mountain";
    Terrain[Terrain["WaterShallow"] = 5] = "WaterShallow";
    Terrain[Terrain["WaterDeep"] = 6] = "WaterDeep";
    Terrain[Terrain["Forest"] = 7] = "Forest";
})(Terrain || (Terrain = {}));
export const TERRAIN_COST = {
    [Terrain.Grass]: 10,
    [Terrain.Dirt]: 12,
    [Terrain.Sand]: 16,
    [Terrain.Stone]: 14,
    [Terrain.Mountain]: 0, // impassable
    [Terrain.WaterShallow]: 24,
    [Terrain.WaterDeep]: 0, // impassable for wardens
    [Terrain.Forest]: 18,
};
export const TERRAIN_COLOR = {
    [Terrain.Grass]: 0x6da26a,
    [Terrain.Dirt]: 0x8b6f47,
    [Terrain.Sand]: 0xd8c98c,
    [Terrain.Stone]: 0x808688,
    [Terrain.Mountain]: 0x4a4a52,
    [Terrain.WaterShallow]: 0x4c80a8,
    [Terrain.WaterDeep]: 0x2c5478,
    [Terrain.Forest]: 0x3f6e3a,
};
