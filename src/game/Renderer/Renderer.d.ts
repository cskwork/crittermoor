import type { SimWorld } from '../Sim/world';
export type TileClickHandler = (tx: number, ty: number, button: number, shiftKey: boolean) => void;
export declare class Renderer {
    private app;
    private host;
    private viewport;
    private overlay;
    private tilemap;
    private entities;
    private resizeObserver;
    private camera;
    private clickHandler;
    private initialized;
    constructor(host: HTMLDivElement);
    init(): Promise<void>;
    setClickHandler(handler: TileClickHandler | null): void;
    attachWorld(sim: SimWorld): void;
    draw(sim: SimWorld): void;
    dispose(): void;
    private preventContext;
    private onLeftClick;
    private onRightClick;
    private dispatchTile;
    private drawDesignations;
    private handleResize;
}
