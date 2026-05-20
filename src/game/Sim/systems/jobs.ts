import { defineQuery, hasComponent } from 'bitecs'
import type { SimWorld } from '../world'
import { Faction as FactionComp, Job, Pawn, Skills, TilePos } from '../components'
import { Faction, Terrain } from '@/shared/constants'
import { addComponent } from 'bitecs'
import { Behavior } from './behavior'
import { sound } from '@/audio/SoundManager'
import { getPriorities, isDrafted } from '../agency'
import { dropItem } from '../Items/spawn'
import { ItemKind } from '../Items/defs'
import { tryPickup } from './haul'
import { Item } from '../components'

export enum JobKind {
  None = 0,
  Chop = 1,
  Mine = 2,
  Haul = 3,
  HaulCarrying = 4,
}

export enum JobState {
  Seeking = 0,
  Moving = 1,
  Working = 2,
}

const wardenQuery = defineQuery([Pawn, FactionComp, TilePos])

const ASSIGN_INTERVAL = 4
const WORK_TICKS_CHOP = 24
const WORK_TICKS_MINE = 40

export interface JobsHooks {
  requestPath: (eid: number, fromX: number, fromY: number, toX: number, toY: number) => void
}

export function makeJobSystem(hooks: JobsHooks) {
  return function system_jobs(sim: SimWorld): void {
    // Skip if no designations and no active jobs.
    if (sim.tick % ASSIGN_INTERVAL !== 0) return
    const eids = wardenQuery(sim.ecs)
    for (let i = 0; i < eids.length; i++) {
      const eid = eids[i]!
      if (FactionComp.id[eid] !== Faction.Player) continue
      if (Pawn.behavior[eid] === Behavior.Sleeping || Pawn.behavior[eid] === Behavior.Eating) continue
      // Drafted wardens follow player orders only; skip autonomous designations.
      if (isDrafted(sim.agency, eid)) continue
      if (!hasComponent(sim.ecs, Job, eid)) {
        addComponent(sim.ecs, Job, eid)
        Job.kind[eid] = JobKind.None
        Job.state[eid] = JobState.Seeking
      }

      switch (Job.kind[eid] as JobKind) {
        case JobKind.None:
          assignBestDesignation(sim, eid, hooks)
          break
        case JobKind.Chop:
        case JobKind.Mine:
          progressJob(sim, eid)
          break
        case JobKind.Haul:
          progressHaulPickup(sim, eid)
          break
        case JobKind.HaulCarrying:
          // Carry component drives the walk; haul.ts handles arrival.
          break
      }
    }
  }
}

function progressHaulPickup(sim: SimWorld, eid: number): void {
  const itemEid = Job.targetEid[eid] ?? 0
  if (itemEid <= 0 || !hasComponent(sim.ecs, Item, itemEid)) {
    clearJob(eid)
    return
  }
  const arrived = TilePos.tx[eid] === TilePos.tx[itemEid] && TilePos.ty[eid] === TilePos.ty[itemEid]
  if (!arrived) {
    Job.state[eid] = JobState.Moving
    return
  }
  tryPickup(sim, eid, itemEid)
}

function assignBestDesignation(sim: SimWorld, eid: number, hooks: JobsHooks): void {
  if (sim.designations.size === 0) return
  const fromX = TilePos.tx[eid]!
  const fromY = TilePos.ty[eid]!
  const construct = hasSkill(sim, eid) ? Skills.construct[eid]! : 0
  const mine = hasSkill(sim, eid) ? Skills.mine[eid]! : 0
  const priorities = getPriorities(sim.agency, eid)
  let best: { key: number; tx: number; ty: number; kind: 'chop' | 'mine'; score: number } | null = null
  for (const [key, d] of sim.designations) {
    if (isAlreadyTargeted(sim, key, eid)) continue
    // Honor per-warden priority: 0 = disabled, otherwise lower number is preferred.
    const pri = d.kind === 'chop' ? priorities.chop : priorities.mine
    if (pri <= 0) continue
    const dx = d.tx - fromX
    const dy = d.ty - fromY
    const distSq = dx * dx + dy * dy
    // Higher = better. Priority dominates (5 - pri yields biggest bonus for pri=1).
    // Skill adds ~1 unit per level; distance penalty grows with sqrt.
    const skillBonus = d.kind === 'chop' ? construct : mine
    const score = (5 - pri) * 5 + skillBonus - Math.sqrt(distSq) * 0.1
    if (best === null || score > best.score) {
      best = { key, tx: d.tx, ty: d.ty, kind: d.kind, score }
    }
  }
  if (!best) return
  Job.kind[eid] = best.kind === 'chop' ? JobKind.Chop : JobKind.Mine
  Job.targetEid[eid] = best.key
  Job.state[eid] = JobState.Moving
  Job.progress[eid] = 0
  hooks.requestPath(eid, fromX, fromY, best.tx, best.ty)
}

function hasSkill(sim: SimWorld, eid: number): boolean {
  return hasComponent(sim.ecs, Skills, eid)
}

function progressJob(sim: SimWorld, eid: number): void {
  const key = Job.targetEid[eid]!
  const designation = sim.designations.get(key)
  if (!designation) {
    clearJob(eid)
    return
  }
  const arrived = TilePos.tx[eid] === designation.tx && TilePos.ty[eid] === designation.ty
  if (!arrived) {
    Job.state[eid] = JobState.Moving
    return
  }
  Job.state[eid] = JobState.Working
  Job.progress[eid] = (Job.progress[eid] ?? 0) + 1
  const need = designation.kind === 'chop' ? WORK_TICKS_CHOP : WORK_TICKS_MINE
  if (Job.progress[eid]! < need) return

  // Work done. Convert tile, award skill XP (capped at 20), produce material, drop an event.
  const i = designation.ty * sim.map.width + designation.tx
  sim.map.terrain[i] = designation.kind === 'chop' ? Terrain.Grass : Terrain.Dirt
  sim.map.cost[i] = designation.kind === 'chop' ? 10 : 12
  sim.designations.delete(key)
  if (hasComponent(sim.ecs, Skills, eid)) {
    if (designation.kind === 'chop' && (Skills.construct[eid] ?? 0) < 20) Skills.construct[eid]!++
    if (designation.kind === 'mine' && (Skills.mine[eid] ?? 0) < 20) Skills.mine[eid]!++
  }
  const dropKind: ItemKind = designation.kind === 'chop' ? ItemKind.Wood : ItemKind.Stone
  const dropQty = 2
  const tileKey = designation.ty * sim.map.width + designation.tx
  if (sim.stockpiles.has(tileKey)) {
    // Dropped straight into the colony pool when the chop/mine tile happens to be a stockpile.
    if (dropKind === ItemKind.Wood) sim.resources.wood += dropQty
    else sim.resources.stone += dropQty
  } else {
    dropItem(sim, dropKind, designation.tx, designation.ty, dropQty)
  }
  sound.play(designation.kind === 'chop' ? 'chop_wood' : 'mine_stone')
  sim.events.push(
    `${designation.kind === 'chop' ? 'Chopped (+2 wood)' : 'Mined (+2 stone)'} at (${designation.tx},${designation.ty}).`,
  )
  clearJob(eid)
}

function clearJob(eid: number): void {
  Job.kind[eid] = JobKind.None
  Job.state[eid] = JobState.Seeking
  Job.progress[eid] = 0
  Job.targetEid[eid] = 0
}

function isAlreadyTargeted(sim: SimWorld, key: number, ignoreEid: number): boolean {
  const eids = wardenQuery(sim.ecs)
  for (let i = 0; i < eids.length; i++) {
    const eid = eids[i]!
    if (eid === ignoreEid) continue
    if (!hasComponent(sim.ecs, Job, eid)) continue
    if (Job.kind[eid] === JobKind.None) continue
    if (Job.targetEid[eid] === key) return true
  }
  return false
}
