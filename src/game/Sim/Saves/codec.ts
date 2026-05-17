import { defineQuery, hasComponent } from 'bitecs'
import {
  Bond,
  Critter,
  Faction as FactionComp,
  Health,
  Needs,
  Pawn,
  Position,
  Renderable,
  TilePos,
} from '../components'
import { createSimWorld, spawnWarden, type SimWorld } from '../world'
import { SAVE_VERSION, type EntitySnapshot, type SaveDoc } from './schema'
import { migrateToCurrent } from './migrations'
import { spawnCritter } from '../Critters/spawn'

const allQuery = defineQuery([Position, TilePos, FactionComp])

export function serialize(sim: SimWorld): SaveDoc {
  const entities: EntitySnapshot[] = []
  const eids = allQuery(sim.ecs)
  for (let i = 0; i < eids.length; i++) {
    const eid = eids[i]!
    const snap: EntitySnapshot = {
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
    void Pawn
    entities.push(snap)
  }
  return {
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
    if (e.critter) {
      newEid = spawnCritter(sim, e.critter.speciesId, e.tile.tx, e.tile.ty, { level: e.critter.level })
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
    if (!hasComponent(sim.ecs, Bond, me)) continue
    Bond.partnerEid[me] = partner
    Bond.level[me] = e.bond.level
  }
  for (const d of doc.designations) {
    const key = d.ty * sim.map.width + d.tx
    sim.designations.set(key, d)
  }
  sim.events = [...doc.events]
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
