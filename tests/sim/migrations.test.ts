import { describe, expect, it } from 'vitest'
import { deserialize, serialize } from '@/game/Sim/Saves/codec'
import { createSimWorld, spawnWarden } from '@/game/Sim/world'
import type { SaveDocV1 } from '@/game/Sim/Saves/schema'

function makeV1Fixture(): SaveDocV1 {
  // Build a v1-shaped doc by serializing a v2 sim and rewriting version + dropping new fields.
  const sim = createSimWorld(777)
  spawnWarden(sim, 4, 4, 0xa8d08d)
  const v2 = serialize(sim)
  const v1: SaveDocV1 = {
    version: 1,
    savedAt: v2.savedAt,
    seed: v2.seed,
    tick: v2.tick,
    rngState: v2.rngState,
    map: v2.map,
    entities: v2.entities.map(({ critter: _critter, bond: _bond, ...rest }) => rest),
    designations: v2.designations,
    events: v2.events,
  }
  return v1
}

describe('save migrations', () => {
  it('loads a v1 save through migration', () => {
    const v1 = makeV1Fixture()
    const sim = deserialize(v1)
    expect(sim.seed).toBe(777)
    expect(sim.tick).toBe(0)
    expect(sim.map.width).toBeGreaterThan(0)
  })

  it('round-trips a v2 save with critter + bond', () => {
    const sim = createSimWorld(5)
    const warden = spawnWarden(sim, 10, 10, 0xa8d08d)
    void warden
    const doc = serialize(sim)
    expect(doc.version).toBe(2)
    const sim2 = deserialize(doc)
    expect(sim2.tick).toBe(sim.tick)
    expect(sim2.seed).toBe(sim.seed)
  })
})
