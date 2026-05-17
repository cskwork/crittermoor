import { CritterType, TYPE_COUNT } from '../Critters/types';
// Strong pairs from spec: attacker → defender = 2x
const STRONG = [
    [CritterType.Fire, CritterType.Plant],
    [CritterType.Plant, CritterType.Earth],
    [CritterType.Earth, CritterType.Metal],
    [CritterType.Metal, CritterType.Spirit],
    [CritterType.Spirit, CritterType.Beast],
    [CritterType.Beast, CritterType.Air],
    [CritterType.Air, CritterType.Water],
    [CritterType.Water, CritterType.Fire],
];
const chart = new Array(TYPE_COUNT * TYPE_COUNT).fill(1);
for (let i = 0; i < TYPE_COUNT; i++) {
    chart[i * TYPE_COUNT + i] = 0.5; // same-type resists
}
for (const [atk, def] of STRONG) {
    chart[atk * TYPE_COUNT + def] = 2;
    chart[def * TYPE_COUNT + atk] = 0.5; // reverse is resisted
}
export function typeMultiplier(attacker, defender) {
    return chart[attacker * TYPE_COUNT + defender] ?? 1;
}
