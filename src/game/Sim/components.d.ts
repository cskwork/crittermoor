export declare const Position: import("bitecs").ComponentType<{
    x: "f32";
    y: "f32";
}>;
export declare const PositionPrev: import("bitecs").ComponentType<{
    x: "f32";
    y: "f32";
}>;
export declare const TilePos: import("bitecs").ComponentType<{
    tx: "i16";
    ty: "i16";
}>;
export declare const Velocity: import("bitecs").ComponentType<{
    vx: "f32";
    vy: "f32";
}>;
export declare const Renderable: import("bitecs").ComponentType<{
    spriteId: "ui16";
    layer: "ui8";
    tint: "ui32";
}>;
export declare const Pawn: import("bitecs").ComponentType<{
    flags: "ui8";
    mood: "i8";
}>;
export declare const Needs: import("bitecs").ComponentType<{
    food: "ui8";
    rest: "ui8";
    joy: "ui8";
    warmth: "ui8";
}>;
export declare const Skills: import("bitecs").ComponentType<{
    construct: "ui8";
    mine: "ui8";
    cook: "ui8";
    plant: "ui8";
    tame: "ui8";
    combat: "ui8";
    medicine: "ui8";
    craft: "ui8";
}>;
export declare const Critter: import("bitecs").ComponentType<{
    speciesId: "ui16";
    level: "ui8";
    xp: "ui32";
    bond: "ui8";
}>;
export declare const Health: import("bitecs").ComponentType<{
    hp: "i16";
    maxHp: "i16";
    downed: "ui8";
}>;
export declare const CombatStats: import("bitecs").ComponentType<{
    atk: "ui8";
    def: "ui8";
    satk: "ui8";
    sdef: "ui8";
    spd: "ui8";
}>;
export declare const Job: import("bitecs").ComponentType<{
    kind: "ui8";
    targetEid: "ui32";
    state: "ui8";
    progress: "ui16";
}>;
export declare const Faction: import("bitecs").ComponentType<{
    id: "ui8";
}>;
export declare const Bond: import("bitecs").ComponentType<{
    partnerEid: "ui32";
    level: "ui8";
}>;
export declare const Wild: import("bitecs").ComponentType<{
    aggression: "ui8";
    packId: "ui16";
}>;
export declare const HasPath: import("bitecs").ComponentType<{
    cursor: "ui16";
}>;
