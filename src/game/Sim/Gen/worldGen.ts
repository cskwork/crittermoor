import type { SimWorld } from '../world'
import { spawnWarden } from '../world'
import { Terrain, TERRAIN_COST } from '@/shared/constants'
import { spawnPack } from '../Critters/spawn'

// Tiny placeholder world gen: scatter forest, stone, and water based on rng;
// G010 replaces this with proper biome generation.
export function generateWorld(sim: SimWorld): void {
  const { width, height, terrain, cost } = sim.map
  const rng = sim.rng
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const r = rng.next()
      let t: Terrain = Terrain.Grass
      if (r < 0.06) t = Terrain.Forest
      else if (r < 0.09) t = Terrain.Stone
      else if (r < 0.10) t = Terrain.Mountain
      else if (r < 0.115) t = Terrain.WaterShallow
      terrain[i] = t
      cost[i] = TERRAIN_COST[t] || 9999
    }
  }
  const cx = Math.floor(width / 2)
  const cy = Math.floor(height / 2)
  // ensure the spawn radius is grass
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const i = (cy + dy) * width + (cx + dx)
      terrain[i] = Terrain.Grass
      cost[i] = TERRAIN_COST[Terrain.Grass]
    }
  }
  spawnWarden(sim, cx - 1, cy, 0xe8ece8)
  spawnWarden(sim, cx, cy, 0xa8d08d)
  spawnWarden(sim, cx + 1, cy, 0xe07a5f)
  scatterWildPacks(sim, cx, cy)
}

function scatterWildPacks(sim: SimWorld, awayX: number, awayY: number): void {
  // 5 small packs of wild critters, kept clear of the spawn radius.
  const speciesPool = ['spritmoth', 'tindercub', 'loamfin', 'brackboar', 'mosskit', 'ferroquill']
  for (let p = 0; p < 5; p++) {
    let tx = 0
    let ty = 0
    for (let tries = 0; tries < 20; tries++) {
      tx = sim.rng.int(sim.map.width)
      ty = sim.rng.int(sim.map.height)
      const dx = tx - awayX
      const dy = ty - awayY
      if (dx * dx + dy * dy < 10 * 10) continue
      const tileIdx = ty * sim.map.width + tx
      if (sim.map.cost[tileIdx] === 0) continue
      break
    }
    const key = speciesPool[sim.rng.int(speciesPool.length)]!
    spawnPack(sim, key, tx, ty, 2 + sim.rng.int(2), p + 1)
  }
}
