import { defineQuery } from 'bitecs'
import type { SimWorld } from '../world'
import { Pawn, Position, TilePos } from '../components'

const movableQuery = defineQuery([Position, TilePos, Pawn])

// Move at most 1 tile per `STEP_INTERVAL` ticks (8 ticks ~= 1s at 1x → 1 tile/sec).
const STEP_INTERVAL = 8

export function system_path_follow(sim: SimWorld): void {
  if (sim.tick % STEP_INTERVAL !== 0) return
  const eids = movableQuery(sim.ecs)
  for (let i = 0; i < eids.length; i++) {
    const eid = eids[i]!
    const path = sim.paths.get(eid)
    if (!path) continue
    if (path.cursor >= path.nodes.length / 2) {
      sim.paths.clear(eid)
      continue
    }
    // first node is current position; advance past it
    if (path.cursor === 0) path.cursor = 1
    if (path.cursor >= path.nodes.length / 2) {
      sim.paths.clear(eid)
      continue
    }
    const nx = path.nodes[path.cursor * 2]!
    const ny = path.nodes[path.cursor * 2 + 1]!
    Position.x[eid] = nx
    Position.y[eid] = ny
    TilePos.tx[eid] = nx
    TilePos.ty[eid] = ny
    path.cursor++
  }
}
