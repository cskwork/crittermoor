# CMR-004 — Reuse inventory

One row per candidate helper, type, or pattern that the implementation should adapt rather than reinvent. `reuse_fit` is a 0..1 estimate of how directly the artefact applies without modification.

| candidate | path:line | reuse_fit | adapt_cost | notes |
|---|---|---|---|---|
| `system_time` placeholder | src/game/Sim/systems/time.ts:19-21 | 1.0 | low | The comment literally names weather as the trigger to slot here. Replace placeholder body with weather advance. |
| `phaseOf(sim)` derivation pattern | src/game/Sim/systems/time.ts:6-13 | 0.8 | low | Selector-from-`sim.tick` style — model `weatherOf(sim)` similarly for renderer/test reads if needed (though weather is stored, not derived). |
| `SimWorld` literal-init pattern | src/game/Sim/world.ts:39-61 | 1.0 | low | Add `weather`, `weatherTicksRemaining` next to `resources`. Same default-literal style. |
| `createRng` / `sim.rng.int` / `sim.rng.chance` | src/shared/rng.ts:14, mulberry32 | 1.0 | low | Use directly for next-weather pick and duration jitter. Single shared RNG = deterministic schedule. |
| `v1ToV2` / `v2ToV3` no-op migration shape | src/game/Sim/Saves/migrations.ts:15-30 | 1.0 | low | Copy literal pattern for `v3ToV4`: spread, bump version, default new field. |
| `SaveDocV3 extends Omit<V2,'version'>` chain | src/game/Sim/Saves/schema.ts:39-50 | 1.0 | low | Append `SaveDocV4` in the same chain; bump `SAVE_VERSION = 4`; update `CurrentSaveDoc`. |
| `makeV1Fixture` round-trip test | tests/sim/migrations.test.ts:6-23 | 0.9 | low | Add `makeV3Fixture()` mirror that strips `weather`; assert deserialize defaults to clear. |
| `nightTint` Graphics layer | src/game/Renderer/Renderer.ts:31-32, 87-100 | 0.95 | low | Mirror pattern for `weatherTint`: own Graphics in `app.stage`, fullscreen `host.clientWidth/Height`, redraw per `draw()`. |
| `computeDamage` signature add-arg precedent | src/game/Sim/Battle/damageFormula.ts:13-19 | 0.7 | med | The function already accepts an optional `level` arg. Adding an optional `weather` follows the same style; default keeps tests green. |
| `executeTurn` thread-through | src/game/Sim/Battle/BattleSim.ts:8-92 | 0.7 | med | Sole call site `Game.ts:111` has `this.sim.weather` in scope. Add optional `weather` arg; thread to `computeDamage(atk, def, move, rng, level, weather)`. |
| `system_raid` early-return shape | src/game/Sim/systems/raid.ts:39-40 | 1.0 | low | Already returns early when not scheduled or `tick < nextRaidTick`. Add `if (sim.weather === Storm) return` at top of the same check block — does not advance scheduling. |
| `system_turret` damage line | src/game/Sim/systems/turret.ts:47-54 | 0.9 | low | Gate the existing `Health.hp[bestEid] -= 3` with `sim.rng.chance(0.75)` when storm. Emit a "missed in the storm" event for visibility. |
| `Faction` / `Terrain` enum pattern | src/shared/constants.ts:12-28 | 1.0 | low | Add `Weather` enum next to `Faction`/`Terrain` (numeric, 0/1/2) — same module, same import path. |
| `tests/sim/time.test.ts` describe-block style | tests/sim/time.test.ts | 0.95 | low | Append `describe('weather schedule', ...)` with deterministic-seed test. Same import + sim-construction pattern. |

## Candidates considered and rejected

- `defineQuery([Weather])` ECS-component approach — rejected. Weather is sim-wide (singleton), not per-entity. ECS components add overhead and force a fake entity. Keep it as a plain `SimWorld` field.
- `Storage`/EventBus pattern for weather changes — rejected. No subscribers in scope; systems poll `sim.weather` directly when running, matching how they poll `sim.tick`.
- Threading `SimWorld` into `BattleSim` — rejected. `BattleState` is intentionally self-contained for snapshot/replay. Pass weather as an explicit positional arg to `executeTurn` instead.

_reuse_from = none for: the `Weather` enum itself (truly new), the `weatherTint` Graphics layer (new but mirrors `nightTint`), the `v3ToV4` migration (new but mirrors `v2ToV3`)._
