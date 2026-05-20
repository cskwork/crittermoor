import { addComponent, addEntity, defineQuery } from 'bitecs'
import { Item, Position, PositionPrev, Renderable, TilePos } from '../components'
import type { SimWorld } from '../world'
import { ITEM_DEFS, ItemKind } from './defs'

const itemQuery = defineQuery([Item, TilePos])

// Spawn (or merge into existing pile) an item stack at the given tile.
// Returns the eid of the resulting stack.
export function dropItem(sim: SimWorld, kind: ItemKind, tx: number, ty: number, qty: number): number {
  const def = ITEM_DEFS[kind]
  if (qty <= 0) return -1
  const existing = findItemAt(sim, tx, ty, kind)
  if (existing !== -1) {
    const have = Item.qty[existing] ?? 0
    const cap = def.maxStack
    const space = Math.max(0, cap - have)
    const merged = Math.min(qty, space)
    Item.qty[existing] = have + merged
    const remainder = qty - merged
    if (remainder > 0) return spawnNewStack(sim, kind, tx, ty, remainder)
    return existing
  }
  return spawnNewStack(sim, kind, tx, ty, Math.min(qty, def.maxStack))
}

function spawnNewStack(sim: SimWorld, kind: ItemKind, tx: number, ty: number, qty: number): number {
  const def = ITEM_DEFS[kind]
  const eid = addEntity(sim.ecs)
  addComponent(sim.ecs, Position, eid)
  addComponent(sim.ecs, PositionPrev, eid)
  addComponent(sim.ecs, TilePos, eid)
  addComponent(sim.ecs, Renderable, eid)
  addComponent(sim.ecs, Item, eid)
  Position.x[eid] = tx
  Position.y[eid] = ty
  PositionPrev.x[eid] = tx
  PositionPrev.y[eid] = ty
  TilePos.tx[eid] = tx
  TilePos.ty[eid] = ty
  Renderable.spriteId[eid] = 1000 + kind
  Renderable.layer[eid] = 1 // below pawns
  Renderable.tint[eid] = def.color
  Item.kind[eid] = kind
  Item.qty[eid] = qty
  Item.reservedBy[eid] = 0
  return eid
}

export function findItemAt(sim: SimWorld, tx: number, ty: number, kind?: ItemKind): number {
  const eids = itemQuery(sim.ecs)
  for (let i = 0; i < eids.length; i++) {
    const eid = eids[i]!
    if (TilePos.tx[eid] !== tx || TilePos.ty[eid] !== ty) continue
    if (kind !== undefined && Item.kind[eid] !== kind) continue
    return eid
  }
  return -1
}

export function listLooseItems(sim: SimWorld): number[] {
  const eids = itemQuery(sim.ecs)
  const out: number[] = []
  for (let i = 0; i < eids.length; i++) {
    const eid = eids[i]!
    const key = TilePos.ty[eid]! * sim.map.width + TilePos.tx[eid]!
    if (sim.stockpiles.has(key)) continue
    if (Item.qty[eid]! <= 0) continue
    out.push(eid)
  }
  return out
}
