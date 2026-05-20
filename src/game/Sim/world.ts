import { addComponent, addEntity, createWorld, type IWorld } from 'bitecs'
import { createRng, type Rng } from '@/shared/rng'
import { MAP_DEFAULT_H, MAP_DEFAULT_W, Terrain } from '@/shared/constants'
import { Faction as FactionComp, HasPath, Health, Needs, Pawn, Position, PositionPrev, Renderable, Skills, TilePos } from './components'
import { Faction } from '@/shared/constants'
import { PathStorage } from './Pathing/PathStorage'
import { createAgency, type AgencyState } from './agency'

export interface TileMap {
  width: number
  height: number
  terrain: Uint8Array
  cost: Uint16Array // cached pathfinding cost per tile
}

export interface Designation {
  kind: 'chop' | 'mine'
  tx: number
  ty: number
}

export interface ColonyResources {
  wood: number
  stone: number
}

export interface SimWorld {
  ecs: IWorld
  rng: Rng
  seed: number
  tick: number
  map: TileMap
  paths: PathStorage
  designations: Map<number, Designation>
  blueprints: Map<number, number> // tile-key → structure eid (state=blueprint)
  resources: ColonyResources
  events: string[]
  agency: AgencyState
  // Tile-key set of stockpile tiles. Items dropped on these tiles are
  // considered stored; loose items elsewhere become Haul targets.
  stockpiles: Set<number>
  // Per-critter trait roll (sparse: only critters get entries).
  traits: Map<number, import('./Critters/traits').TraitId>
  // Per-creature home anchor tile (for wild-AI v2 home-range behavior).
  homeAnchors: Map<number, { tx: number; ty: number }>
  // Tile-key set of door tiles. Wild AI refuses to step onto these so doors
  // block enemies but freely pass player wardens.
  factionDoorTiles: Set<number>
  // Farm plots: tileKey → growthTicks (0 = planted, GROW_TICKS = mature).
  // When ready, the warden with plant priority > 0 harvests for RawFood.
  farms: Map<number, number>
}

export function createSimWorld(seed: number): SimWorld {
  const ecs = createWorld()
  // bitecs 0.9 needs an entity 0 sentinel to play nicely with addEntity returns starting at 1.
  addEntity(ecs)
  const map: TileMap = {
    width: MAP_DEFAULT_W,
    height: MAP_DEFAULT_H,
    terrain: new Uint8Array(MAP_DEFAULT_W * MAP_DEFAULT_H).fill(Terrain.Grass),
    cost: new Uint16Array(MAP_DEFAULT_W * MAP_DEFAULT_H).fill(10),
  }
  return {
    ecs,
    rng: createRng(seed),
    seed,
    tick: 0,
    map,
    paths: new PathStorage(),
    designations: new Map(),
    blueprints: new Map(),
    resources: { wood: 30, stone: 30 },
    events: [],
    agency: createAgency(),
    stockpiles: new Set(),
    traits: new Map(),
    homeAnchors: new Map(),
    factionDoorTiles: new Set(),
    farms: new Map(),
  }
}

export function designationKey(tx: number, ty: number, width: number): number {
  return ty * width + tx
}

export function destroyWorld(sim: SimWorld): void {
  // bitecs worlds are plain objects; drop the reference so old systems can be GC'd.
  const handle = sim as unknown as { ecs: unknown }
  handle.ecs = null
}

export function spawnWarden(sim: SimWorld, tx: number, ty: number, tint = 0xe8ece8): number {
  const eid = addEntity(sim.ecs)
  addComponent(sim.ecs, Position, eid)
  addComponent(sim.ecs, PositionPrev, eid)
  addComponent(sim.ecs, TilePos, eid)
  addComponent(sim.ecs, Renderable, eid)
  addComponent(sim.ecs, Pawn, eid)
  addComponent(sim.ecs, Needs, eid)
  addComponent(sim.ecs, Skills, eid)
  addComponent(sim.ecs, Health, eid)
  addComponent(sim.ecs, FactionComp, eid)
  addComponent(sim.ecs, HasPath, eid)
  HasPath.cursor[eid] = 0
  Position.x[eid] = tx
  Position.y[eid] = ty
  PositionPrev.x[eid] = tx
  PositionPrev.y[eid] = ty
  TilePos.tx[eid] = tx
  TilePos.ty[eid] = ty
  Renderable.spriteId[eid] = 0
  Renderable.layer[eid] = 2
  Renderable.tint[eid] = tint
  Needs.food[eid] = 80
  Needs.rest[eid] = 80
  Needs.joy[eid] = 70
  Needs.warmth[eid] = 70
  Health.hp[eid] = 80
  Health.maxHp[eid] = 80
  FactionComp.id[eid] = Faction.Player
  return eid
}
