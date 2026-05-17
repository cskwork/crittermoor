import { Container } from 'pixi.js';
import type { SimWorld } from '../Sim/world';
export declare class EntityLayer {
    readonly container: Container;
    private sprites;
    constructor(_sim: SimWorld);
    update(sim: SimWorld): void;
}
