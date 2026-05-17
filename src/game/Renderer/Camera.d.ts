import type { Container } from 'pixi.js';
export interface CameraOptions {
    minZoom?: number;
    maxZoom?: number;
    zoomStep?: number;
}
export declare class Camera {
    private viewport;
    private host;
    zoom: number;
    private dragging;
    private dragStartX;
    private dragStartY;
    private viewportStartX;
    private viewportStartY;
    private readonly minZoom;
    private readonly maxZoom;
    private readonly zoomStep;
    constructor(viewport: Container, host: HTMLElement, opts?: CameraOptions);
    dispose(): void;
    centerOn(x: number, y: number): void;
    screenToWorld(sx: number, sy: number): {
        x: number;
        y: number;
    };
    private bind;
    private onDown;
    private onMove;
    private onUp;
    private onWheel;
}
