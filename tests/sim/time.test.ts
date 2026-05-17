import { describe, expect, it } from 'vitest'
import { createSimWorld } from '@/game/Sim/world'
import { DAY_LENGTH_TICKS } from '@/shared/constants'
import { dayOf, phaseOf } from '@/game/Sim/systems/time'

describe('day/night phases', () => {
  it('dawn → day → dusk → night across one day', () => {
    const sim = createSimWorld(1)
    sim.tick = 0
    expect(phaseOf(sim)).toBe('dawn')
    sim.tick = Math.floor(DAY_LENGTH_TICKS * 0.25)
    expect(phaseOf(sim)).toBe('day')
    sim.tick = Math.floor(DAY_LENGTH_TICKS * 0.78)
    expect(phaseOf(sim)).toBe('dusk')
    sim.tick = Math.floor(DAY_LENGTH_TICKS * 0.9)
    expect(phaseOf(sim)).toBe('night')
  })

  it('dayOf increments after a full day', () => {
    const sim = createSimWorld(1)
    sim.tick = 0
    expect(dayOf(sim)).toBe(1)
    sim.tick = DAY_LENGTH_TICKS
    expect(dayOf(sim)).toBe(2)
  })
})
