import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { createRng } from '@/shared/rng';
import { CritterType } from '@/game/Sim/Critters/types';
import { typeMultiplier } from '@/game/Sim/Battle/typeChart';
import { computeDamage } from '@/game/Sim/Battle/damageFormula';
import { getMove, MOVES } from '@/game/Sim/Battle/moves';
import { createBattleState, isBattleOver } from '@/game/Sim/Battle/BattleState';
import { executeTurn } from '@/game/Sim/Battle/BattleSim';
function mk(level, atk, def, spd, types, moves = ['bite']) {
    return {
        speciesId: 1,
        level,
        types,
        hp: 100,
        maxHp: 100,
        atk,
        def,
        satk: atk,
        sdef: def,
        spd,
        moves,
        status: null,
        statusTurns: 0,
    };
}
describe('type chart', () => {
    it('is exhaustive (covers all type pairs)', () => {
        for (let a = 0; a < 8; a++) {
            for (let b = 0; b < 8; b++) {
                const m = typeMultiplier(a, b);
                expect([0.5, 1, 2]).toContain(m);
            }
        }
    });
    it('encodes the canonical wheel correctly', () => {
        expect(typeMultiplier(CritterType.Fire, CritterType.Plant)).toBe(2);
        expect(typeMultiplier(CritterType.Plant, CritterType.Fire)).toBe(0.5);
        expect(typeMultiplier(CritterType.Beast, CritterType.Beast)).toBe(0.5);
    });
});
describe('damage formula', () => {
    it('scales monotonically with attacker attack', () => {
        fc.assert(fc.property(fc.integer({ min: 30, max: 100 }), fc.integer({ min: 30, max: 100 }), (atkLow, delta) => {
            const atkHigh = atkLow + Math.max(20, delta);
            const move = getMove('bite');
            const rng1 = createRng(42);
            const rng2 = createRng(42);
            const low = computeDamage(mk(20, atkLow, 50, 60, [CritterType.Beast, null]), mk(20, 50, 50, 60, [CritterType.Beast, null]), move, rng1);
            const high = computeDamage(mk(20, atkHigh, 50, 60, [CritterType.Beast, null]), mk(20, 50, 50, 60, [CritterType.Beast, null]), move, rng2);
            return high.dmg >= low.dmg;
        }), { numRuns: 40 });
    });
    it('scales inversely with defender defense', () => {
        fc.assert(fc.property(fc.integer({ min: 30, max: 100 }), fc.integer({ min: 30, max: 100 }), (defLow, delta) => {
            const defHigh = defLow + Math.max(20, delta);
            const move = getMove('bite');
            const rng1 = createRng(42);
            const rng2 = createRng(42);
            const tough = computeDamage(mk(20, 80, 50, 60, [CritterType.Beast, null]), mk(20, 50, defHigh, 60, [CritterType.Beast, null]), move, rng1);
            const weak = computeDamage(mk(20, 80, 50, 60, [CritterType.Beast, null]), mk(20, 50, defLow, 60, [CritterType.Beast, null]), move, rng2);
            return weak.dmg >= tough.dmg;
        }), { numRuns: 40 });
    });
    it('all defined moves have valid types', () => {
        for (const m of MOVES) {
            expect(m.type).toBeGreaterThanOrEqual(0);
            expect(m.type).toBeLessThan(8);
            expect(m.accuracy).toBeGreaterThan(0);
            expect(m.accuracy).toBeLessThanOrEqual(100);
        }
    });
});
describe('battle sim', () => {
    it('ends when one side is wiped', () => {
        const team0 = [mk(20, 80, 50, 90, [CritterType.Beast, null], ['feral_charge'])];
        const team1 = [mk(20, 20, 20, 10, [CritterType.Beast, null], ['bite'])];
        team1[0].hp = 5;
        const rng = createRng(1);
        let state = createBattleState(team0, team1, rng);
        state = executeTurn(state, [{ kind: 'move', moveId: 'feral_charge' }, { kind: 'move', moveId: 'bite' }]);
        const over = isBattleOver(state);
        expect(over.over).toBe(true);
        expect(over.winner).toBe(0);
    });
    it('faster critter moves first', () => {
        const fast = mk(20, 60, 50, 99, [CritterType.Beast, null], ['feral_charge']);
        const slow = mk(20, 60, 50, 10, [CritterType.Beast, null], ['feral_charge']);
        slow.hp = 1;
        const rng = createRng(7);
        let state = createBattleState([fast], [slow], rng);
        state = executeTurn(state, [{ kind: 'move', moveId: 'feral_charge' }, { kind: 'move', moveId: 'feral_charge' }]);
        // slow had hp 1; fast going first KOs it before slow can act
        expect(state.sides[1].team[0].hp).toBe(0);
        expect(state.sides[0].team[0].hp).toBe(100);
    });
    it('is deterministic for the same seed and inputs', () => {
        const make = () => createBattleState([mk(15, 60, 50, 70, [CritterType.Fire, null], ['ember'])], [mk(15, 60, 50, 50, [CritterType.Plant, null], ['leaf_cut'])], createRng(31415));
        let a = make();
        let b = make();
        for (let i = 0; i < 5; i++) {
            const actions = [
                { kind: 'move', moveId: 'ember' },
                { kind: 'move', moveId: 'leaf_cut' },
            ];
            a = executeTurn(a, actions);
            b = executeTurn(b, actions);
        }
        expect(a.sides[0].team[0].hp).toBe(b.sides[0].team[0].hp);
        expect(a.sides[1].team[0].hp).toBe(b.sides[1].team[0].hp);
        expect(a.rngState).toBe(b.rngState);
    });
});
