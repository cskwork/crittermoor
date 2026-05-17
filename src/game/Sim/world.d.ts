import { type IWorld } from 'bitecs';
import { type Rng } from '@/shared/rng';
import { PathStorage } from './Pathing/PathStorage';
export interface TileMap {
    width: number;
    height: number;
    terrain: Uint8Array;
    cost: Uint16Array;
}
export interface Designation {
    kind: 'chop' | 'mine';
    tx: number;
    ty: number;
}
export interface SimWorld {
    ecs: IWorld;
    rng: Rng;
    seed: number;
    tick: number;
    map: TileMap;
    paths: PathStorage;
    designations: Map<number, Designation>;
    events: string[];
}
export declare function createSimWorld(seed: number): SimWorld;
export declare function designationKey(tx: number, ty: number, width: number): number;
export declare function destroyWorld(sim: SimWorld): void;
export declare function spawnWarden(sim: SimWorld, tx: number, ty: number, tint?: number): number;
