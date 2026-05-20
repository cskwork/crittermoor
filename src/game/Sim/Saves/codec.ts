import { addComponent, defineQuery, hasComponent, removeComponent } from 'bitecs'
import {
  Bond,
  Critter,
  Faction as FactionComp,
  Health,
  Needs,
  Pawn,
  Position,
  Renderable,
  Structure,
  TilePos,
  Wild,
} from '../components'
import { Faction } from '@/shared/constants'
import { createSimWorld, spawnWarden, type SimWorld } from '../world'
import { SAVE_VERSION, SaveCorruptError, type EntityV4Snapshot, type SaveDoc } from './schema'
import { migrateToCurrent } from './migrations'
import { crc32String } from './crc32'
import { spawnCritter } from '../Critters/spawn'
import { spawnBlueprint, spawnCompleteStructure } from '../Structures/spawn'
import type { StructureKind } from '../Structures/defs'
import { getRaidState, setRaidState } from '../systems/raid'
import type { TraitId } from '../Critters/traits'
import { dropItem } from '../Items/spawn'
import type { ItemKind } from '../Items/defs'
import { Item } from '../components'

const allQuery = defineQuery([Position, TilePos, FactionComp])
const itemQuery = defineQuery([Item, TilePos])

export function serialize(sim: SimWorld): SaveDoc {
  const entities: EntityV4Snapshot[] = []
  const eids = allQuery(sim.ecs)
  for (let i = 0; i < eids.length; i++) {
    const eid = eids[i]!
    const snap: EntityV4Snapshot = {
      eid,
      pos: { x: Position.x[eid]!, y: Position.y[eid]! },
      tile: { tx: TilePos.tx[eid]!, ty: TilePos.ty[eid]! },
      faction: FactionComp.id[eid]!,
    }
    if (hasComponent(sim.ecs, Needs, eid)) {
      snap.needs = {
        food: Needs.food[eid]!,
        rest: Needs.rest[eid]!,
        joy: Needs.joy[eid]!,
        warmth: Needs.warmth[eid]!,
      }
    }
    if (hasComponent(sim.ecs, Health, eid)) {
      snap.health = { hp: Health.hp[eid]!, maxHp: Health.maxHp[eid]! }
    }
    if (hasComponent(sim.ecs, Renderable, eid)) {
      snap.renderable = {
        spriteId: Renderable.spriteId[eid]!,
        layer: Renderable.layer[eid]!,
        tint: Renderable.tint[eid]!,
      }
    }
    if (hasComponent(sim.ecs, Critter, eid)) {
      snap.critter = {
        speciesId: Critter.speciesId[eid]!,
        level: Critter.level[eid]!,
        xp: Critter.xp[eid]!,
        bond: Critter.bond[eid]!,
      }
    }
    if (hasComponent(sim.ecs, Bond, eid)) {
      snap.bond = {
        partnerEid: Bond.partnerEid[eid]!,
        level: Bond.level[eid]!,
      }
    }
    if (hasComponent(sim.ecs, Structure, eid)) {
      snap.structure = {
        kind: Structure.kind[eid]!,
        state: Structure.state[eid]!,
        progress: Structure.progress[eid]!,
      }
    }
    void Pawn
    // v4 additions: per-critter trait + home anchor.
    const trait = sim.traits.get(eid)
    if (trait && trait !== 'none') snap.trait = trait
    const home = sim.homeAnchors.get(eid)
    if (home) snap.homeAnchor = { tx: home.tx, ty: home.ty }
    entities.push(snap)
  }
  const items: { tx: number; ty: number; kind: number; qty: number }[] = []
  const itemEids = itemQuery(sim.ecs)
  for (let i = 0; i < itemEids.length; i++) {
    const eid = itemEids[i]!
    items.push({
      tx: TilePos.tx[eid] ?? 0,
      ty: TilePos.ty[eid] ?? 0,
      kind: Item.kind[eid] ?? 0,
      qty: Item.qty[eid] ?? 0,
    })
  }
  const agencyEntries: { eid: number; priorities: { chop: number; mine: number; build: number; tame: number; haul: number }; schedule: number[]; drafted: boolean }[] = []
  for (const [eid, pri] of sim.agency.priorities) {
    agencyEntries.push({
      eid,
      priorities: { ...pri },
      schedule: Array.from(sim.agency.schedules.get(eid) ?? []),
      drafted: sim.agency.drafted.has(eid),
    })
  }
  const doc: SaveDoc = {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    seed: sim.seed,
    tick: sim.tick,
    rngState: sim.rng.state,
    map: {
      width: sim.map.width,
      height: sim.map.height,
      terrain: b64encode(sim.map.terrain),
      cost: b64encode(packUint16LE(sim.map.cost)),
    },
    entities,
    designations: Array.from(sim.designations.values()),
    events: sim.events.slice(-50),
    raid: getRaidState(sim) ?? undefined,
    resources: { wood: sim.resources.wood, stone: sim.resources.stone },
    blueprintKeys: Array.from(sim.blueprints.keys()),
    agency: agencyEntries,
    stockpiles: Array.from(sim.stockpiles),
    factionDoorTiles: Array.from(sim.factionDoorTiles),
    farms: Array.from(sim.farms.entries()).map(([key, growth]) => ({ key, growth })),
    items,
    crc: 0,
  }
  doc.crc = computeCrc(doc)
  return doc
}

export function computeCrc(doc: SaveDoc): number {
  const withZero = { ...doc, crc: 0 } as SaveDoc
  return crc32String(JSON.stringify(withZero))
}

export function verifyCrc(doc: SaveDoc, slotId = '<unknown>'): void {
  // Older blobs (v1/v2 or pre-CRC v3) carry no crc. Accept them — corruption
  // detection only protects newly written blobs.
  const stored = (doc as { crc?: number }).crc
  if (stored === undefined) return
  const recomputed = computeCrc(doc)
  if (recomputed !== stored) {
    throw new SaveCorruptError(
      slotId,
      `Save blob CRC mismatch in slot '${slotId}' (stored=${stored}, recomputed=${recomputed}).`,
    )
  }
}

export function deserialize(input: SaveDoc): SimWorld {
  const doc = migrateToCurrent(input)
  const sim = createSimWorld(doc.seed)
  sim.map.width = doc.map.width
  sim.map.height = doc.map.height
  sim.map.terrain = b64decode(doc.map.terrain)
  sim.map.cost = unpackUint16LE(b64decode(doc.map.cost))
  sim.tick = doc.tick
  sim.rng.state = doc.rngState
  // Remap old eids → new eids so cross-references (Bond.partnerEid) survive.
  const eidRemap = new Map<number, number>()
  for (const e of doc.entities) {
    let newEid: number
    if (e.structure) {
      const kind = e.structure.kind as StructureKind
      newEid = e.structure.state === 1
        ? spawnCompleteStructure(sim, kind, e.tile.tx, e.tile.ty)
        : spawnBlueprint(sim, kind, e.tile.tx, e.tile.ty)
      Structure.progress[newEid] = e.structure.progress
    } else if (e.critter) {
      // Pass traitId from the save (v4) or 'none' for legacy blobs, so deserialize
      // never burns rng on a re-roll.
      const trait = ((e as { trait?: TraitId }).trait ?? 'none') as TraitId
      newEid = spawnCritter(sim, e.critter.speciesId, e.tile.tx, e.tile.ty, { level: e.critter.level, traitId: trait })
      const home = (e as { homeAnchor?: { tx: number; ty: number } }).homeAnchor
      if (home) sim.homeAnchors.set(newEid, home)
    } else {
      newEid = spawnWarden(sim, e.tile.tx, e.tile.ty, e.renderable?.tint ?? 0xffffff)
    }
    eidRemap.set(e.eid, newEid)
    if (e.needs) {
      Needs.food[newEid] = e.needs.food
      Needs.rest[newEid] = e.needs.rest
      Needs.joy[newEid] = e.needs.joy
      Needs.warmth[newEid] = e.needs.warmth
    }
    if (e.health) {
      Health.hp[newEid] = e.health.hp
      Health.maxHp[newEid] = e.health.maxHp
    }
    if (e.critter) {
      Critter.xp[newEid] = e.critter.xp
      Critter.bond[newEid] = e.critter.bond
    }
    FactionComp.id[newEid] = e.faction
  }
  // Second pass: resolve Bond cross-refs now that we have the full remap.
  for (const e of doc.entities) {
    if (!e.bond) continue
    const me = eidRemap.get(e.eid)
    const partner = eidRemap.get(e.bond.partnerEid)
    if (me === undefined || partner === undefined) continue
    if (!hasComponent(sim.ecs, Bond, me)) {
      addComponent(sim.ecs, Bond, me)
    }
    Bond.partnerEid[me] = partner
    Bond.level[me] = e.bond.level
    // A bonded critter is no longer wild.
    if (hasComponent(sim.ecs, Wild, me)) removeComponent(sim.ecs, Wild, me)
    FactionComp.id[me] = Faction.Player
  }
  for (const d of doc.designations) {
    const key = d.ty * sim.map.width + d.tx
    sim.designations.set(key, d)
  }
  sim.events = [...doc.events]
  if (doc.raid) setRaidState(sim, { nextRaidTick: doc.raid.nextRaidTick, scheduled: doc.raid.scheduled })
  if (doc.resources) sim.resources = { wood: doc.resources.wood, stone: doc.resources.stone }
  if (doc.blueprintKeys) {
    // Rebuild blueprint lookup from the entities just spawned.
    for (const e of doc.entities) {
      if (!e.structure || e.structure.state !== 0) continue
      const me = eidRemap.get(e.eid)
      if (me === undefined) continue
      const key = e.tile.ty * sim.map.width + e.tile.tx
      sim.blueprints.set(key, me)
    }
  }
  // v4 restorations: agency, stockpiles, doors, farms, items.
  const v4 = doc as { agency?: { eid: number; priorities: { chop: number; mine: number; build: number; tame: number; haul: number }; schedule: number[]; drafted: boolean }[]; stockpiles?: number[]; factionDoorTiles?: number[]; farms?: { key: number; growth: number }[]; items?: { tx: number; ty: number; kind: number; qty: number }[] }
  if (v4.agency) {
    for (const entry of v4.agency) {
      const me = eidRemap.get(entry.eid) ?? entry.eid
      sim.agency.priorities.set(me, { ...entry.priorities })
      if (entry.schedule.length === 24) sim.agency.schedules.set(me, new Uint8Array(entry.schedule))
      if (entry.drafted) sim.agency.drafted.add(me)
    }
  }
  if (v4.stockpiles) for (const k of v4.stockpiles) sim.stockpiles.add(k)
  if (v4.factionDoorTiles) for (const k of v4.factionDoorTiles) sim.factionDoorTiles.add(k)
  if (v4.farms) for (const f of v4.farms) sim.farms.set(f.key, f.growth)
  if (v4.items) for (const it of v4.items) dropItem(sim, it.kind as ItemKind, it.tx, it.ty, it.qty)
  return sim
}

function packUint16LE(values: Uint16Array): Uint8Array {
  const out = new Uint8Array(values.length * 2)
  for (let i = 0; i < values.length; i++) {
    const v = values[i]!
    out[i * 2] = v & 0xff
    out[i * 2 + 1] = (v >>> 8) & 0xff
  }
  return out
}

function unpackUint16LE(bytes: Uint8Array): Uint16Array {
  const out = new Uint16Array(bytes.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = bytes[i * 2]! | (bytes[i * 2 + 1]! << 8)
  }
  return out
}

function b64encode(bytes: Uint8Array): string {
  let s = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)))
  }
  // btoa is browser; for node-test use Buffer
  if (typeof btoa === 'function') return btoa(s)
  return Buffer.from(s, 'binary').toString('base64')
}

function b64decode(s: string): Uint8Array {
  const bin = typeof atob === 'function' ? atob(s) : Buffer.from(s, 'base64').toString('binary')
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
