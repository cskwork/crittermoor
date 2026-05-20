import type { SimWorld } from '../world'
import { spawnWarden } from '../world'
import { Terrain, TERRAIN_COST } from '@/shared/constants'
import { spawnPack } from '../Critters/spawn'

// Biome layout: three quadrants chosen at world-gen time. Each biome tilts
// terrain probability and species pool so worlds feel distinct.
export type BiomeKind = 'temperate-moor' | 'arid-plain' | 'frostpine-bog'

interface BiomeProfile {
  kind: BiomeKind
  base: Terrain
  forestProb: number
  stoneProb: number
  mountainProb: number
  waterProb: number
  sandProb: number
  species: readonly string[]
}

const PROFILES: Record<BiomeKind, BiomeProfile> = {
  'temperate-moor': {
    kind: 'temperate-moor',
    base: Terrain.Grass,
    forestProb: 0.09,
    stoneProb: 0.04,
    mountainProb: 0.01,
    waterProb: 0.02,
    sandProb: 0.005,
    species: ['spritmoth', 'tindercub', 'mosskit', 'loamfin'],
  },
  'arid-plain': {
    kind: 'arid-plain',
    base: Terrain.Sand,
    forestProb: 0.01,
    stoneProb: 0.08,
    mountainProb: 0.03,
    waterProb: 0.005,
    sandProb: 0.18,
    species: ['ferroquill', 'brackboar', 'tindercub'],
  },
  'frostpine-bog': {
    kind: 'frostpine-bog',
    base: Terrain.Dirt,
    forestProb: 0.14,
    stoneProb: 0.03,
    mountainProb: 0.02,
    waterProb: 0.08,
    sandProb: 0.0,
    species: ['mosskit', 'loamfin', 'spritmoth', 'brackboar'],
  },
}

export interface WorldGenResult {
  biomes: { kind: BiomeKind; cx: number; cy: number }[]
  spawnSeeds: readonly string[]
}

// Three biome centroids placed in fixed thirds of the map; assignment is
// nearest-centroid. This keeps tests deterministic and rendering simple.
function biomeForTile(tx: number, ty: number, biomes: { kind: BiomeKind; cx: number; cy: number }[]): BiomeProfile {
  let bestIdx = 0
  let bestDist = Infinity
  for (let i = 0; i < biomes.length; i++) {
    const b = biomes[i]!
    const dx = tx - b.cx
    const dy = ty - b.cy
    const d = dx * dx + dy * dy
    if (d < bestDist) {
      bestDist = d
      bestIdx = i
    }
  }
  return PROFILES[biomes[bestIdx]!.kind]
}

export function generateWorld(sim: SimWorld): WorldGenResult {
  const { width, height, terrain, cost } = sim.map
  const rng = sim.rng

  // Shuffle the three biomes so the same seed yields a stable layout but
  // different seeds vary which biome sits where.
  const order: BiomeKind[] = ['temperate-moor', 'arid-plain', 'frostpine-bog']
  for (let i = order.length - 1; i > 0; i--) {
    const j = rng.int(i + 1)
    ;[order[i], order[j]] = [order[j]!, order[i]!]
  }
  const biomes = [
    { kind: order[0]!, cx: Math.floor(width * 0.25), cy: Math.floor(height * 0.5) },
    { kind: order[1]!, cx: Math.floor(width * 0.75), cy: Math.floor(height * 0.33) },
    { kind: order[2]!, cx: Math.floor(width * 0.5), cy: Math.floor(height * 0.78) },
  ]

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const profile = biomeForTile(x, y, biomes)
      const r = rng.next()
      let t: Terrain = profile.base
      const f = profile.forestProb
      const s = f + profile.stoneProb
      const m = s + profile.mountainProb
      const w = m + profile.waterProb
      const sd = w + profile.sandProb
      if (r < f) t = Terrain.Forest
      else if (r < s) t = Terrain.Stone
      else if (r < m) t = Terrain.Mountain
      else if (r < w) t = Terrain.WaterShallow
      else if (r < sd) t = Terrain.Sand
      terrain[i] = t
      cost[i] = TERRAIN_COST[t] || 9999
    }
  }

  const cx = Math.floor(width / 2)
  const cy = Math.floor(height / 2)
  // Ensure the spawn radius is grass so the new game opens onto walkable terrain.
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
  scatterBiomeWildlife(sim, biomes, cx, cy)
  return { biomes, spawnSeeds: order }
}

function scatterBiomeWildlife(
  sim: SimWorld,
  biomes: { kind: BiomeKind; cx: number; cy: number }[],
  awayX: number,
  awayY: number,
): void {
  // Two packs per biome, drawn from that biome's species pool.
  let packCounter = 0
  for (const biome of biomes) {
    const profile = PROFILES[biome.kind]
    for (let p = 0; p < 2; p++) {
      let tx = 0
      let ty = 0
      for (let tries = 0; tries < 24; tries++) {
        const ox = sim.rng.int(20) - 10
        const oy = sim.rng.int(20) - 10
        tx = clamp(biome.cx + ox, 0, sim.map.width - 1)
        ty = clamp(biome.cy + oy, 0, sim.map.height - 1)
        const dx = tx - awayX
        const dy = ty - awayY
        if (dx * dx + dy * dy < 10 * 10) continue
        const tileIdx = ty * sim.map.width + tx
        if (sim.map.cost[tileIdx] === 0) continue
        break
      }
      const key = profile.species[sim.rng.int(profile.species.length)]!
      packCounter++
      spawnPack(sim, key, tx, ty, 2 + sim.rng.int(2), packCounter)
    }
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}
