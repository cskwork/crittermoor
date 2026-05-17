# Codex task: Critter species data + battle resolver for Crittermoor

You are extending the Crittermoor codebase. Read `docs/spec.md` and `docs/architecture.md` first.

## Goal

Produce these TypeScript files (no other changes):

1. `src/game/Sim/Critters/species.ts`
2. `src/game/Sim/Critters/types.ts`
3. `src/game/Sim/Battle/moves.ts`
4. `src/game/Sim/Battle/typeChart.ts`
5. `src/game/Sim/Battle/damageFormula.ts`
6. `src/game/Sim/Battle/BattleSim.ts`
7. `tests/sim/battle.test.ts`

All files must compile under the existing strict TS config and pass `npm run typecheck` and `npm test`.

## Style requirements

- TypeScript strict, no `any`.
- Pure functions; no I/O, no DOM, no globals.
- Data tables in `as const` arrays with explicit interfaces.
- Use the existing `Rng` from `@/shared/rng` for randomness — no `Math.random`.
- Determinism: same `(state, action, rng.state)` MUST yield the same outcome.
- File header comment is one short line max.
- No comments explaining what code does — only WHY when non-obvious.

## Concrete deliverables

### `types.ts`
Export `CritterType` enum with: `Beast`, `Spirit`, `Plant`, `Fire`, `Water`, `Earth`, `Air`, `Metal` (8 types).

### `typeChart.ts`
Export `typeMultiplier(attackerType, defenderType): number` returning 0.5 / 1 / 2 according to:
- Fire > Plant, Plant > Earth, Earth > Metal, Metal > Spirit, Spirit > Beast, Beast > Air, Air > Water, Water > Fire.
- Same type vs same type = 0.5.
- Otherwise 1.

Include a 64-entry matrix or a function — your choice — but it must be exhaustive and tested.

### `moves.ts`
Define `interface MoveDef { id: string; name: string; type: CritterType; power: number; accuracy: number; category: 'physical' | 'special' | 'status'; statusChance?: number; status?: 'burn' | 'soak' | 'quill' | 'daze' | 'snare' | 'bloom' }`.

Export `MOVES: readonly MoveDef[]` with at least 16 moves spanning all 8 types.

### `species.ts`
Define `interface SpeciesDef { id: number; key: string; name: string; types: readonly CritterType[]; baseStats: { hp: number; atk: number; def: number; satk: number; sdef: number; spd: number }; movePool: readonly string[]; workTags: readonly string[]; sprite: string }`.

Export `SPECIES: readonly SpeciesDef[]` with these 6 species (IDs 1-6) — invent original names, stats, and lore-flavored move pools (refer to spec):

1. Spritmoth (Spirit/Air)
2. Tindercub (Fire/Beast)
3. Loamfin (Water/Earth)
4. Brackboar (Earth/Beast)
5. Ferroquill (Metal/Air)
6. Mosskit (Plant/Beast)

Stats should be balanced: total base stats per species between 300 and 360.

### `damageFormula.ts`
Export `computeDamage(attacker, defender, move, rng): { dmg: number; effectiveness: number; crit: boolean }`. Formula (deterministic given rng state):

```
base = ((2 * level / 5 + 2) * power * A / D) / 50 + 2
crit = rng.chance(1/16) → multiplies base by 1.5
typeMult = typeMultiplier(move.type, defender.type1) * (defender.type2 ? typeMultiplier(move.type, defender.type2) : 1)
random = 0.85 + rng.next() * 0.15
dmg = floor(base * typeMult * random * crit)
```
Where A/D is atk/def for physical, satk/sdef for special, 0 for status (returns dmg=0).

### `BattleSim.ts`
Export pure functions to drive a 4v4 turn-based fight:
- `createBattleState(team1, team2, rng): BattleState`
- `executeTurn(state, actions, rng): BattleState` — actions is `[Action, Action]` (one per side); valid actions: `{ kind: 'move', moveId: string }` or `{ kind: 'switch', toSlot: number }` or `{ kind: 'item', itemId: string }`.
- `isBattleOver(state): { over: boolean; winner: 0 | 1 | null }`.

The state is fully serializable JSON. Speed determines turn order; ties broken by side 0 first then by slot order.

### `tests/sim/battle.test.ts`
At least 6 vitest tests:
- type chart symmetry / coverage
- damage scales monotonically with attacker ATK
- damage scales inversely with defender DEF
- crit increases damage when triggered (force RNG)
- battle ends when one side has all critters at hp ≤ 0
- speed ordering is correct
- determinism: same battle + same RNG state → identical sequence

Use `fast-check` for the monotonicity property tests.

## After writing files

Run these commands and ensure both pass before reporting success:

```
npm run typecheck
npm test
```

If anything fails, fix it. Do not skip or remove tests. Only after both pass, summarize what you produced in under 8 lines.

The repo is at `/Users/danny/Documents/PARA/Resource/vibe-tycoon`.
