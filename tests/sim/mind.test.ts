import { describe, expect, it } from 'vitest'
import { defineQuery } from 'bitecs'
import { createSimWorld, spawnWarden } from '@/game/Sim/world'
import { Faction as FactionComp, Mind, Needs, Pawn } from '@/game/Sim/components'
import { Faction } from '@/shared/constants'
import {
  BREAK_FLAG,
  Trait,
  applyThought,
  rollTrait,
  system_mind,
  traitLabel,
} from '@/game/Sim/systems/mind'
import { serialize, deserialize } from '@/game/Sim/Saves/codec'

// system_mind only runs on MIND_INTERVAL (60) ticks; step through those.
function runMind(sim: ReturnType<typeof createSimWorld>, times: number): void {
  for (let i = 0; i < times; i++) {
    sim.tick = (i + 1) * 60
    system_mind(sim)
  }
}

describe('mind: traits', () => {
  it('rollTrait is deterministic for the same (seed, eid)', () => {
    expect(rollTrait(1234, 7)).toBe(rollTrait(1234, 7))
    expect(rollTrait(1234, 8)).toBe(rollTrait(1234, 8))
  })

  it('rollTrait returns a valid Trait enum value', () => {
    const valid = new Set(Object.values(Trait).filter((v) => typeof v === 'number'))
    for (let eid = 1; eid < 30; eid++) {
      expect(valid.has(rollTrait(99, eid))).toBe(true)
    }
  })

  it('spawnWarden assigns a Mind trait and respects an explicit override', () => {
    const sim = createSimWorld(1)
    const rolled = spawnWarden(sim, 5, 5)
    expect(Mind.trait[rolled]).toBe(rollTrait(sim.seed, rolled))
    const forced = spawnWarden(sim, 6, 6, 0xffffff, Trait.Steadfast)
    expect(Mind.trait[forced]).toBe(Trait.Steadfast)
  })

  it('traitLabel maps known traits and falls back for unknown', () => {
    expect(traitLabel(Trait.Optimist)).toBe('Optimist')
    expect(traitLabel(255)).toBe('Even-keeled')
  })
})

describe('mind: thoughts', () => {
  it('applyThought nudges mood and clamps to [-100, 100]', () => {
    const sim = createSimWorld(2)
    const eid = spawnWarden(sim, 5, 5)
    Pawn.mood[eid] = 0
    applyThought(eid, 'ateMeal')
    expect(Pawn.mood[eid]).toBe(5)
    Pawn.mood[eid] = 98
    applyThought(eid, 'tamedCritter') // +14 would overflow
    expect(Pawn.mood[eid]).toBe(100)
    Pawn.mood[eid] = -96
    applyThought(eid, 'allyDowned') // -16 would underflow
    expect(Pawn.mood[eid]).toBe(-100)
  })
})

describe('mind: mood + breaks', () => {
  it('eases mood toward the needs baseline plus trait bias', () => {
    const sim = createSimWorld(3)
    const eid = spawnWarden(sim, 5, 5, 0xffffff, Trait.None)
    Needs.food[eid] = 100
    Needs.rest[eid] = 100
    Needs.joy[eid] = 100
    Pawn.mood[eid] = 0
    runMind(sim, 5) // eases up by 1 per interval toward a positive target
    expect(Pawn.mood[eid]).toBe(5)
  })

  it('triggers a probabilistic break when mood is deeply negative, then recovers', () => {
    const sim = createSimWorld(4)
    const eid = spawnWarden(sim, 5, 5, 0xffffff, Trait.Nervous)
    Needs.food[eid] = 0
    Needs.rest[eid] = 0
    Needs.joy[eid] = 0
    Pawn.mood[eid] = -90
    // Over many checks at extreme risk the break is effectively certain.
    let broke = false
    for (let i = 0; i < 300 && !broke; i++) {
      sim.tick = (i + 1) * 60
      system_mind(sim)
      broke = ((Pawn.flags[eid] ?? 0) & BREAK_FLAG) !== 0
    }
    expect(broke).toBe(true)

    // Restore needs so mood eases back above the recover threshold; flag clears.
    Needs.food[eid] = 100
    Needs.rest[eid] = 100
    Needs.joy[eid] = 100
    let recovered = false
    for (let i = 300; i < 600 && !recovered; i++) {
      sim.tick = (i + 1) * 60
      system_mind(sim)
      recovered = ((Pawn.flags[eid] ?? 0) & BREAK_FLAG) === 0
    }
    expect(recovered).toBe(true)
  })

  it('a content pawn never breaks', () => {
    const sim = createSimWorld(5)
    const eid = spawnWarden(sim, 5, 5, 0xffffff, Trait.Optimist)
    Needs.food[eid] = 90
    Needs.rest[eid] = 90
    Needs.joy[eid] = 90
    Pawn.mood[eid] = 40
    runMind(sim, 200)
    expect((Pawn.flags[eid] ?? 0) & BREAK_FLAG).toBe(0)
  })
})

describe('mind: persistence', () => {
  it('round-trips pawn trait + mood through save/load', () => {
    const sim = createSimWorld(6)
    const eid = spawnWarden(sim, 5, 5, 0xffffff, Trait.Pessimist)
    Pawn.mood[eid] = -33

    const restored = deserialize(serialize(sim))
    const pawnQuery = defineQuery([Mind, Pawn, FactionComp])
    const restoredPawns = pawnQuery(restored.ecs).filter((e) => FactionComp.id[e] === Faction.Player)
    expect(restoredPawns.length).toBe(1)
    const w = restoredPawns[0]!
    expect(Mind.trait[w]).toBe(Trait.Pessimist)
    expect(Pawn.mood[w]).toBe(-33)
  })
})
