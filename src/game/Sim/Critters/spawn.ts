import { addComponent, addEntity } from 'bitecs'
import {
  CombatStats,
  Critter,
  Faction as FactionComp,
  Health,
  Position,
  PositionPrev,
  Renderable,
  TilePos,
  Wild,
} from '../components'
import { Faction } from '@/shared/constants'
import type { SimWorld } from '../world'
import { speciesById, speciesByKey, type SpeciesDef } from './species'
import { CritterType, TYPE_COLOR } from './types'
import { applyTrait, rollTrait } from './traits'

export interface SpawnOptions {
  level?: number
  hostile?: boolean
  packId?: number
  // When provided, skips the rng-consuming trait roll. Used by the save codec
  // so deserialize re-spawns critters without burning RNG state.
  traitId?: import('./traits').TraitId
}

export function spawnCritter(
  sim: SimWorld,
  speciesId: number,
  tx: number,
  ty: number,
  opts: SpawnOptions = {},
): number {
  const species = speciesById(speciesId)
  if (!species) throw new Error(`unknown speciesId ${speciesId}`)
  const eid = addEntity(sim.ecs)
  addComponent(sim.ecs, Position, eid)
  addComponent(sim.ecs, PositionPrev, eid)
  addComponent(sim.ecs, TilePos, eid)
  addComponent(sim.ecs, Renderable, eid)
  addComponent(sim.ecs, Critter, eid)
  addComponent(sim.ecs, Health, eid)
  addComponent(sim.ecs, CombatStats, eid)
  addComponent(sim.ecs, FactionComp, eid)
  addComponent(sim.ecs, Wild, eid)
  Position.x[eid] = tx
  Position.y[eid] = ty
  PositionPrev.x[eid] = tx
  PositionPrev.y[eid] = ty
  TilePos.tx[eid] = tx
  TilePos.ty[eid] = ty
  const tintType = species.types[0] ?? CritterType.Beast
  Renderable.spriteId[eid] = species.id
  Renderable.layer[eid] = 2
  Renderable.tint[eid] = TYPE_COLOR[tintType] ?? 0xa8a8a8
  Critter.speciesId[eid] = species.id
  Critter.level[eid] = opts.level ?? 5
  Critter.xp[eid] = 0
  Critter.bond[eid] = 0
  const traitId = opts.traitId ?? rollTrait(sim.rng)
  sim.traits.set(eid, traitId)
  sim.homeAnchors.set(eid, { tx, ty })
  applyStats(sim, species, eid)
  FactionComp.id[eid] = opts.hostile === false ? Faction.Neutral : Faction.Wild
  Wild.aggression[eid] = opts.hostile === false ? 0 : 60
  Wild.packId[eid] = opts.packId ?? 0
  return eid
}

function applyStats(sim: SimWorld, species: SpeciesDef, eid: number): void {
  const lvl = Critter.level[eid] ?? 1
  const scale = 1 + (lvl - 1) * 0.04
  const s = species.baseStats
  const scaled = {
    hp: s.hp * scale,
    atk: s.atk * scale,
    def: s.def * scale,
    satk: s.satk * scale,
    sdef: s.sdef * scale,
    spd: s.spd * scale,
  }
  const trait = sim.traits.get(eid) ?? 'none'
  const tweaked = applyTrait(scaled, trait)
  Health.hp[eid] = tweaked.hp
  Health.maxHp[eid] = tweaked.hp
  CombatStats.atk[eid] = Math.min(255, tweaked.atk)
  CombatStats.def[eid] = Math.min(255, tweaked.def)
  CombatStats.satk[eid] = Math.min(255, tweaked.satk)
  CombatStats.sdef[eid] = Math.min(255, tweaked.sdef)
  CombatStats.spd[eid] = Math.min(255, tweaked.spd)
}

export function spawnPack(sim: SimWorld, speciesKey: string, tx: number, ty: number, count: number, packId: number): number[] {
  const species = speciesByKey(speciesKey)
  if (!species) return []
  const ids: number[] = []
  for (let i = 0; i < count; i++) {
    const ox = sim.rng.int(3) - 1
    const oy = sim.rng.int(3) - 1
    const sx = clamp(tx + ox, 0, sim.map.width - 1)
    const sy = clamp(ty + oy, 0, sim.map.height - 1)
    ids.push(spawnCritter(sim, species.id, sx, sy, { level: 4 + sim.rng.int(4), packId }))
  }
  return ids
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}
