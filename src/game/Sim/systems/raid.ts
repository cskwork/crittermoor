import { DAY_LENGTH_TICKS } from '@/shared/constants'
import type { SimWorld } from '../world'
import { sound } from '@/audio/SoundManager'
import { defineQuery, hasComponent } from 'bitecs'
import { Structure } from '../components'
import { spawnVfx } from '@/game/vfxBridge'

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

// Roster builder: scales with day count + colony wealth (stone, wood, finished structures).
export function buildRaidRoster(sim: SimWorld, rngInt: (n: number) => number, rngChance: (p: number) => boolean): number[] {
  const day = Math.floor(sim.tick / DAY_LENGTH_TICKS) + 1
  const wealth = colonyWealth(sim)
  // Difficulty index: 1 + day/12 + wealth/200, capped at 5 hostiles.
  const diffRaw = 1 + day / 12 + wealth / 200
  const targetSize = Math.min(5, Math.max(1, Math.floor(diffRaw)))
  const roster: number[] = []
  for (let i = 0; i < targetSize; i++) {
    roster.push(1 + rngInt(6))
  }
  // Boss tier: 1-in-8 chance once difficulty crosses 3 — extra elite at the top.
  if (diffRaw >= 3 && rngChance(0.125)) {
    roster.push(1 + rngInt(6))
  }
  return roster
}

function colonyWealth(sim: SimWorld): number {
  // Wealth = wood + stone + 8 * completed-structure-count. Cheap to compute each raid tick.
  let structures = 0
  const eids = structureQuery(sim.ecs)
  for (let i = 0; i < eids.length; i++) {
    const eid = eids[i]!
    if (!hasComponent(sim.ecs, Structure, eid)) continue
    if (Structure.state[eid] === 1) structures++
  }
  return sim.resources.wood + sim.resources.stone + structures * 8
}

const structureQuery = defineQuery([Structure])

export function makeRaidSystem(hooks: RaidHooks) {
  return function system_raid(sim: SimWorld): void {
    const r = ensureRaidState(sim)
    if (!r.scheduled || sim.tick < r.nextRaidTick) return

    const team = buildRaidRoster(sim, (n) => sim.rng.int(n), (p) => sim.rng.chance(p))

    const day = Math.floor(sim.tick / DAY_LENGTH_TICKS) + 1
    sim.events.push(`A hostile pack of ${team.length} approaches on day ${day}!`)
    sound.play('raid_alarm')
    spawnVfx('raid', Math.floor(sim.map.width / 2), Math.floor(sim.map.height / 2))
    r.scheduled = false
    hooks.onRaid(team)

    const intervalDays = MIN_INTERVAL_DAYS + sim.rng.int(MAX_INTERVAL_DAYS - MIN_INTERVAL_DAYS + 1)
    r.nextRaidTick = sim.tick + intervalDays * DAY_LENGTH_TICKS
    r.scheduled = true
  }
}
