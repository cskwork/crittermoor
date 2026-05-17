import { typeMultiplier } from './typeChart';
export function computeDamage(attacker, defender, move, rng, level = attacker.level) {
    if (move.category === 'status' || move.power === 0) {
        return { dmg: 0, effectiveness: 1, crit: false, hit: rng.chance(move.accuracy / 100) };
    }
    const hit = rng.chance(move.accuracy / 100);
    if (!hit)
        return { dmg: 0, effectiveness: 1, crit: false, hit: false };
    const a = move.category === 'physical' ? attacker.atk : attacker.satk;
    const d = move.category === 'physical' ? defender.def : defender.sdef;
    const base = ((2 * level) / 5 + 2) * move.power * (a / Math.max(1, d)) / 50 + 2;
    const crit = rng.chance(1 / 16);
    const critMult = crit ? 1.5 : 1;
    const e1 = typeMultiplier(move.type, defender.types[0]);
    const e2 = defender.types[1] !== null ? typeMultiplier(move.type, defender.types[1]) : 1;
    const effectiveness = e1 * e2;
    const random = 0.85 + rng.next() * 0.15;
    const dmg = Math.max(1, Math.floor(base * effectiveness * critMult * random));
    return { dmg, effectiveness, crit, hit: true };
}
