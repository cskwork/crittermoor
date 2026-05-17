export declare const SAVE_VERSION = 1;
export interface EntitySnapshot {
    eid: number;
    pos: {
        x: number;
        y: number;
    };
    tile: {
        tx: number;
        ty: number;
    };
    faction: number;
    needs?: {
        food: number;
        rest: number;
        joy: number;
        warmth: number;
    };
    health?: {
        hp: number;
        maxHp: number;
    };
    renderable?: {
        spriteId: number;
        layer: number;
        tint: number;
    };
}
export interface DesignationSnapshot {
    kind: 'chop' | 'mine';
    tx: number;
    ty: number;
}
export interface SaveDocV1 {
    version: 1;
    savedAt: number;
    seed: number;
    tick: number;
    rngState: number;
    map: {
        width: number;
        height: number;
        terrain: string;
        cost: string;
    };
    entities: EntitySnapshot[];
    designations: DesignationSnapshot[];
    events: string[];
}
export type SaveDoc = SaveDocV1;
export interface SaveMeta {
    slotId: string;
    name: string;
    savedAt: number;
    tick: number;
    day: number;
    seed: number;
}
