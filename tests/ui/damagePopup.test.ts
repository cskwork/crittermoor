import { describe, expect, it } from 'vitest'
import { formatDamagePopup, parseDamageLines } from '@/ui/battle/damagePopup'

describe('damagePopup', () => {
  it('formats a non-crit hit as red prefix-minus', () => {
    expect(formatDamagePopup({ dmg: 18, crit: false })).toEqual({ text: '-18', color: 'red' })
  })

  it('formats a crit as yellow CRIT! suffix', () => {
    expect(formatDamagePopup({ dmg: 32, crit: true })).toEqual({ text: '-32 CRIT!', color: 'yellow' })
  })

  it('formats a miss as gray "miss"', () => {
    expect(formatDamagePopup({ dmg: 0, crit: false })).toEqual({ text: 'miss', color: 'gray' })
  })

  it('parses BattleSim log lines into damage events with crit detection', () => {
    const events = parseDamageLines([
      'side0 used Bite: 12 dmg (x1)',
      'side1 used Ember: 17 dmg (crit) (x2)',
      'side0 used Splash missed',
      'side1 is now burn',
    ])
    expect(events).toEqual([
      { side: 0, dmg: 12, crit: false },
      { side: 1, dmg: 17, crit: true },
    ])
  })
})
