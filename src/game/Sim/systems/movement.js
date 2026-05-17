import { defineQuery } from 'bitecs';
import { Position, PositionPrev } from '../components';
const posQuery = defineQuery([Position, PositionPrev]);
export function system_position_prev(sim) {
    const eids = posQuery(sim.ecs);
    for (let i = 0; i < eids.length; i++) {
        const e = eids[i];
        PositionPrev.x[e] = Position.x[e];
        PositionPrev.y[e] = Position.y[e];
    }
}
