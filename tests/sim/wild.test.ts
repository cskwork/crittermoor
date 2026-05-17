import { describe, expect, it } from 'vitest'
import { createSimWorld } from '@/game/Sim/world'
import { spawnCritter, spawnPack } from '@/game/Sim/Critters/spawn'
import { speciesByKey } from '@/game/Sim/Critters/species'
import { system_wild_ai } from '@/game/Sim/systems/wildAi'
import { Faction as FactionComp, Position, TilePos } from '@/game/Sim/components'
import { Faction } from '@/shared/constants'

describe('wild critter spawn + AI', () => {
  it('spawns a critter with correct species data', () => {
    const sim = createSimWorld(11)
    const species = speciesByKey('tindercub')!
    const eid = spawnCritter(sim, species.id, 10, 10)
    expect(FactionComp.id[eid]).toBe(Faction.Wild)
    expect(Position.x[eid]).toBe(10)
    expect(TilePos.tx[eid]).toBe(10)
  })

  it('spawns a pack within map bounds', () => {
    const sim = createSimWorld(42)
    const ids = spawnPack(sim, 'mosskit', 50, 50, 3, 7)
    expect(ids.length).toBe(3)
    for (const eid of ids) {
      expect(TilePos.tx[eid]).toBeGreaterThanOrEqual(0)
      expect(TilePos.tx[eid]).toBeLessThan(sim.map.width)
    }
  })

  it('wild AI wanders the critter over many ticks', () => {
    const sim = createSimWorld(99)
    const eid = spawnCritter(sim, 1, 30, 30)
    const x0 = TilePos.tx[eid]!
    const y0 = TilePos.ty[eid]!
    // step wild AI 50 times across enough ticks to trigger wander intervals
    for (let t = 0; t < 50 * 16; t++) {
      system_wild_ai(sim)
      sim.tick++
    }
    const moved = TilePos.tx[eid] !== x0 || TilePos.ty[eid] !== y0
    expect(moved).toBe(true)
  })
})
