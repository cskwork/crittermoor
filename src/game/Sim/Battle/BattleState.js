export function createBattleState(team0, team1, rng) {
    return {
        sides: [
            { team: team0.map(cloneCritter), activeSlot: 0, switchesUsed: 0 },
            { team: team1.map(cloneCritter), activeSlot: 0, switchesUsed: 0 },
        ],
        rngState: rng.state,
        turn: 0,
        log: [],
    };
}
export function activeOf(state, side) {
    const s = state.sides[side];
    return s.team[s.activeSlot];
}
export function isBattleOver(state) {
    const a = state.sides[0].team.every((c) => c.hp <= 0);
    const b = state.sides[1].team.every((c) => c.hp <= 0);
    if (a && b)
        return { over: true, winner: null };
    if (a)
        return { over: true, winner: 1 };
    if (b)
        return { over: true, winner: 0 };
    return { over: false, winner: null };
}
function cloneCritter(c) {
    return { ...c, types: [c.types[0], c.types[1]] };
}
