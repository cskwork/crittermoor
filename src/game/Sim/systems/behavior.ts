import { defineQuery, hasComponent } from 'bitecs'
import { Faction as FactionComp, Job, Needs, Pawn } from '../components'
import type { SimWorld } from '../world'
import { DAY_LENGTH_TICKS, Faction } from '@/shared/constants'
import { sound } from '@/audio/SoundManager'
import { ScheduleSlot, currentSlot, isDrafted } from '../agency'

export enum Behavior {
  Idle = 0,
  Working = 1,
  Sleeping = 2,
  Eating = 3,
}

const REST_LOW = 25
const REST_FULL = 80
const FOOD_LOW = 30
const FOOD_FULL = 80
const REGEN_INTERVAL = 4

const pawnQuery = defineQuery([Pawn, Needs, FactionComp])

export function system_pawn_behavior(sim: SimWorld): void {
  const eids = pawnQuery(sim.ecs)
  for (let i = 0; i < eids.length; i++) {
    const eid = eids[i]!
    if (FactionComp.id[eid] !== Faction.Player) continue
    const food = Needs.food[eid]!
    const rest = Needs.rest[eid]!
    const prev = Pawn.behavior[eid] as Behavior
    let behavior = prev
    const drafted = isDrafted(sim.agency, eid)
    const slot = currentSlot(sim.agency, eid, sim.tick, DAY_LENGTH_TICKS)

    // Drafted wardens skip autonomous transitions; player input drives them.
    if (drafted) {
      behavior = Behavior.Idle
    } else if (behavior === Behavior.Sleeping && rest >= REST_FULL) {
      behavior = Behavior.Idle
    } else if (behavior === Behavior.Eating && food >= FOOD_FULL) {
      behavior = Behavior.Idle
    } else if (food <= FOOD_LOW) {
      // Critical hunger always wins; can't work or sleep while starving.
      behavior = Behavior.Eating
    } else if (slot === ScheduleSlot.Sleep && rest < REST_FULL) {
      // Scheduled bedtime: nap whenever the player has assigned this hour to Sleep.
      behavior = Behavior.Sleeping
    } else if (rest <= REST_LOW) {
      behavior = Behavior.Sleeping
    }
    Pawn.behavior[eid] = behavior
    if (behavior !== prev) {
      if (behavior === Behavior.Sleeping) sound.play('sleep')
      else if (behavior === Behavior.Eating) sound.play('eat')
    }

    // Regen overrides while sleeping/eating; pause job progress.
    if (behavior === Behavior.Sleeping || behavior === Behavior.Eating) {
      if (hasComponent(sim.ecs, Job, eid)) {
        Job.kind[eid] = 0 // JobKind.None
        Job.state[eid] = 0
        Job.progress[eid] = 0
        Job.targetEid[eid] = 0
      }
      if (sim.tick % REGEN_INTERVAL === 0) {
        if (behavior === Behavior.Sleeping && Needs.rest[eid]! < 100) Needs.rest[eid]!++
        if (behavior === Behavior.Eating && Needs.food[eid]! < 100) Needs.food[eid]!++
      }
    }
  }
}
