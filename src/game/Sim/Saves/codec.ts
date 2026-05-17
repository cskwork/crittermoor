import { defineQuery, hasComponent } from 'bitecs'
import {
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
    void Pawn // keep import live; pawn flags currently default
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
      cost: b64encode(new Uint8Array(sim.map.cost.buffer.slice(0))),
    },
    entities,
    designations: Array.from(sim.designations.values()),
    events: sim.events.slice(-50),
  }
}

export function deserialize(doc: SaveDoc): SimWorld {
  const sim = createSimWorld(doc.seed)
  sim.map.width = doc.map.width
  sim.map.height = doc.map.height
  sim.map.terrain = b64decode(doc.map.terrain)
  const costBytes = b64decode(doc.map.cost)
  sim.map.cost = new Uint16Array(costBytes.buffer, costBytes.byteOffset, costBytes.byteLength / 2)
  sim.tick = doc.tick
  sim.rng.state = doc.rngState
  for (const e of doc.entities) {
    const eid = spawnWarden(sim, e.tile.tx, e.tile.ty, e.renderable?.tint ?? 0xffffff)
    if (e.needs) {
      Needs.food[eid] = e.needs.food
      Needs.rest[eid] = e.needs.rest
      Needs.joy[eid] = e.needs.joy
      Needs.warmth[eid] = e.needs.warmth
    }
    if (e.health) {
      Health.hp[eid] = e.health.hp
      Health.maxHp[eid] = e.health.maxHp
    }
  }
  for (const d of doc.designations) {
    const key = d.ty * sim.map.width + d.tx
    sim.designations.set(key, d)
  }
  sim.events = [...doc.events]
  return sim
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
