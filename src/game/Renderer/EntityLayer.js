import { Container, Graphics } from 'pixi.js';
import { TILE_SIZE } from '@/shared/constants';
import { Position, Renderable } from '../Sim/components';
import { defineQuery } from 'bitecs';
const visibleQuery = defineQuery([Position, Renderable]);
export class EntityLayer {
    container;
    sprites = new Map();
    constructor(_sim) {
        this.container = new Container();
        this.container.label = 'entities';
    }
    update(sim) {
        const eids = visibleQuery(sim.ecs);
        const seen = new Set();
        for (let i = 0; i < eids.length; i++) {
            const eid = eids[i];
            seen.add(eid);
            let g = this.sprites.get(eid);
            if (!g) {
                g = new Graphics();
                g.circle(0, 0, 8).fill(Renderable.tint[eid] ?? 0xffffff);
                this.container.addChild(g);
                this.sprites.set(eid, g);
            }
            g.position.set(Position.x[eid] * TILE_SIZE + TILE_SIZE / 2, Position.y[eid] * TILE_SIZE + TILE_SIZE / 2);
        }
        for (const [eid, g] of this.sprites) {
            if (!seen.has(eid)) {
                g.destroy();
                this.sprites.delete(eid);
            }
        }
    }
}
