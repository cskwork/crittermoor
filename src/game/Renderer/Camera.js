export class Camera {
    viewport;
    host;
    zoom = 1;
    dragging = false;
    dragStartX = 0;
    dragStartY = 0;
    viewportStartX = 0;
    viewportStartY = 0;
    minZoom;
    maxZoom;
    zoomStep;
    constructor(viewport, host, opts = {}) {
        this.viewport = viewport;
        this.host = host;
        this.minZoom = opts.minZoom ?? 0.5;
        this.maxZoom = opts.maxZoom ?? 3;
        this.zoomStep = opts.zoomStep ?? 1.15;
        this.bind();
    }
    dispose() {
        this.host.removeEventListener('pointerdown', this.onDown);
        this.host.removeEventListener('pointermove', this.onMove);
        this.host.removeEventListener('pointerup', this.onUp);
        this.host.removeEventListener('pointercancel', this.onUp);
        this.host.removeEventListener('wheel', this.onWheel);
    }
    centerOn(x, y) {
        this.viewport.position.set(this.host.clientWidth / 2 - x * this.zoom, this.host.clientHeight / 2 - y * this.zoom);
        this.viewport.scale.set(this.zoom);
    }
    screenToWorld(sx, sy) {
        return {
            x: (sx - this.viewport.position.x) / this.zoom,
            y: (sy - this.viewport.position.y) / this.zoom,
        };
    }
    bind() {
        this.host.addEventListener('pointerdown', this.onDown);
        this.host.addEventListener('pointermove', this.onMove);
        this.host.addEventListener('pointerup', this.onUp);
        this.host.addEventListener('pointercancel', this.onUp);
        this.host.addEventListener('wheel', this.onWheel, { passive: false });
    }
    onDown = (e) => {
        if (e.button !== 1 && e.button !== 2 && !(e.button === 0 && e.shiftKey))
            return;
        this.dragging = true;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.viewportStartX = this.viewport.position.x;
        this.viewportStartY = this.viewport.position.y;
        this.host.setPointerCapture(e.pointerId);
    };
    onMove = (e) => {
        if (!this.dragging)
            return;
        this.viewport.position.set(this.viewportStartX + (e.clientX - this.dragStartX), this.viewportStartY + (e.clientY - this.dragStartY));
    };
    onUp = (e) => {
        if (!this.dragging)
            return;
        this.dragging = false;
        if (this.host.hasPointerCapture(e.pointerId))
            this.host.releasePointerCapture(e.pointerId);
    };
    onWheel = (e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? this.zoomStep : 1 / this.zoomStep;
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * factor));
        if (newZoom === this.zoom)
            return;
        const rect = this.host.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const wx = (px - this.viewport.position.x) / this.zoom;
        const wy = (py - this.viewport.position.y) / this.zoom;
        this.zoom = newZoom;
        this.viewport.scale.set(this.zoom);
        this.viewport.position.set(px - wx * this.zoom, py - wy * this.zoom);
    };
}
