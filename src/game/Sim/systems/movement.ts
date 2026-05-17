import { defineQuery } from 'bitecs'
import type { SimWorld } from '../world'
import { Position, PositionPrev } from '../components'

const posQuery = defineQuery([Position, PositionPrev])

export function system_position_prev(sim: SimWorld): void {
  const eids = posQuery(sim.ecs)
  for (let i = 0; i < eids.length; i++) {
    const e = eids[i]!
    PositionPrev.x[e] = Position.x[e]!
    PositionPrev.y[e] = Position.y[e]!
  }
}
