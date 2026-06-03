import { describe, expect, it } from 'vitest'
import { createSimWorld, type SimWorld } from '@/game/Sim/world'
import { generateWorld } from '@/game/Sim/Gen/worldGen'
import { runTick } from '@/game/Sim/tick'
import { deserialize, serialize } from '@/game/Sim/Saves/codec'
import { crc32String } from '@/game/Sim/Saves/crc32'
import { plantFarm } from '@/game/Sim/systems/farm'
import { setDrafted, setPriority } from '@/game/Sim/agency'

// Stable, eid-agnostic state hash. We can't compare raw eids across runs
// because the ECS reuses ids in allocation order, which depends on insertion
// history. Compare positions + RNG state + farms/stockpiles/resources instead.
function stateHash(sim: SimWorld): number {
  const doc = serialize(sim)
  // serialize always returns the current version (v5), so widen explicitly.
  if (doc.version !== 5) throw new Error(`expected v5, got ${doc.version}`)
  const entitySigs = doc.entities
    .map((e) => `${e.tile.tx}:${e.tile.ty}:${e.faction}:${e.critter?.speciesId ?? -1}:${e.structure?.kind ?? -1}:${e.structure?.state ?? -1}`)
    .sort()
  const items = doc.items
    ? [...doc.items].sort((a, b) => a.tx - b.tx || a.ty - b.ty || a.kind - b.kind).map((it) => `${it.tx}:${it.ty}:${it.kind}:${it.qty}`)
    : []
  const stockpiles = doc.stockpiles ? [...doc.stockpiles].sort((x, y) => x - y) : []
  const farms = doc.farms ? [...doc.farms].sort((x, y) => x.key - y.key).map((f) => `${f.key}:${f.growth}`) : []
  const payload = {
    tick: doc.tick,
    rng: doc.rngState,
    resources: doc.resources,
    designations: [...doc.designations].sort((a, b) => (a.ty * 1000 + a.tx) - (b.ty * 1000 + b.tx)),
    entitySigs,
    items,
    stockpiles,
    farms,
  }
  return crc32String(JSON.stringify(payload))
}

describe('determinism replay', () => {
  it('replaying the same seed and action log yields the same state hash', () => {
    const seedA = 9001
    const seedB = 9001
    const a = createSimWorld(seedA)
    generateWorld(a)
    const b = createSimWorld(seedB)
    generateWorld(b)

    // Apply an identical scripted set of player inputs (touches every G002–G006 surface):
    function script(sim: ReturnType<typeof createSimWorld>): void {
      sim.designations.set(0, { kind: 'chop', tx: 0, ty: 0 })
      sim.stockpiles.add(1)
      plantFarm(sim, 4, 4)
      const eids = Array.from(sim.agency.priorities.keys())
      for (const e of eids) setPriority(sim.agency, e, 'haul', 4)
      setDrafted(sim.agency, eids[0] ?? 1, true)
    }
    script(a)
    script(b)

    for (let t = 0; t < 200; t++) {
      runTick(a)
      runTick(b)
    }

    expect(stateHash(a)).toBe(stateHash(b))
  })

  it('save → reload → continue produces the same state as continuing without saving', () => {
    const sim = createSimWorld(4242)
    generateWorld(sim)
    for (let t = 0; t < 100; t++) runTick(sim)

    const doc = serialize(sim)
    const restored = deserialize(doc)
    const baseline = createSimWorld(4242)
    generateWorld(baseline)
    for (let t = 0; t < 100; t++) runTick(baseline)
    expect(stateHash(restored)).toBe(stateHash(baseline))

    // Continue another 50 ticks in lockstep.
    for (let t = 0; t < 50; t++) {
      runTick(restored)
      runTick(baseline)
    }
    expect(stateHash(restored)).toBe(stateHash(baseline))
  })
})
