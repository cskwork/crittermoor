import { describe, expect, it } from 'vitest'
import { createSimWorld } from '@/game/Sim/world'
import { spawnBlueprint, spawnCompleteStructure } from '@/game/Sim/Structures/spawn'
import { StructureKind, STRUCTURES } from '@/game/Sim/Structures/defs'
import { Structure } from '@/game/Sim/components'
import { serialize, deserialize } from '@/game/Sim/Saves/codec'

describe('structures + build', () => {
  it('spawns a blueprint with state=0 and progress=0', () => {
    const sim = createSimWorld(1)
    const eid = spawnBlueprint(sim, StructureKind.Wall, 5, 5)
    expect(Structure.kind[eid]).toBe(StructureKind.Wall)
    expect(Structure.state[eid]).toBe(0)
    expect(Structure.progress[eid]).toBe(0)
  })

  it('spawns a complete wall that blocks pathfinding', () => {
    const sim = createSimWorld(2)
    const eid = spawnCompleteStructure(sim, StructureKind.Wall, 10, 10)
    expect(Structure.state[eid]).toBe(1)
    expect(sim.map.cost[10 * sim.map.width + 10]).toBe(0)
  })

  it('door does not block pathfinding when complete', () => {
    const sim = createSimWorld(3)
    spawnCompleteStructure(sim, StructureKind.Door, 4, 4)
    const cost = sim.map.cost[4 * sim.map.width + 4]
    expect(cost).toBeGreaterThan(0)
  })

  it('save v3 round-trips structures + blueprints + resources', () => {
    const sim = createSimWorld(99)
    sim.resources.wood = 42
    sim.resources.stone = 17
    const wallEid = spawnCompleteStructure(sim, StructureKind.Wall, 6, 6)
    const bedBpEid = spawnBlueprint(sim, StructureKind.Bed, 7, 7)
    sim.blueprints.set(7 * sim.map.width + 7, bedBpEid)
    const doc = serialize(sim)
    expect(doc.version).toBe(4)
    if (doc.version !== 4) throw new Error('expected v4')
    expect(doc.resources?.wood).toBe(42)
    expect(doc.blueprintKeys?.length).toBe(1)
    const restored = deserialize(doc)
    expect(restored.resources.wood).toBe(42)
    expect(restored.resources.stone).toBe(17)
    expect(restored.blueprints.size).toBe(1)
    // Wall cost should still be 0 in restored map.
    expect(restored.map.cost[6 * restored.map.width + 6]).toBe(0)
    void wallEid
  })

  it('all 6 structure kinds have defs', () => {
    for (const kind of [StructureKind.Wall, StructureKind.Door, StructureKind.Bed, StructureKind.Stove, StructureKind.Storage, StructureKind.Turret]) {
      const def = STRUCTURES[kind]
      expect(def.cost.wood + def.cost.stone).toBeGreaterThan(0)
      expect(def.buildTicks).toBeGreaterThan(0)
    }
  })
})
