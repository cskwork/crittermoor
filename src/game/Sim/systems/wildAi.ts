import { defineQuery } from 'bitecs'
import type { SimWorld } from '../world'
import { Faction as FactionComp, Health, Position, TilePos, Wild } from '../components'
import { Faction } from '@/shared/constants'

const wildQuery = defineQuery([Wild, FactionComp, TilePos, Position, Health])

const WANDER_INTERVAL = 16 // ~2s at 1x
const HOME_RADIUS = 8
const COHESION_RADIUS = 6
const FLEE_HP_FRACTION = 0.3
const FLEE_DIST = 12

export function system_wild_ai(sim: SimWorld): void {
  if (sim.tick % WANDER_INTERVAL !== 0) return
  const eids = wildQuery(sim.ecs)
  // Pre-compute pack centroids by packId for cohesion bias.
  const packCentroids = computePackCentroids(eids)
  for (let i = 0; i < eids.length; i++) {
    const eid = eids[i]!
    if (FactionComp.id[eid] !== Faction.Wild && FactionComp.id[eid] !== Faction.Neutral) continue

    const hp = Health.hp[eid] ?? 0
    const maxHp = Health.maxHp[eid] ?? 1
    const fleeing = hp > 0 && hp / Math.max(1, maxHp) <= FLEE_HP_FRACTION

    const home = sim.homeAnchors.get(eid)
    const packId = Wild.packId[eid] ?? 0
    const centroid = packId > 0 ? packCentroids.get(packId) ?? null : null

    const wx = TilePos.tx[eid]!
    const wy = TilePos.ty[eid]!

    // Choose a target direction:
    //   1. If fleeing: pick a tile away from the nearest player warden (approximate via home for cheapness).
    //   2. Else if outside home radius: bias toward home.
    //   3. Else if pack centroid known and outside cohesion radius: bias toward centroid.
    //   4. Else: pure random wander.
    let biasX = 0
    let biasY = 0
    if (fleeing && home) {
      // Flee opposite of current pos relative to home (move further from home in the same direction).
      const fdx = wx - home.tx
      const fdy = wy - home.ty
      biasX = Math.sign(fdx) || ((sim.rng.int(2) * 2) - 1)
      biasY = Math.sign(fdy) || ((sim.rng.int(2) * 2) - 1)
      // Walk an extra tile when fleeing.
      void FLEE_DIST
    } else if (home && distSq(wx, wy, home.tx, home.ty) > HOME_RADIUS * HOME_RADIUS) {
      biasX = Math.sign(home.tx - wx)
      biasY = Math.sign(home.ty - wy)
    } else if (centroid && distSq(wx, wy, centroid.tx, centroid.ty) > COHESION_RADIUS * COHESION_RADIUS) {
      biasX = Math.sign(centroid.tx - wx)
      biasY = Math.sign(centroid.ty - wy)
    }

    const stepX = biasX !== 0 ? biasX : sim.rng.int(3) - 1
    const stepY = biasY !== 0 ? biasY : sim.rng.int(3) - 1
    if (stepX === 0 && stepY === 0) continue

    const nx = clamp(wx + stepX, 0, sim.map.width - 1)
    const ny = clamp(wy + stepY, 0, sim.map.height - 1)
    const tileIdx = ny * sim.map.width + nx
    if (sim.map.cost[tileIdx] === 0) continue
    // Doors are faction-aware: wild creatures bounce off them while wardens
    // walk through (door pathing cost stays passable for the A* solver).
    if (sim.factionDoorTiles.has(tileIdx)) continue

    TilePos.tx[eid] = nx
    TilePos.ty[eid] = ny
    Position.x[eid] = nx
    Position.y[eid] = ny
  }
}

function computePackCentroids(eids: number[]): Map<number, { tx: number; ty: number }> {
  const sums = new Map<number, { sx: number; sy: number; n: number }>()
  for (const eid of eids) {
    const packId = Wild.packId[eid] ?? 0
    if (packId === 0) continue
    const slot = sums.get(packId) ?? { sx: 0, sy: 0, n: 0 }
    slot.sx += TilePos.tx[eid]!
    slot.sy += TilePos.ty[eid]!
    slot.n += 1
    sums.set(packId, slot)
  }
  const out = new Map<number, { tx: number; ty: number }>()
  for (const [packId, slot] of sums) {
    out.set(packId, { tx: Math.round(slot.sx / slot.n), ty: Math.round(slot.sy / slot.n) })
  }
  return out
}

function distSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}
