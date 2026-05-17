import { Container, Graphics } from 'pixi.js';
import { TILE_SIZE, TERRAIN_COLOR } from '@/shared/constants';
export class TilemapView {
    container;
    gfx;
    lastTickRendered = -1;
    constructor(sim) {
        this.container = new Container();
        this.container.label = 'tilemap';
        this.gfx = new Graphics();
        this.container.addChild(this.gfx);
        this.render(sim);
    }
    update(sim) {
        if (sim.tick !== this.lastTickRendered) {
            this.render(sim);
            this.lastTickRendered = sim.tick;
        }
    }
    render(sim) {
        const g = this.gfx;
        g.clear();
        const { width, height, terrain } = sim.map;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const t = terrain[y * width + x];
                const color = TERRAIN_COLOR[t];
                g.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE).fill(color);
            }
        }
    }
}
