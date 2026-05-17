import { Container } from 'pixi.js';
import type { SimWorld } from '../Sim/world';
export declare class TilemapView {
    readonly container: Container;
    private gfx;
    private lastTickRendered;
    constructor(sim: SimWorld);
    update(sim: SimWorld): void;
    private render;
}
