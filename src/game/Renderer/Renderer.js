import { Application, Container, Graphics } from 'pixi.js';
import { TilemapView } from './TilemapView';
import { EntityLayer } from './EntityLayer';
import { Camera } from './Camera';
import { TILE_SIZE } from '@/shared/constants';
export class Renderer {
    app;
    host;
    viewport;
    overlay;
    tilemap = null;
    entities = null;
    resizeObserver;
    camera = null;
    clickHandler = null;
    initialized = false;
    constructor(host) {
        this.host = host;
        this.app = new Application();
        this.viewport = new Container();
        this.viewport.label = 'viewport';
        this.overlay = new Graphics();
        this.overlay.label = 'overlay';
        this.resizeObserver = new ResizeObserver(() => this.handleResize());
    }
    async init() {
        if (this.initialized)
            return;
        await this.app.init({
            background: 0x14191e,
            antialias: false,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
            resizeTo: this.host,
            preference: 'webgl',
        });
        this.host.appendChild(this.app.canvas);
        this.app.stage.addChild(this.viewport);
        this.viewport.addChild(this.overlay);
        this.host.addEventListener('contextmenu', this.preventContext);
        this.host.addEventListener('click', this.onLeftClick);
        this.host.addEventListener('contextmenu', this.onRightClick);
        this.resizeObserver.observe(this.host);
        this.initialized = true;
    }
    setClickHandler(handler) {
        this.clickHandler = handler;
    }
    attachWorld(sim) {
        while (this.viewport.children.length > 0) {
            const c = this.viewport.children[0];
            if (c === this.overlay) {
                this.viewport.removeChildAt(0);
                continue;
            }
            this.viewport.removeChild(c);
        }
        this.tilemap = new TilemapView(sim);
        this.entities = new EntityLayer(sim);
        this.viewport.addChild(this.tilemap.container);
        this.viewport.addChild(this.entities.container);
        this.viewport.addChild(this.overlay);
        this.camera?.dispose();
        this.camera = new Camera(this.viewport, this.host);
        this.camera.centerOn((sim.map.width * TILE_SIZE) / 2, (sim.map.height * TILE_SIZE) / 2);
    }
    draw(sim) {
        this.tilemap?.update(sim);
        this.entities?.update(sim);
        this.drawDesignations(sim);
    }
    dispose() {
        this.resizeObserver.disconnect();
        this.host.removeEventListener('contextmenu', this.preventContext);
        this.host.removeEventListener('click', this.onLeftClick);
        this.host.removeEventListener('contextmenu', this.onRightClick);
        this.camera?.dispose();
        this.camera = null;
        this.tilemap = null;
        this.entities = null;
        if (this.initialized) {
            this.app.destroy(true, { children: true });
            this.initialized = false;
        }
    }
    preventContext = (e) => {
        e.preventDefault();
    };
    onLeftClick = (e) => {
        if (e.button !== 0 || e.shiftKey)
            return;
        this.dispatchTile(e, 0);
    };
    onRightClick = (e) => {
        e.preventDefault();
        this.dispatchTile(e, 2);
    };
    dispatchTile(e, button) {
        if (!this.camera || !this.clickHandler)
            return;
        const rect = this.host.getBoundingClientRect();
        const w = this.camera.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
        const tx = Math.floor(w.x / TILE_SIZE);
        const ty = Math.floor(w.y / TILE_SIZE);
        this.clickHandler(tx, ty, button, e.shiftKey);
    }
    drawDesignations(sim) {
        const g = this.overlay;
        g.clear();
        for (const d of sim.designations.values()) {
            const px = d.tx * TILE_SIZE;
            const py = d.ty * TILE_SIZE;
            const color = d.kind === 'chop' ? 0xe07a5f : 0xf0c674;
            g.rect(px, py, TILE_SIZE, TILE_SIZE).stroke({ color, width: 2 });
        }
    }
    handleResize() {
        if (!this.initialized)
            return;
        this.app.renderer.resize(this.host.clientWidth, this.host.clientHeight);
    }
}
