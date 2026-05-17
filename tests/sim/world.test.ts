import { describe, expect, it } from 'vitest'
import { createSimWorld, spawnWarden } from '@/game/Sim/world'
import { generateWorld } from '@/game/Sim/Gen/worldGen'
import { runTick } from '@/game/Sim/tick'
import { Needs } from '@/game/Sim/components'

describe('SimWorld', () => {
  it('creates a deterministic world from a seed', () => {
    const a = createSimWorld(42)
    const b = createSimWorld(42)
    generateWorld(a)
    generateWorld(b)
    expect(Array.from(a.map.terrain.slice(0, 200))).toEqual(Array.from(b.map.terrain.slice(0, 200)))
  })

  it('decays warden food over ticks', () => {
    const sim = createSimWorld(1)
    const eid = spawnWarden(sim, 10, 10)
    const startFood = Needs.food[eid]
    for (let i = 0; i < 300; i++) runTick(sim)
    expect(Needs.food[eid]).toBeLessThan(startFood ?? 0)
  })
})
