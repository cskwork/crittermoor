import type { SimWorld } from './world'
import { system_needs_decay } from './systems/needs'
import { system_time } from './systems/time'
import { system_position_prev } from './systems/movement'
import { system_path_follow } from './systems/pathFollow'
import { system_pawn_behavior } from './systems/behavior'
import { system_wild_ai } from './systems/wildAi'
import { system_critter_follow } from './systems/critterFollow'
import { makeJobSystem, type JobsHooks } from './systems/jobs'
import { makeRaidSystem, type RaidHooks } from './systems/raid'
import { makeConstructSystem, type ConstructHooks } from './systems/construct'
import { system_turret } from './systems/turret'

export interface SimHooks {
  jobs: JobsHooks
  raid: RaidHooks
  construct: ConstructHooks
}

export function makeRunTick(hooks: SimHooks): (sim: SimWorld) => void {
  const jobsSystem = makeJobSystem(hooks.jobs)
  const raidSystem = makeRaidSystem(hooks.raid)
  const constructSystem = makeConstructSystem(hooks.construct)
  return function runTick(sim: SimWorld): void {
    system_position_prev(sim)
    system_time(sim)
    system_needs_decay(sim)
    system_pawn_behavior(sim)
    jobsSystem(sim)
    constructSystem(sim)
    system_turret(sim)
    system_wild_ai(sim)
    system_critter_follow(sim)
    raidSystem(sim)
    system_path_follow(sim)
    sim.tick++
  }
}

// Headless tests: no path requests.
export function runTick(sim: SimWorld): void {
  system_position_prev(sim)
  system_time(sim)
  system_needs_decay(sim)
  system_pawn_behavior(sim)
  system_wild_ai(sim)
  system_critter_follow(sim)
  system_path_follow(sim)
  sim.tick++
}
