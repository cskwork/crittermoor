import { defineQuery } from 'bitecs'
import {
  Bond,
  Critter,
  Faction as FactionComp,
  Health,
  TilePos,
} from '../components'
import { Faction } from '@/shared/constants'
import { addComponent } from 'bitecs'
import type { SimWorld } from '../world'

const critterQuery = defineQuery([Critter, FactionComp, TilePos, Health])

export interface TameResult {
  ok: boolean
  reason: 'no_target' | 'too_far' | 'not_weakened' | 'roll_failed' | 'success'
  critterEid?: number
}

const TAME_RANGE_TILES = 3
const TAME_HP_THRESHOLD = 0.5

export function tryTame(sim: SimWorld, wardenEid: number, tx: number, ty: number): TameResult {
  const target = findTameTarget(sim, tx, ty)
  if (target < 0) return { ok: false, reason: 'no_target' }
  const wx = TilePos.tx[wardenEid] ?? 0
  const wy = TilePos.ty[wardenEid] ?? 0
  const dx = TilePos.tx[target]! - wx
  const dy = TilePos.ty[target]! - wy
  if (dx * dx + dy * dy > TAME_RANGE_TILES * TAME_RANGE_TILES) {
    return { ok: false, reason: 'too_far' }
  }
  const hp = Health.hp[target] ?? 0
  const maxHp = Health.maxHp[target] ?? 1
  if (hp / maxHp > TAME_HP_THRESHOLD) {
    return { ok: false, reason: 'not_weakened', critterEid: target }
  }
  // Base 35% + (1 - hp%) bonus up to 60% + level scaling
  const hpRatio = hp / Math.max(1, maxHp)
  const chance = 0.35 + (1 - hpRatio) * 0.5
  if (!sim.rng.chance(chance)) return { ok: false, reason: 'roll_failed', critterEid: target }

  FactionComp.id[target] = Faction.Player
  addComponent(sim.ecs, Bond, target)
  Bond.partnerEid[target] = wardenEid
  Bond.level[target] = 20
  sim.events.push(`Tamed a wild ${critterName(target)}!`)
  return { ok: true, reason: 'success', critterEid: target }
}

function findTameTarget(sim: SimWorld, tx: number, ty: number): number {
  const eids = critterQuery(sim.ecs)
  for (let i = 0; i < eids.length; i++) {
    const eid = eids[i]!
    if (FactionComp.id[eid] !== Faction.Wild) continue
    if (TilePos.tx[eid] === tx && TilePos.ty[eid] === ty) return eid
  }
  return -1
}

function critterName(eid: number): string {
  const id = Critter.speciesId[eid] ?? 0
  return `creature #${id}`
}
