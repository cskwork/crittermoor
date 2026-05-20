import { describe, expect, it } from 'vitest'
import { createSimWorld, spawnWarden } from '@/game/Sim/world'
import { generateWorld } from '@/game/Sim/Gen/worldGen'
import { computeCrc, deserialize, serialize, verifyCrc } from '@/game/Sim/Saves/codec'
import { crc32String } from '@/game/Sim/Saves/crc32'
import { SaveCorruptError, type SaveDocV3 } from '@/game/Sim/Saves/schema'
import { Needs } from '@/game/Sim/components'
void Needs

describe('save codec', () => {
  it('round-trips a fresh world', () => {
    const sim = createSimWorld(42)
    generateWorld(sim)
    const doc = serialize(sim)
    const restored = deserialize(doc)
    expect(restored.seed).toBe(sim.seed)
    expect(restored.tick).toBe(sim.tick)
    expect(restored.map.width).toBe(sim.map.width)
    expect(restored.map.height).toBe(sim.map.height)
    expect(Array.from(restored.map.terrain.slice(0, 200))).toEqual(Array.from(sim.map.terrain.slice(0, 200)))
  })

  it('preserves needs and designations', () => {
    const sim = createSimWorld(13)
    const eid = spawnWarden(sim, 5, 5, 0xa8d08d)
    Needs.food[eid] = 47
    sim.designations.set(0, { kind: 'chop', tx: 1, ty: 0 })
    sim.designations.set(1, { kind: 'mine', tx: 2, ty: 0 })
    const doc = serialize(sim)
    expect(doc.entities.length).toBeGreaterThan(0)
    expect(doc.entities[0]!.needs?.food).toBe(47)
    const restored = deserialize(doc)
    expect(restored.designations.size).toBe(2)
    expect(restored.events).toEqual(sim.events)
  })

  it('stamps a verifying CRC and rejects tampered blobs', () => {
    const sim = createSimWorld(7)
    generateWorld(sim)
    const doc = serialize(sim) as SaveDocV3
    expect(typeof doc.crc).toBe('number')
    expect(doc.crc).toBe(computeCrc({ ...doc, crc: 0 }))
    verifyCrc(doc)
    const tampered: SaveDocV3 = { ...doc, tick: doc.tick + 1 }
    expect(() => verifyCrc(tampered, 'autosave')).toThrowError(SaveCorruptError)
  })

  it('crc32 is stable for known inputs', () => {
    expect(crc32String('')).toBe(0)
    expect(crc32String('crittermoor')).toBe(crc32String('crittermoor'))
    expect(crc32String('a')).not.toBe(crc32String('b'))
  })

  it('preserves rng state for deterministic continuation', () => {
    const sim = createSimWorld(99)
    generateWorld(sim)
    // burn some RNG calls
    for (let i = 0; i < 100; i++) sim.rng.next()
    const before = sim.rng.next()
    const restoredFromMid = deserialize(serialize({ ...sim, rng: sim.rng }))
    expect(restoredFromMid.rng.state).toBe(sim.rng.state)
    expect(restoredFromMid.rng.next()).toBe(sim.rng.next())
    void before
  })
})
