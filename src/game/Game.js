import { Renderer } from './Renderer/Renderer';
import { createSimWorld, destroyWorld } from './Sim/world';
import { TickScheduler } from './Sim/TickScheduler';
import { useUiStore } from '@/app/stores/uiStore';
import { generateWorld } from './Sim/Gen/worldGen';
import { createPathClient } from './Sim/Pathing/PathClient';
import { defineQuery } from 'bitecs';
import { Faction as FactionComp, Position, TilePos } from './Sim/components';
import { Faction, Terrain } from '@/shared/constants';
import { makeRunTick } from './Sim/tick';
const playerQuery = defineQuery([FactionComp, TilePos, Position]);
export class Game {
    renderer;
    scheduler = null;
    sim = null;
    pathClient = null;
    booted = false;
    constructor(host) {
        this.renderer = new Renderer(host);
    }
    async boot() {
        if (this.booted)
            return;
        await this.renderer.init();
        this.booted = true;
    }
    newGame(seed) {
        if (!this.booted)
            throw new Error('Game.boot() must complete before newGame()');
        this.dispose(false);
        const sim = createSimWorld(seed);
        generateWorld(sim);
        this.sim = sim;
        this.pathClient = createPathClient();
        this.renderer.attachWorld(sim);
        this.renderer.setClickHandler((tx, ty, button, shift) => this.handleTileClick(tx, ty, button, shift));
        const tick = makeRunTick({
            jobs: {
                requestPath: (eid, fromX, fromY, toX, toY) => this.requestPath(eid, fromX, fromY, toX, toY),
            },
        });
        this.scheduler = new TickScheduler(sim, () => this.renderer.draw(sim), tick);
        this.scheduler.start();
        useUiStore.setState({ screen: 'colony' });
        window.__crittermoorGame = { sim };
        window.__crittermoorApplyLoad = (loaded) => this.applyLoaded(loaded);
    }
    applyLoaded(loaded) {
        this.scheduler?.stop();
        this.pathClient?.dispose();
        if (this.sim)
            destroyWorld(this.sim);
        this.sim = loaded;
        this.pathClient = createPathClient();
        this.renderer.attachWorld(loaded);
        const tick = makeRunTick({
            jobs: { requestPath: (eid, fx, fy, tx2, ty2) => this.requestPath(eid, fx, fy, tx2, ty2) },
        });
        this.scheduler = new TickScheduler(loaded, () => this.renderer.draw(loaded), tick);
        this.scheduler.start();
        window.__crittermoorGame = { sim: loaded };
    }
    dispose(disposeRenderer = true) {
        this.scheduler?.stop();
        this.scheduler = null;
        this.pathClient?.dispose();
        this.pathClient = null;
        if (this.sim) {
            destroyWorld(this.sim);
            this.sim = null;
        }
        if (disposeRenderer) {
            this.renderer.setClickHandler(null);
            this.renderer.dispose();
        }
    }
    handleTileClick(tx, ty, button, shift) {
        const sim = this.sim;
        const client = this.pathClient;
        if (!sim || !client)
            return;
        if (tx < 0 || ty < 0 || tx >= sim.map.width || ty >= sim.map.height)
            return;
        if (button === 0) {
            this.toggleDesignation(sim, tx, ty);
            return;
        }
        // Right-click: move all player wardens to the clicked tile.
        const eids = playerQuery(sim.ecs);
        for (let i = 0; i < eids.length; i++) {
            const eid = eids[i];
            if (FactionComp.id[eid] !== Faction.Player)
                continue;
            this.requestPath(eid, TilePos.tx[eid], TilePos.ty[eid], tx, ty);
        }
        void shift;
    }
    requestPath(eid, fromX, fromY, toX, toY) {
        const sim = this.sim;
        const client = this.pathClient;
        if (!sim || !client)
            return;
        void client
            .request({
            width: sim.map.width,
            height: sim.map.height,
            cost: sim.map.cost,
            fromX,
            fromY,
            toX,
            toY,
        })
            .then((nodes) => {
            if (nodes && this.sim === sim) {
                sim.paths.set(eid, nodes);
            }
        })
            .catch(() => undefined);
    }
    toggleDesignation(sim, tx, ty) {
        const key = ty * sim.map.width + tx;
        if (sim.designations.has(key)) {
            sim.designations.delete(key);
            return;
        }
        const terrain = sim.map.terrain[key];
        if (terrain === Terrain.Forest) {
            sim.designations.set(key, { kind: 'chop', tx, ty });
        }
        else if (terrain === Terrain.Stone || terrain === Terrain.Mountain) {
            sim.designations.set(key, { kind: 'mine', tx, ty });
        }
        else {
            sim.events.push(`Cannot designate work on terrain at (${tx},${ty}).`);
        }
    }
}
