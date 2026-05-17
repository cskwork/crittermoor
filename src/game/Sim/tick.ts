import type { SimWorld } from './world'
import { system_needs_decay } from './systems/needs'
import { system_time } from './systems/time'
import { system_position_prev } from './systems/movement'
import { system_path_follow } from './systems/pathFollow'
import { makeJobSystem, type JobsHooks } from './systems/jobs'

export interface SimHooks {
  jobs: JobsHooks
}

export function makeRunTick(hooks: SimHooks): (sim: SimWorld) => void {
  const jobsSystem = makeJobSystem(hooks.jobs)
  return function runTick(sim: SimWorld): void {
    system_position_prev(sim)
    system_time(sim)
    system_needs_decay(sim)
    jobsSystem(sim)
    system_path_follow(sim)
    sim.tick++
  }
}

// Headless variant for tests: no path-request hook, jobs system is a noop bridge.
export function runTick(sim: SimWorld): void {
  system_position_prev(sim)
  system_time(sim)
  system_needs_decay(sim)
  system_path_follow(sim)
  sim.tick++
}
