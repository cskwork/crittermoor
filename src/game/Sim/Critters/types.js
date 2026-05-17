export var CritterType;
(function (CritterType) {
    CritterType[CritterType["Beast"] = 0] = "Beast";
    CritterType[CritterType["Spirit"] = 1] = "Spirit";
    CritterType[CritterType["Plant"] = 2] = "Plant";
    CritterType[CritterType["Fire"] = 3] = "Fire";
    CritterType[CritterType["Water"] = 4] = "Water";
    CritterType[CritterType["Earth"] = 5] = "Earth";
    CritterType[CritterType["Air"] = 6] = "Air";
    CritterType[CritterType["Metal"] = 7] = "Metal";
})(CritterType || (CritterType = {}));
export const TYPE_COUNT = 8;
export const TYPE_NAMES = {
    [CritterType.Beast]: 'Beast',
    [CritterType.Spirit]: 'Spirit',
    [CritterType.Plant]: 'Plant',
    [CritterType.Fire]: 'Fire',
    [CritterType.Water]: 'Water',
    [CritterType.Earth]: 'Earth',
    [CritterType.Air]: 'Air',
    [CritterType.Metal]: 'Metal',
};
export const TYPE_COLOR = {
    [CritterType.Beast]: 0xb88c5e,
    [CritterType.Spirit]: 0xc6b8ff,
    [CritterType.Plant]: 0x7fbf66,
    [CritterType.Fire]: 0xe07a5f,
    [CritterType.Water]: 0x6aa5d0,
    [CritterType.Earth]: 0xa68a5b,
    [CritterType.Air]: 0xcfe9f0,
    [CritterType.Metal]: 0x9aa3a8,
};
