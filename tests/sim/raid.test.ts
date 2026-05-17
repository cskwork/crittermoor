import { describe, expect, it } from 'vitest'
import { createSimWorld } from '@/game/Sim/world'
import { serialize, deserialize } from '@/game/Sim/Saves/codec'
import { ensureRaidState, getRaidState, makeRaidSystem } from '@/game/Sim/systems/raid'

describe('raid scheduler', () => {
  it('schedules a first raid relative to current tick', () => {
    const sim = createSimWorld(1)
    sim.tick = 100
    const r = ensureRaidState(sim)
    expect(r.scheduled).toBe(true)
    expect(r.nextRaidTick).toBeGreaterThan(sim.tick)
  })

  it('fires the onRaid hook when the scheduled tick is reached', () => {
    const sim = createSimWorld(1)
    const r = ensureRaidState(sim)
    let fired = 0
    const system = makeRaidSystem({ onRaid: () => fired++ })
    sim.tick = r.nextRaidTick
    system(sim)
    expect(fired).toBe(1)
    expect(getRaidState(sim)!.nextRaidTick).toBeGreaterThan(sim.tick)
  })

  it('persists raid schedule across save/load', () => {
    const sim = createSimWorld(7)
    const r = ensureRaidState(sim)
    r.nextRaidTick = 12345
    r.scheduled = true
    const doc = serialize(sim)
    expect(doc.version).toBe(3)
    const restored = deserialize(doc)
    const after = getRaidState(restored)
    expect(after?.nextRaidTick).toBe(12345)
    expect(after?.scheduled).toBe(true)
  })
})
