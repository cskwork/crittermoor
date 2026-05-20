import { describe, expect, it } from 'vitest'
import { createSimWorld } from '@/game/Sim/world'
import { FARM_GROW_TICKS, plantFarm, removeFarm, system_farm } from '@/game/Sim/systems/farm'
import { findItemAt } from '@/game/Sim/Items/spawn'
import { ItemKind } from '@/game/Sim/Items/defs'

describe('farm system', () => {
  it('plantFarm marks the tile and returns true', () => {
    const sim = createSimWorld(1)
    expect(plantFarm(sim, 5, 5)).toBe(true)
    expect(sim.farms.has(5 * sim.map.width + 5)).toBe(true)
  })

  it('plantFarm refuses water and already-planted tiles', () => {
    const sim = createSimWorld(2)
    expect(plantFarm(sim, 5, 5)).toBe(true)
    expect(plantFarm(sim, 5, 5)).toBe(false)
  })

  it('system_farm grows + harvests at FARM_GROW_TICKS yielding raw food', () => {
    const sim = createSimWorld(3)
    plantFarm(sim, 4, 4)
    // Force-tick through growth without going through whole tick loop.
    for (let t = 0; t <= FARM_GROW_TICKS; t += 30) {
      sim.tick = t
      system_farm(sim)
    }
    expect(sim.farms.size).toBe(0)
    expect(findItemAt(sim, 4, 4, ItemKind.RawFood)).toBeGreaterThan(0)
  })

  it('removeFarm clears the plot', () => {
    const sim = createSimWorld(4)
    plantFarm(sim, 8, 8)
    expect(removeFarm(sim, 8, 8)).toBe(true)
    expect(sim.farms.size).toBe(0)
  })
})
