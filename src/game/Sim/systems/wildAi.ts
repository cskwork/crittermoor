import { defineQuery } from 'bitecs'
import type { SimWorld } from '../world'
import { Faction as FactionComp, Position, TilePos, Wild } from '../components'
import { Faction } from '@/shared/constants'

const wildQuery = defineQuery([Wild, FactionComp, TilePos, Position])

const WANDER_INTERVAL = 16 // wander step roughly every 2s at 1x
const WANDER_RADIUS = 4

export function system_wild_ai(sim: SimWorld): void {
  if (sim.tick % WANDER_INTERVAL !== 0) return
  const eids = wildQuery(sim.ecs)
  for (let i = 0; i < eids.length; i++) {
    const eid = eids[i]!
    if (FactionComp.id[eid] !== Faction.Wild && FactionComp.id[eid] !== Faction.Neutral) continue
    const dx = sim.rng.int(3) - 1
    const dy = sim.rng.int(3) - 1
    if (dx === 0 && dy === 0) continue
    const nx = clamp(TilePos.tx[eid]! + dx, 0, sim.map.width - 1)
    const ny = clamp(TilePos.ty[eid]! + dy, 0, sim.map.height - 1)
    const tileIdx = ny * sim.map.width + nx
    if (sim.map.cost[tileIdx] === 0) continue
    // Limit roam to within wander radius of the spawn-pack home (packId is currently unused as anchor;
    // we approximate "home" as current position + small drift).
    void WANDER_RADIUS
    TilePos.tx[eid] = nx
    TilePos.ty[eid] = ny
    Position.x[eid] = nx
    Position.y[eid] = ny
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}
