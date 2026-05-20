# Battle Enemy AI

## Getting the Feel (For Beginners)

### Why battle-enemy-ai exists

Battles in Crittermoor are turn-based: every turn the enemy critter has to *pick a move*. If the enemy always reached for the same move at the top of its list, the player would memorise the fight in one try and the type-chart strategy the game teaches would feel pointless. The enemy AI's job is to **pick a move that looks plausibly smart** — favour super-effective hits, take a free status when the target is clean — while staying *predictable* so replays from the same seed reproduce the same battle.

The simplest way for a beginner to picture it:

`Look at on-field defender → Score each of my moves → Pick the highest → Break ties with the seeded coin`

There are five terms you need to internalise at this stage.

| Term | Plain-English meaning |
|---|---|
| Scorer | A pure function that hands every move a number; bigger number = looks better right now. |
| Expected damage | "If I used this move 100 times, how much HP would I shave on average?" — folds the type chart and accuracy in. |
| Status bonus | A small reward for landing a fresh status (poison, burn, etc.) on a target that doesn't already have one. |
| Self-risk penalty | A small punishment for moves that would knock *yourself* out via recoil (placeholder today; reserved for future recoil moves). |
| Seeded RNG | The game's deterministic coin flip — same seed produces the same sequence, used only when two moves tie. |

To make it concrete:

A Fire-type enemy is on the field. The on-field player critter is Plant. The enemy knows three moves: `cinder_dash` (Fire, strong), `bite` (Normal, weak), `feral_charge` (Normal, mid). The scorer sees the 2x type advantage of Fire vs Plant, multiplies it through `cinder_dash`'s power, and that move's score blows past the others. The enemy fires `cinder_dash`. Next turn the player switches in a Water critter. The scorer now scores against *that* critter — Fire is half-effective on Water, so `feral_charge` may win. The picked move flips without the player ever touching the enemy.

The decision rule that matters at this stage:

**Just remember this: the scorer is RNG-free; the RNG only flips a coin between moves that already tie.**

When you're ready to go deeper, read `battle-damage-formula` (TBD) and `battle-rng-determinism` (TBD).

## Technical Reference

**Summary:** `src/game/Sim/Battle/ai.ts` exports a pure scorer used by `BattleScreen.tsx` on enemy turns. `pickEnemyMove(attacker, allies, enemies, rng)` returns a move id. The scorer is `expectedDamage + statusBonus - selfRiskPenalty`. `expectedDamage` mirrors `damageFormula.ts:26-35` with the random factor and crit factor replaced by their expected values (`E_RAND = 0.925`, `E_CRIT = 1.03125`), then floors, clamps `>= 1`, and scales by `accuracy/100`. `statusBonus` returns `+20` only when `move.status && (statusChance ?? 0) > 0 && target.status === null` (gates mirror `BattleSim.ts:64`). `selfRiskPenalty` is a typed stub returning `0` until `MoveDef.recoil` ships.

**Invariants & Constraints:**
- The scorer is RNG-free; only the tie-break consumes `rng.int(...)`. Callers must clone the sim RNG (`createRng(state.rngState)`) so the canonical simulation RNG stream stays untouched.
- `pickEnemyMove` scores against `enemies[0]`. Call sites must pass the on-field defender, not the whole team — `BattleScreen.tsx` passes `[activePlayer]` for this reason. Passing the full team would silently mis-target whenever the active slot is non-zero.
- Unknown move ids resolve to `Number.NEGATIVE_INFINITY` rather than throwing (defensive against corrupt save data).
- The function does not mutate inputs. All inputs are treated as read-only.

**Files of interest:**
- `src/game/Sim/Battle/ai.ts:11-21` — `expectedDamage` mirrors the damage formula with expected crit/random.
- `src/game/Sim/Battle/ai.ts:23-28` — `statusBonus` (gate mirrors `BattleSim.ts:64`).
- `src/game/Sim/Battle/ai.ts:32-36` — `selfRiskPenalty` stub; will activate once `MoveDef.recoil` lands.
- `src/game/Sim/Battle/ai.ts:42-63` — `pickEnemyMove` (score → max → tie-break).
- `src/ui/screens/BattleScreen.tsx:36,46` — both turn paths delegate to `pickEnemyMove(activeEnemy, [activeEnemy], [activePlayer], createRng(state.rngState))`.
- `tests/sim/battle.test.ts` `describe('enemy ai')` — property test (50 fast-check runs, `score(picked) === max`), determinism (same seed → same id), active-slot regression (Fire attacker flips between `cinder_dash` and `feral_charge` as the on-field defender type changes).

**Observability hooks:**
- none

**Decision log:**
- 2026-05-20 | CMR-005 | Created. Picked Candidate A (pure scorer module) over folding into `BattleSim.executeTurn` (breaks the `[action0, action1]` contract used by `Game.ts:111` and raid tests) and depth-1 minimax (consumes RNG, breaks the property test, 30-50x per-turn cost). Caller must pass the on-field defender; the prior HIGH review finding fixed a regression where the picker scored against `player.team[0]` (the bench critter) after the player switched. `selfRiskPenalty` kept as a typed `0`-stub rather than removed so the formula keeps its shape for the next ticket that adds `MoveDef.recoil`.

**Last updated:** 2026-05-20 by CMR-005.
