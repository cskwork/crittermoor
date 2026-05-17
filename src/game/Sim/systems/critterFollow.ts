import { defineQuery } from 'bitecs'
import { Bond, Critter, Faction as FactionComp, Position, TilePos } from '../components'
import { Faction } from '@/shared/constants'
import type { SimWorld } from '../world'

const bondedQuery = defineQuery([Critter, Bond, FactionComp, TilePos, Position])

const FOLLOW_INTERVAL = 12 // ~1.5s at 1x
const LOITER_RADIUS = 3

export function system_critter_follow(sim: SimWorld): void {
  if (sim.tick % FOLLOW_INTERVAL !== 0) return
  const eids = bondedQuery(sim.ecs)
  for (let i = 0; i < eids.length; i++) {
    const eid = eids[i]!
    if (FactionComp.id[eid] !== Faction.Player) continue
    const partnerEid = Bond.partnerEid[eid] ?? 0
    if (partnerEid === 0) continue
    const px = TilePos.tx[partnerEid] ?? 0
    const py = TilePos.ty[partnerEid] ?? 0
    const cx = TilePos.tx[eid] ?? 0
    const cy = TilePos.ty[eid] ?? 0
    const dx = px - cx
    const dy = py - cy
    // If far, step toward partner; if close, wander within loiter radius.
    let nx = cx
    let ny = cy
    if (Math.abs(dx) > LOITER_RADIUS || Math.abs(dy) > LOITER_RADIUS) {
      nx = cx + Math.sign(dx)
      ny = cy + Math.sign(dy)
    } else {
      nx = cx + (sim.rng.int(3) - 1)
      ny = cy + (sim.rng.int(3) - 1)
    }
    nx = clamp(nx, 0, sim.map.width - 1)
    ny = clamp(ny, 0, sim.map.height - 1)
    const tile = ny * sim.map.width + nx
    if (sim.map.cost[tile] === 0) continue
    TilePos.tx[eid] = nx
    TilePos.ty[eid] = ny
    Position.x[eid] = nx
    Position.y[eid] = ny
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}
