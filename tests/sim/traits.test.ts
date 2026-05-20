import { describe, expect, it } from 'vitest'
import { TRAITS, applyTrait, rollTrait, traitById } from '@/game/Sim/Critters/traits'
import { createRng } from '@/shared/rng'
import { createSimWorld } from '@/game/Sim/world'
import { spawnCritter } from '@/game/Sim/Critters/spawn'
import { CombatStats, Health } from '@/game/Sim/components'

describe('traits', () => {
  it('exposes 7 entries including a baseline "none"', () => {
    expect(TRAITS.length).toBe(7)
    expect(TRAITS.find((t) => t.id === 'none')).toBeTruthy()
  })

  it('traitById falls back to "none" on unknown id', () => {
    expect(traitById('swift').id).toBe('swift')
    // @ts-expect-error unknown id at the type level — runtime fallback expected
    expect(traitById('floofy').id).toBe('none')
  })

  it('applyTrait multiplies stats per trait definition', () => {
    const base = { hp: 100, atk: 50, def: 50, satk: 50, sdef: 50, spd: 50 }
    const swift = applyTrait(base, 'swift')
    expect(swift.spd).toBe(60)
    expect(swift.hp).toBe(90)
    const sturdy = applyTrait(base, 'sturdy')
    expect(sturdy.hp).toBe(120)
    expect(sturdy.def).toBe(55)
  })

  it('rollTrait returns "none" roughly 10% of the time', () => {
    let none = 0
    const rng = createRng(1234)
    const N = 1000
    for (let i = 0; i < N; i++) {
      const r = rollTrait(rng)
      if (r === 'none') none++
    }
    expect(none).toBeGreaterThan(N * 0.04)
    expect(none).toBeLessThan(N * 0.18)
  })

  it('spawned critters get a trait assigned and stats reflect it', () => {
    const sim = createSimWorld(99)
    const eid = spawnCritter(sim, 1, 5, 5, { level: 5 })
    expect(sim.traits.has(eid)).toBe(true)
    expect(Health.maxHp[eid]).toBeGreaterThan(0)
    expect(CombatStats.spd[eid]).toBeGreaterThan(0)
  })
})
