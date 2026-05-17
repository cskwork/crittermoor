import type { SimWorld } from './world';
export type DrawFn = () => void;
export type TickFn = (sim: SimWorld) => void;
export declare class TickScheduler {
    private sim;
    private draw;
    private tick;
    private running;
    private accum;
    private lastTime;
    private rafId;
    constructor(sim: SimWorld, draw: DrawFn, tick: TickFn);
    start(): void;
    stop(): void;
    private tickLoop;
}
