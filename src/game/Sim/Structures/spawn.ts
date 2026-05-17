import { addComponent, addEntity } from 'bitecs'
import {
  Faction as FactionComp,
  Position,
  PositionPrev,
  Renderable,
  Structure,
  TilePos,
} from '../components'
import { Faction, TERRAIN_COST } from '@/shared/constants'
import type { SimWorld } from '../world'
import { STRUCTURES, type StructureKind } from './defs'

export function spawnBlueprint(sim: SimWorld, kind: StructureKind, tx: number, ty: number): number {
  return spawnStructure(sim, kind, tx, ty, /* complete */ false)
}

export function spawnCompleteStructure(sim: SimWorld, kind: StructureKind, tx: number, ty: number): number {
  return spawnStructure(sim, kind, tx, ty, true)
}

function spawnStructure(sim: SimWorld, kind: StructureKind, tx: number, ty: number, complete: boolean): number {
  const eid = addEntity(sim.ecs)
  addComponent(sim.ecs, Position, eid)
  addComponent(sim.ecs, PositionPrev, eid)
  addComponent(sim.ecs, TilePos, eid)
  addComponent(sim.ecs, Renderable, eid)
  addComponent(sim.ecs, Structure, eid)
  addComponent(sim.ecs, FactionComp, eid)
  Position.x[eid] = tx
  Position.y[eid] = ty
  PositionPrev.x[eid] = tx
  PositionPrev.y[eid] = ty
  TilePos.tx[eid] = tx
  TilePos.ty[eid] = ty
  Renderable.spriteId[eid] = 1000 + kind // structures get sprite ids 1000+
  Renderable.layer[eid] = 1
  Renderable.tint[eid] = 0xffffff
  Structure.kind[eid] = kind
  Structure.state[eid] = complete ? 1 : 0
  Structure.progress[eid] = complete ? 255 : 0
  Structure.facing[eid] = 0
  FactionComp.id[eid] = Faction.Player
  if (complete) applyPathCost(sim, kind, tx, ty)
  return eid
}

export function applyPathCost(sim: SimWorld, kind: StructureKind, tx: number, ty: number): void {
  const def = STRUCTURES[kind]
  if (!def) return
  const i = ty * sim.map.width + tx
  if (def.blocksPath) sim.map.cost[i] = 0
  else if (sim.map.cost[i] === 0) sim.map.cost[i] = 10 // restore passable
}

export function clearPathCost(sim: SimWorld, tx: number, ty: number, terrain: number): void {
  const i = ty * sim.map.width + tx
  const baseCost = (TERRAIN_COST as Record<number, number>)[terrain] ?? 10
  sim.map.cost[i] = baseCost
}
