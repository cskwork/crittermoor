import { DAY_LENGTH_TICKS } from '@/shared/constants'
import type { SimWorld } from '../world'

const MIN_DAYS_TO_FIRST_RAID = 3
const MIN_INTERVAL_DAYS = 4
const MAX_INTERVAL_DAYS = 8

export interface RaidHooks {
  onRaid: (raidSpeciesIds: number[]) => void
}

export interface RaidState {
  nextRaidTick: number
  scheduled: boolean
}

interface SimWithRaid { _raid?: RaidState }

export function ensureRaidState(sim: SimWorld): RaidState {
  const w = sim as unknown as SimWithRaid
  if (!w._raid) {
    const ticksToFirst = DAY_LENGTH_TICKS * MIN_DAYS_TO_FIRST_RAID
    w._raid = { nextRaidTick: sim.tick + ticksToFirst, scheduled: true }
  }
  return w._raid
}

export function getRaidState(sim: SimWorld): RaidState | null {
  return (sim as unknown as SimWithRaid)._raid ?? null
}

export function setRaidState(sim: SimWorld, state: RaidState): void {
  const w = sim as unknown as SimWithRaid
  w._raid = state
}

export function makeRaidSystem(hooks: RaidHooks) {
  return function system_raid(sim: SimWorld): void {
    const r = ensureRaidState(sim)
    if (!r.scheduled || sim.tick < r.nextRaidTick) return

    // Pick 1-2 hostile species ids (1..6).
    const team: number[] = []
    team.push(1 + sim.rng.int(6))
    if (sim.rng.chance(0.5)) team.push(1 + sim.rng.int(6))

    sim.events.push('A hostile pack approaches the colony!')
    r.scheduled = false
    hooks.onRaid(team)

    const intervalDays = MIN_INTERVAL_DAYS + sim.rng.int(MAX_INTERVAL_DAYS - MIN_INTERVAL_DAYS + 1)
    r.nextRaidTick = sim.tick + intervalDays * DAY_LENGTH_TICKS
    r.scheduled = true
  }
}
