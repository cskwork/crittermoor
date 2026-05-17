import { createRng } from '@/shared/rng';
import { computeDamage } from './damageFormula';
import { getMove } from './moves';
import { activeOf, isBattleOver } from './BattleState';
export function executeTurn(state, actions) {
    const rng = createRng(state.rngState);
    const next = {
        sides: [
            { ...state.sides[0], team: state.sides[0].team.map((c) => ({ ...c, types: [c.types[0], c.types[1]] })) },
            { ...state.sides[1], team: state.sides[1].team.map((c) => ({ ...c, types: [c.types[0], c.types[1]] })) },
        ],
        rngState: state.rngState,
        turn: state.turn + 1,
        log: [...state.log],
    };
    // Switches resolve first (both sides).
    for (let side = 0; side <= 1; side = (side + 1)) {
        const action = actions[side];
        if (action.kind === 'switch') {
            applySwitch(next, side, action.toSlot);
        }
    }
    // Determine move order by speed, ties broken by side 0 first.
    const order = [];
    const a0 = actions[0];
    const a1 = actions[1];
    if (a0.kind === 'move' || a1.kind === 'move') {
        const spd0 = a0.kind === 'move' ? activeOf(next, 0).spd : -1;
        const spd1 = a1.kind === 'move' ? activeOf(next, 1).spd : -1;
        if (spd0 >= spd1)
            order.push(0, 1);
        else
            order.push(1, 0);
    }
    for (const side of order) {
        const otherSide = (1 - side);
        if (isBattleOver(next).over)
            break;
        const action = actions[side];
        if (action.kind !== 'move')
            continue;
        const move = getMove(action.moveId);
        if (!move) {
            next.log.push(`side${side} attempted unknown move ${action.moveId}`);
            continue;
        }
        const atk = activeOf(next, side);
        const def = activeOf(next, otherSide);
        if (atk.hp <= 0)
            continue;
        const result = computeDamage(atk, def, move, rng);
        next.rngState = rng.state;
        if (!result.hit) {
            next.log.push(`side${side} ${move.name} missed`);
            continue;
        }
        def.hp = Math.max(0, def.hp - result.dmg);
        next.log.push(`side${side} used ${move.name}: ${result.dmg} dmg${result.crit ? ' (crit)' : ''} (x${result.effectiveness})`);
        if (move.status && move.statusChance && def.hp > 0 && def.status === null) {
            if (rng.chance(move.statusChance)) {
                def.status = move.status;
                def.statusTurns = 3;
                next.log.push(`side${otherSide} is now ${move.status}`);
                next.rngState = rng.state;
            }
            else {
                next.rngState = rng.state;
            }
        }
    }
    // End-of-turn status decay.
    for (let side = 0; side <= 1; side = (side + 1)) {
        const c = activeOf(next, side);
        if (c.status === null || c.hp <= 0)
            continue;
        if (c.status === 'burn' || c.status === 'quill') {
            const tick = Math.max(1, Math.floor(c.maxHp / 16));
            c.hp = Math.max(0, c.hp - tick);
            next.log.push(`side${side} suffers ${tick} ${c.status} damage`);
        }
        c.statusTurns -= 1;
        if (c.statusTurns <= 0) {
            c.status = null;
        }
    }
    return next;
}
function applySwitch(state, side, toSlot) {
    const s = state.sides[side];
    if (toSlot < 0 || toSlot >= s.team.length)
        return;
    if (s.team[toSlot].hp <= 0)
        return;
    if (toSlot === s.activeSlot)
        return;
    s.switchesUsed += 1;
    s.activeSlot = toSlot;
    state.log.push(`side${side} switched to slot ${toSlot}`);
}
export { isBattleOver };
