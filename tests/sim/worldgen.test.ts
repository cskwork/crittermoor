import { describe, expect, it } from 'vitest'
import { createSimWorld } from '@/game/Sim/world'
import { generateWorld } from '@/game/Sim/Gen/worldGen'
import { buildRaidRoster } from '@/game/Sim/systems/raid'
import { createRng } from '@/shared/rng'

describe('worldgen + raid scaler', () => {
  it('worldGen places three biomes with distinct centroids', () => {
    const sim = createSimWorld(123)
    const result = generateWorld(sim)
    expect(result.biomes.length).toBe(3)
    const seen = new Set(result.biomes.map((b) => b.kind))
    expect(seen.size).toBe(3)
    expect(result.biomes[0]!.cx).not.toBe(result.biomes[1]!.cx)
  })

  it('the same seed produces the same biome layout', () => {
    const a = generateWorld(createSimWorld(7))
    const b = generateWorld(createSimWorld(7))
    expect(a.biomes.map((x) => x.kind)).toEqual(b.biomes.map((x) => x.kind))
  })

  it('raid roster scales with day count', () => {
    const sim = createSimWorld(42)
    generateWorld(sim)
    const rng = createRng(42)
    // Day 1: just past 0 ticks, expect a small team (1-2).
    const earlyRoster = buildRaidRoster(sim, (n) => rng.int(n), (p) => rng.chance(p))
    expect(earlyRoster.length).toBeGreaterThan(0)
    expect(earlyRoster.length).toBeLessThanOrEqual(2)

    // Day 36: tick advances 35 days. Expect roster of ~4 (or 5 with boss).
    sim.tick = 36 * (8 * 60 * 10) // DAY_LENGTH_TICKS = 8*60*10
    const rng2 = createRng(7)
    const lateRoster = buildRaidRoster(sim, (n) => rng2.int(n), (p) => rng2.chance(p))
    expect(lateRoster.length).toBeGreaterThanOrEqual(3)
  })

  it('raid roster grows with colony wealth', () => {
    const sim = createSimWorld(42)
    generateWorld(sim)
    sim.resources.wood = 0
    sim.resources.stone = 0
    const rngA = createRng(0)
    const poor = buildRaidRoster(sim, (n) => rngA.int(n), (p) => rngA.chance(p))
    sim.resources.wood = 200
    sim.resources.stone = 200
    const rngB = createRng(0)
    const rich = buildRaidRoster(sim, (n) => rngB.int(n), (p) => rngB.chance(p))
    expect(rich.length).toBeGreaterThanOrEqual(poor.length)
  })
})
