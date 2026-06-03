import { defineQuery } from 'bitecs'
import type { SimWorld } from '../world'
import { Needs, Pawn } from '../components'
import { DAY_LENGTH_TICKS } from '@/shared/constants'
import { ScheduleSlot, currentSlot } from '../agency'
import { Behavior } from './behavior'

const pawnQuery = defineQuery([Needs, Pawn])

// 1 point per 30 ticks at 1x (~4s) is roughly a Rim-ish slow decay.
const DECAY_INTERVAL = 30

export function system_needs_decay(sim: SimWorld): void {
  if (sim.tick % DECAY_INTERVAL !== 0) return
  const eids = pawnQuery(sim.ecs)
  for (let i = 0; i < eids.length; i++) {
    const e = eids[i]!
    if (Needs.food[e]! > 0) Needs.food[e]!--
    if (Needs.rest[e]! > 0) Needs.rest[e]!--
    if (Needs.joy[e]! > 0 && sim.tick % (DECAY_INTERVAL * 2) === 0) Needs.joy[e]!--
    // Joy regen while the player has scheduled Joy and the pawn is idle.
    const slot = currentSlot(sim.agency, e, sim.tick, DAY_LENGTH_TICKS)
    const idle = Pawn.behavior[e] === Behavior.Idle
    if (slot === ScheduleSlot.Joy && idle && (Needs.joy[e] ?? 0) < 100) {
      Needs.joy[e] = Math.min(100, (Needs.joy[e] ?? 0) + 2)
    }
  }
  // Mood + mental breaks are owned by system_mind (systems/mind.ts).
}
