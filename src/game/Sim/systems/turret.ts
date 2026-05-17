import { defineQuery, hasComponent } from 'bitecs'
import {
  Faction as FactionComp,
  Health,
  Structure,
  TilePos,
  Wild,
} from '../components'
import { Faction } from '@/shared/constants'
import type { SimWorld } from '../world'
import { StructureKind } from '../Structures/defs'

const turretQuery = defineQuery([Structure, TilePos, FactionComp])
const hostileQuery = defineQuery([Health, TilePos, FactionComp])

const FIRE_INTERVAL = 8 // ~1s at 1x
const TURRET_RANGE = 6
const TURRET_DAMAGE = 3

export function system_turret(sim: SimWorld): void {
  if (sim.tick % FIRE_INTERVAL !== 0) return
  const turrets = turretQuery(sim.ecs)
  if (turrets.length === 0) return
  const hostiles = hostileQuery(sim.ecs)
  for (let i = 0; i < turrets.length; i++) {
    const tid = turrets[i]!
    if (Structure.kind[tid] !== StructureKind.Turret) continue
    if (Structure.state[tid] !== 1) continue // only complete turrets fire
    if (FactionComp.id[tid] !== Faction.Player) continue
    const tx = TilePos.tx[tid] ?? 0
    const ty = TilePos.ty[tid] ?? 0
    let bestEid = -1
    let bestDistSq = TURRET_RANGE * TURRET_RANGE + 1
    for (let j = 0; j < hostiles.length; j++) {
      const eid = hostiles[j]!
      if (FactionComp.id[eid] !== Faction.Wild) continue
      if (!hasComponent(sim.ecs, Wild, eid)) continue
      if ((Health.hp[eid] ?? 0) <= 0) continue
      const dx = (TilePos.tx[eid] ?? 0) - tx
      const dy = (TilePos.ty[eid] ?? 0) - ty
      const d = dx * dx + dy * dy
      if (d <= TURRET_RANGE * TURRET_RANGE && d < bestDistSq) {
        bestDistSq = d
        bestEid = eid
      }
    }
    if (bestEid === -1) continue
    const remaining = Math.max(0, (Health.hp[bestEid] ?? 0) - TURRET_DAMAGE)
    Health.hp[bestEid] = remaining
    sim.events.push(`Turret at (${tx},${ty}) hit a wild critter for ${TURRET_DAMAGE}.`)
    if (remaining === 0) sim.events.push('A wild critter was downed by a turret.')
  }
}
