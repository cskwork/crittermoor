import type { SimWorld } from '../world'
import { Terrain } from '@/shared/constants'
import { dropItem } from '../Items/spawn'
import { ItemKind } from '../Items/defs'

// Ticks for a planted seed to reach harvest. Roughly 1.5 in-game days at 1x.
export const FARM_GROW_TICKS = 12_000
const TICK_INTERVAL = 30
const HARVEST_YIELD = 3

export function plantFarm(sim: SimWorld, tx: number, ty: number): boolean {
  const idx = ty * sim.map.width + tx
  const t = sim.map.terrain[idx]
  if (t === Terrain.Mountain || t === Terrain.WaterDeep) return false
  if (sim.farms.has(idx)) return false
  sim.farms.set(idx, 0)
  // Replace the soil colour so the tile reads as farm.
  sim.map.terrain[idx] = Terrain.Dirt
  return true
}

export function removeFarm(sim: SimWorld, tx: number, ty: number): boolean {
  const idx = ty * sim.map.width + tx
  return sim.farms.delete(idx)
}

export function system_farm(sim: SimWorld): void {
  if (sim.tick % TICK_INTERVAL !== 0) return
  if (sim.farms.size === 0) return
  for (const [idx, growth] of sim.farms) {
    const next = growth + TICK_INTERVAL
    if (next >= FARM_GROW_TICKS) {
      const tx = idx % sim.map.width
      const ty = Math.floor(idx / sim.map.width)
      dropItem(sim, ItemKind.RawFood, tx, ty, HARVEST_YIELD)
      sim.farms.delete(idx)
      sim.events.push(`Farm harvested at (${tx},${ty}) — +${HARVEST_YIELD} raw food.`)
      continue
    }
    sim.farms.set(idx, next)
  }
}
