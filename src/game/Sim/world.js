import { addComponent, addEntity, createWorld } from 'bitecs';
import { createRng } from '@/shared/rng';
import { MAP_DEFAULT_H, MAP_DEFAULT_W, Terrain } from '@/shared/constants';
import { Faction as FactionComp, HasPath, Health, Needs, Pawn, Position, PositionPrev, Renderable, Skills, TilePos } from './components';
import { Faction } from '@/shared/constants';
import { PathStorage } from './Pathing/PathStorage';
export function createSimWorld(seed) {
    const ecs = createWorld();
    // bitecs 0.9 needs an entity 0 sentinel to play nicely with addEntity returns starting at 1.
    addEntity(ecs);
    const map = {
        width: MAP_DEFAULT_W,
        height: MAP_DEFAULT_H,
        terrain: new Uint8Array(MAP_DEFAULT_W * MAP_DEFAULT_H).fill(Terrain.Grass),
        cost: new Uint16Array(MAP_DEFAULT_W * MAP_DEFAULT_H).fill(10),
    };
    return {
        ecs,
        rng: createRng(seed),
        seed,
        tick: 0,
        map,
        paths: new PathStorage(),
        designations: new Map(),
        events: [],
    };
}
export function designationKey(tx, ty, width) {
    return ty * width + tx;
}
export function destroyWorld(sim) {
    // bitecs worlds are plain objects; we just drop references.
    // Caller is responsible for clearing externally-held maps.
    ;
    sim.ecs = null;
}
export function spawnWarden(sim, tx, ty, tint = 0xe8ece8) {
    const eid = addEntity(sim.ecs);
    addComponent(sim.ecs, Position, eid);
    addComponent(sim.ecs, PositionPrev, eid);
    addComponent(sim.ecs, TilePos, eid);
    addComponent(sim.ecs, Renderable, eid);
    addComponent(sim.ecs, Pawn, eid);
    addComponent(sim.ecs, Needs, eid);
    addComponent(sim.ecs, Skills, eid);
    addComponent(sim.ecs, Health, eid);
    addComponent(sim.ecs, FactionComp, eid);
    addComponent(sim.ecs, HasPath, eid);
    HasPath.cursor[eid] = 0;
    Position.x[eid] = tx;
    Position.y[eid] = ty;
    PositionPrev.x[eid] = tx;
    PositionPrev.y[eid] = ty;
    TilePos.tx[eid] = tx;
    TilePos.ty[eid] = ty;
    Renderable.spriteId[eid] = 0;
    Renderable.layer[eid] = 2;
    Renderable.tint[eid] = tint;
    Needs.food[eid] = 80;
    Needs.rest[eid] = 80;
    Needs.joy[eid] = 70;
    Needs.warmth[eid] = 70;
    Health.hp[eid] = 80;
    Health.maxHp[eid] = 80;
    FactionComp.id[eid] = Faction.Player;
    return eid;
}
