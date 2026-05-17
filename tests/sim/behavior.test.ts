import { describe, expect, it } from 'vitest'
import { createSimWorld, spawnWarden } from '@/game/Sim/world'
import { Needs, Pawn } from '@/game/Sim/components'
import { system_pawn_behavior, Behavior } from '@/game/Sim/systems/behavior'

describe('pawn behavior (AI v2)', () => {
  it('switches to sleeping when rest is low', () => {
    const sim = createSimWorld(1)
    const eid = spawnWarden(sim, 5, 5)
    Needs.rest[eid] = 20
    system_pawn_behavior(sim)
    expect(Pawn.behavior[eid]).toBe(Behavior.Sleeping)
  })

  it('switches to eating when food is low', () => {
    const sim = createSimWorld(2)
    const eid = spawnWarden(sim, 5, 5)
    Needs.rest[eid] = 80 // ensure rest is not the trigger
    Needs.food[eid] = 25
    system_pawn_behavior(sim)
    expect(Pawn.behavior[eid]).toBe(Behavior.Eating)
  })

  it('regenerates rest while sleeping', () => {
    const sim = createSimWorld(3)
    const eid = spawnWarden(sim, 5, 5)
    Needs.rest[eid] = 20
    for (let t = 0; t < 80; t++) {
      system_pawn_behavior(sim)
      sim.tick++
    }
    expect(Needs.rest[eid]!).toBeGreaterThan(20)
  })

  it('returns to idle once rest is full', () => {
    const sim = createSimWorld(4)
    const eid = spawnWarden(sim, 5, 5)
    Needs.rest[eid] = 90
    Pawn.behavior[eid] = Behavior.Sleeping
    system_pawn_behavior(sim)
    expect(Pawn.behavior[eid]).toBe(Behavior.Idle)
  })

  it('food trigger takes precedence over rest when rest is okay', () => {
    const sim = createSimWorld(5)
    const eid = spawnWarden(sim, 5, 5)
    Needs.rest[eid] = 90
    Needs.food[eid] = 25
    system_pawn_behavior(sim)
    expect(Pawn.behavior[eid]).toBe(Behavior.Eating)
  })
})
