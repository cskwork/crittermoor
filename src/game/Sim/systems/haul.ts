import { addComponent, defineQuery, hasComponent, removeComponent, removeEntity } from 'bitecs'
import type { SimWorld } from '../world'
import { Carry, Faction as FactionComp, Item, Job, Pawn, TilePos } from '../components'
import { Faction } from '@/shared/constants'
import { Behavior } from './behavior'
import { JobKind, JobState } from './jobs'
import { ITEM_DEFS, ItemKind } from '../Items/defs'
import { dropItem, listLooseItems } from '../Items/spawn'
import { getPriorities, isDrafted } from '../agency'
import { sound } from '@/audio/SoundManager'

const wardenQuery = defineQuery([Pawn, FactionComp, TilePos])

const ASSIGN_INTERVAL = 6

export interface HaulHooks {
  requestPath: (eid: number, fromX: number, fromY: number, toX: number, toY: number) => void
}

export function makeHaulSystem(hooks: HaulHooks) {
  return function system_haul(sim: SimWorld): void {
    if (sim.tick % ASSIGN_INTERVAL !== 0) return
    const eids = wardenQuery(sim.ecs)
    for (let i = 0; i < eids.length; i++) {
      const eid = eids[i]!
      if (FactionComp.id[eid] !== Faction.Player) continue
      if (Pawn.behavior[eid] === Behavior.Sleeping || Pawn.behavior[eid] === Behavior.Eating) continue
      if (isDrafted(sim.agency, eid)) continue
      if (getPriorities(sim.agency, eid).haul <= 0) continue

      // Mid-haul: already carrying — keep walking to dest.
      if (hasComponent(sim.ecs, Carry, eid)) {
        progressCarry(sim, eid)
        continue
      }
      // Only assign a haul if the warden is idle (no active chop/mine/build job).
      if (hasComponent(sim.ecs, Job, eid) && Job.kind[eid] !== JobKind.None) continue

      assignHaul(sim, eid, hooks)
    }
  }
}

function assignHaul(sim: SimWorld, eid: number, hooks: HaulHooks): void {
  const items = listLooseItems(sim)
  if (items.length === 0) return
  if (sim.stockpiles.size === 0) return

  const wx = TilePos.tx[eid]!
  const wy = TilePos.ty[eid]!
  // Pick the nearest unreserved loose item.
  let bestItem = -1
  let bestDist = Infinity
  for (const itemEid of items) {
    if ((Item.reservedBy[itemEid] ?? 0) !== 0) continue
    const dx = TilePos.tx[itemEid]! - wx
    const dy = TilePos.ty[itemEid]! - wy
    const dist = dx * dx + dy * dy
    if (dist < bestDist) {
      bestDist = dist
      bestItem = itemEid
    }
  }
  if (bestItem === -1) return
  Item.reservedBy[bestItem] = eid
  if (!hasComponent(sim.ecs, Job, eid)) addComponent(sim.ecs, Job, eid)
  Job.kind[eid] = JobKind.Haul
  Job.state[eid] = JobState.Moving
  Job.targetEid[eid] = bestItem
  hooks.requestPath(eid, wx, wy, TilePos.tx[bestItem]!, TilePos.ty[bestItem]!)
}

export function tryPickup(sim: SimWorld, wardenEid: number, itemEid: number): boolean {
  if (!hasComponent(sim.ecs, Item, itemEid)) return false
  // Warden must be on the item tile.
  if (TilePos.tx[wardenEid] !== TilePos.tx[itemEid] || TilePos.ty[wardenEid] !== TilePos.ty[itemEid]) return false
  // Find nearest stockpile tile.
  const dest = nearestStockpileTile(sim, TilePos.tx[wardenEid]!, TilePos.ty[wardenEid]!)
  if (!dest) return false
  const kind = Item.kind[itemEid] as ItemKind
  const qty = Item.qty[itemEid] ?? 0
  if (qty <= 0) return false
  if (!hasComponent(sim.ecs, Carry, wardenEid)) addComponent(sim.ecs, Carry, wardenEid)
  Carry.kind[wardenEid] = kind
  Carry.qty[wardenEid] = qty
  Carry.destX[wardenEid] = dest.tx
  Carry.destY[wardenEid] = dest.ty
  Carry.sourceEid[wardenEid] = itemEid
  removeEntity(sim.ecs, itemEid)
  Job.kind[wardenEid] = JobKind.HaulCarrying
  Job.state[wardenEid] = JobState.Moving
  Job.targetEid[wardenEid] = 0
  return true
}

function progressCarry(sim: SimWorld, eid: number): void {
  const dx = Carry.destX[eid]!
  const dy = Carry.destY[eid]!
  const arrived = TilePos.tx[eid] === dx && TilePos.ty[eid] === dy
  if (!arrived) return
  const kind = Carry.kind[eid] as ItemKind
  const qty = Carry.qty[eid] ?? 0
  // Drop into pool if this kind has a pool mapping; otherwise leave a stack on the stockpile tile.
  const def = ITEM_DEFS[kind]
  if (def.poolsAsResource === 'wood') sim.resources.wood += qty
  else if (def.poolsAsResource === 'stone') sim.resources.stone += qty
  else dropItem(sim, kind, dx, dy, qty)
  removeComponent(sim.ecs, Carry, eid)
  Job.kind[eid] = JobKind.None
  Job.state[eid] = JobState.Seeking
  Job.progress[eid] = 0
  Job.targetEid[eid] = 0
  sim.events.push(`Hauled ${qty} ${def.name.toLowerCase()} to stockpile.`)
  sound.play('ui_click')
}

function nearestStockpileTile(sim: SimWorld, fromX: number, fromY: number): { tx: number; ty: number } | null {
  let best: { tx: number; ty: number; d: number } | null = null
  for (const key of sim.stockpiles) {
    const tx = key % sim.map.width
    const ty = Math.floor(key / sim.map.width)
    const dx = tx - fromX
    const dy = ty - fromY
    const d = dx * dx + dy * dy
    if (!best || d < best.d) best = { tx, ty, d }
  }
  return best ? { tx: best.tx, ty: best.ty } : null
}
