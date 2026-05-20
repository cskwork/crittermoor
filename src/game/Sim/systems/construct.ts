import { defineQuery, hasComponent } from 'bitecs'
import { Faction as FactionComp, Pawn, Skills, Structure, TilePos } from '../components'
import { Faction } from '@/shared/constants'
import type { SimWorld } from '../world'
import { STRUCTURES, type StructureKind } from '../Structures/defs'
import { applyPathCost } from '../Structures/spawn'
import { Behavior } from './behavior'
import { sound } from '@/audio/SoundManager'
import { onStructureBuilt } from '@/achievements/trigger'

const wardenQuery = defineQuery([Pawn, FactionComp, TilePos])
const blueprintQuery = defineQuery([Structure, TilePos])

const TICK_INTERVAL = 4

export interface ConstructHooks {
  requestPath: (eid: number, fromX: number, fromY: number, toX: number, toY: number) => void
}

// Builds 1 progress per TICK_INTERVAL when warden is adjacent (8-conn) to the blueprint.
// Idle wardens are also nudged to walk toward the nearest blueprint.
export function makeConstructSystem(hooks: ConstructHooks) {
  return function system_construct(sim: SimWorld): void {
    if (sim.tick % TICK_INTERVAL !== 0) return
    const blueprints = collectBlueprints(sim)
    if (blueprints.length === 0) return
    const wardens = wardenQuery(sim.ecs)
    for (let i = 0; i < wardens.length; i++) {
      const eid = wardens[i]!
      if (FactionComp.id[eid] !== Faction.Player) continue
      if (Pawn.behavior[eid] === Behavior.Sleeping || Pawn.behavior[eid] === Behavior.Eating) continue
      const wx = TilePos.tx[eid]!
      const wy = TilePos.ty[eid]!

      let best: { eid: number; tx: number; ty: number; distSq: number } | null = null
      for (const bp of blueprints) {
        const dx = bp.tx - wx
        const dy = bp.ty - wy
        const distSq = dx * dx + dy * dy
        if (!best || distSq < best.distSq) best = { ...bp, distSq }
      }
      if (!best) continue

      const adjacent = Math.abs(best.tx - wx) <= 1 && Math.abs(best.ty - wy) <= 1
      if (adjacent) {
        progressBuild(sim, best.eid, eid)
      } else if (!sim.paths.get(eid)) {
        // walk toward the blueprint's nearest non-blocking neighbor
        const target = nearestPassableNeighbor(sim, best.tx, best.ty, wx, wy)
        if (target) hooks.requestPath(eid, wx, wy, target.x, target.y)
      }
    }
  }
}

function collectBlueprints(sim: SimWorld): { eid: number; tx: number; ty: number }[] {
  const eids = blueprintQuery(sim.ecs)
  const out: { eid: number; tx: number; ty: number }[] = []
  for (let i = 0; i < eids.length; i++) {
    const eid = eids[i]!
    if (Structure.state[eid] !== 0) continue
    out.push({ eid, tx: TilePos.tx[eid] ?? 0, ty: TilePos.ty[eid] ?? 0 })
  }
  return out
}

function progressBuild(sim: SimWorld, bpEid: number, wardenEid: number): void {
  const kind = Structure.kind[bpEid] as StructureKind
  const def = STRUCTURES[kind]
  if (!def) return
  const skillBonus = hasComponent(sim.ecs, Skills, wardenEid)
    ? Math.floor((Skills.construct[wardenEid] ?? 0) / 6)
    : 0
  const tx = TilePos.tx[bpEid] ?? 0
  const ty = TilePos.ty[bpEid] ?? 0
  // Hold the last point of progress while a mobile entity stands on the tile;
  // otherwise a blocksPath structure could trap them on cost=0.
  const blocked = def.blocksPath && isMobileOnTile(sim, tx, ty, bpEid)
  const cap = blocked ? Math.max(0, def.buildTicks - 1) : Number.MAX_SAFE_INTEGER
  const next = Math.min(cap, (Structure.progress[bpEid] ?? 0) + 1 + skillBonus)
  Structure.progress[bpEid] = Math.min(65535, next)
  if (Structure.progress[bpEid]! >= def.buildTicks) {
    Structure.state[bpEid] = 1
    Structure.progress[bpEid] = 0
    applyPathCost(sim, kind, tx, ty)
    sim.blueprints.delete(ty * sim.map.width + tx)
    if (hasComponent(sim.ecs, Skills, wardenEid) && (Skills.construct[wardenEid] ?? 0) < 20) {
      Skills.construct[wardenEid]!++
    }
    sim.events.push(`Built ${def.name} at (${tx},${ty}).`)
    sound.play('build_complete')
    onStructureBuilt(kind)
  }
}

const occupantQuery = defineQuery([TilePos])

function isMobileOnTile(sim: SimWorld, tx: number, ty: number, ignoreEid: number): boolean {
  const eids = occupantQuery(sim.ecs)
  for (let i = 0; i < eids.length; i++) {
    const eid = eids[i]!
    if (eid === ignoreEid) continue
    if (hasComponent(sim.ecs, Structure, eid)) continue
    if (TilePos.tx[eid] === tx && TilePos.ty[eid] === ty) return true
  }
  return false
}

function nearestPassableNeighbor(
  sim: SimWorld,
  tx: number,
  ty: number,
  fromX: number,
  fromY: number,
): { x: number; y: number } | null {
  let best: { x: number; y: number; d: number } | null = null
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue
      const x = tx + dx
      const y = ty + dy
      if (x < 0 || y < 0 || x >= sim.map.width || y >= sim.map.height) continue
      if (sim.map.cost[y * sim.map.width + x] === 0) continue
      const ddx = x - fromX
      const ddy = y - fromY
      const d = ddx * ddx + ddy * ddy
      if (!best || d < best.d) best = { x, y, d }
    }
  }
  if (!best) return null
  return { x: best.x, y: best.y }
}
