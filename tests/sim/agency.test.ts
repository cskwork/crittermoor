import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PRIORITY,
  HOURS_PER_DAY,
  ScheduleSlot,
  WORK_KINDS,
  clampPriority,
  clampSlot,
  createAgency,
  currentSlot,
  defaultPriorities,
  defaultSchedule,
  getPriorities,
  getSchedule,
  isDrafted,
  setDraftTarget,
  setDrafted,
  setPriority,
  setSlot,
} from '@/game/Sim/agency'
import { DAY_LENGTH_TICKS } from '@/shared/constants'

describe('agency', () => {
  it('defaults every priority to mid (3) and covers every WorkKind', () => {
    const p = defaultPriorities()
    for (const k of WORK_KINDS) expect(p[k]).toBe(DEFAULT_PRIORITY)
  })

  it('default schedule sleeps 22-05, works 06-19, plays 20-21', () => {
    const s = defaultSchedule()
    expect(s.length).toBe(HOURS_PER_DAY)
    expect(s[2]).toBe(ScheduleSlot.Sleep)
    expect(s[10]).toBe(ScheduleSlot.Work)
    expect(s[20]).toBe(ScheduleSlot.Joy)
    expect(s[23]).toBe(ScheduleSlot.Sleep)
  })

  it('clamps priority into [0, 4] and recovers from NaN', () => {
    expect(clampPriority(-1)).toBe(0)
    expect(clampPriority(99)).toBe(4)
    expect(clampPriority(Number.NaN)).toBe(DEFAULT_PRIORITY)
    expect(clampPriority(2.7)).toBe(2)
  })

  it('clampSlot accepts only 0-3', () => {
    expect(clampSlot(0)).toBe(ScheduleSlot.Anything)
    expect(clampSlot(3)).toBe(ScheduleSlot.Sleep)
    expect(clampSlot(7)).toBe(ScheduleSlot.Anything)
    expect(clampSlot(-1)).toBe(ScheduleSlot.Anything)
  })

  it('getPriorities and getSchedule lazy-init per eid', () => {
    const a = createAgency()
    expect(a.priorities.size).toBe(0)
    getPriorities(a, 1)
    getSchedule(a, 1)
    expect(a.priorities.has(1)).toBe(true)
    expect(a.schedules.has(1)).toBe(true)
  })

  it('setPriority writes a clamped value', () => {
    const a = createAgency()
    setPriority(a, 1, 'chop', 99)
    expect(getPriorities(a, 1).chop).toBe(4)
    setPriority(a, 1, 'mine', -3)
    expect(getPriorities(a, 1).mine).toBe(0)
  })

  it('setSlot writes a clamped slot at the given hour', () => {
    const a = createAgency()
    setSlot(a, 7, 12, ScheduleSlot.Joy)
    expect(getSchedule(a, 7)[12]).toBe(ScheduleSlot.Joy)
    setSlot(a, 7, -1, ScheduleSlot.Joy) // out of range, ignored
    expect(getSchedule(a, 7).length).toBe(HOURS_PER_DAY)
  })

  it('setDrafted toggles draft membership and clears any pending target on undraft', () => {
    const a = createAgency()
    setDrafted(a, 9, true)
    setDraftTarget(a, 9, 4, 5)
    expect(isDrafted(a, 9)).toBe(true)
    expect(a.draftTargets.get(9)).toEqual({ tx: 4, ty: 5 })
    setDrafted(a, 9, false)
    expect(isDrafted(a, 9)).toBe(false)
    expect(a.draftTargets.has(9)).toBe(false)
  })

  it('currentSlot reads the right hour for a given tick', () => {
    const a = createAgency()
    // hour 0 = tick 0; hour 12 = halfway through the day
    expect(currentSlot(a, 1, 0, DAY_LENGTH_TICKS)).toBe(ScheduleSlot.Sleep) // h=0
    expect(currentSlot(a, 1, Math.floor(DAY_LENGTH_TICKS / 2), DAY_LENGTH_TICKS)).toBe(ScheduleSlot.Work)
  })
})
