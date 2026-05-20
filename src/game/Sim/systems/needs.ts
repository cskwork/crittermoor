import { defineQuery } from 'bitecs'
import type { SimWorld } from '../world'
import { Needs, Pawn } from '../components'

const pawnQuery = defineQuery([Needs, Pawn])

// 1 point per 30 ticks at 1x (~4s) is roughly a Rim-ish slow decay.
const DECAY_INTERVAL = 30

// Pawn.mood is i8 in range [-100..100]. Mood drifts toward the average of
// joy + food + rest, normalized so 70% needs sit around 0 mood.
const MOOD_UPDATE_INTERVAL = 60

export function system_needs_decay(sim: SimWorld): void {
  if (sim.tick % DECAY_INTERVAL !== 0) {
    if (sim.tick % MOOD_UPDATE_INTERVAL === 0) updateMood(sim)
    return
  }
  const eids = pawnQuery(sim.ecs)
  for (let i = 0; i < eids.length; i++) {
    const e = eids[i]!
    if (Needs.food[e]! > 0) Needs.food[e]!--
    if (Needs.rest[e]! > 0) Needs.rest[e]!--
    if (Needs.joy[e]! > 0 && sim.tick % (DECAY_INTERVAL * 2) === 0) Needs.joy[e]!--
  }
  if (sim.tick % MOOD_UPDATE_INTERVAL === 0) updateMood(sim)
}

function updateMood(sim: SimWorld): void {
  const eids = pawnQuery(sim.ecs)
  for (let i = 0; i < eids.length; i++) {
    const e = eids[i]!
    const avg = ((Needs.food[e] ?? 0) + (Needs.rest[e] ?? 0) + (Needs.joy[e] ?? 0)) / 3
    // map 0-100 average into -100..100 mood (70 average == 0 mood).
    const target = Math.round((avg - 70) * 2.5)
    const prev = Pawn.mood[e] ?? 0
    // ease toward target by 1 point per update so mood feels stable.
    const next = prev + Math.sign(target - prev)
    Pawn.mood[e] = Math.max(-100, Math.min(100, next))
  }
}
