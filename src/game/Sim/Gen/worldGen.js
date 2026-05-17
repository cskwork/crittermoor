import { spawnWarden } from '../world';
import { Terrain, TERRAIN_COST } from '@/shared/constants';
// Tiny placeholder world gen: scatter forest, stone, and water based on rng;
// G010 replaces this with proper biome generation.
export function generateWorld(sim) {
    const { width, height, terrain, cost } = sim.map;
    const rng = sim.rng;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            const r = rng.next();
            let t = Terrain.Grass;
            if (r < 0.06)
                t = Terrain.Forest;
            else if (r < 0.09)
                t = Terrain.Stone;
            else if (r < 0.10)
                t = Terrain.Mountain;
            else if (r < 0.115)
                t = Terrain.WaterShallow;
            terrain[i] = t;
            cost[i] = TERRAIN_COST[t] || 9999;
        }
    }
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    // ensure the spawn radius is grass
    for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
            const i = (cy + dy) * width + (cx + dx);
            terrain[i] = Terrain.Grass;
            cost[i] = TERRAIN_COST[Terrain.Grass];
        }
    }
    spawnWarden(sim, cx - 1, cy, 0xe8ece8);
    spawnWarden(sim, cx, cy, 0xa8d08d);
    spawnWarden(sim, cx + 1, cy, 0xe07a5f);
}
