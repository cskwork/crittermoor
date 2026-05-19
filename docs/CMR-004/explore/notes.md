# CMR-004 — Explore notes

## 1. Existing seams (no surprises)

- `system_time` at `src/game/Sim/systems/time.ts:19-21` is literally a placeholder comment that names "weather" as the intended trigger. The exported `phaseOf(sim)` and `dayOf(sim)` derive everything from `sim.tick % DAY_LENGTH_TICKS`. We slot weather alongside them — same module, same style.
- `SimWorld` (`src/game/Sim/world.ts:26-37`) is a plain object; new fields (`weather`, `weatherTicksRemaining`) compose like the existing `resources`. `createSimWorld` (`:39-61`) initializes them with literal defaults — no schema layer.
- Shared RNG is `sim.rng` (`src/shared/rng.ts:14`, mulberry32). `chance(p)`, `int(maxExclusive)`, `range(min,max)` all consume one `next()` per call. Determinism: any reordering of consumers breaks save replay, so weather rolls MUST live in `system_time` at a stable position in the tick.
- Tick order (`src/game/Sim/tick.ts:24-37`): `position_prev → time → needs → behavior → jobs → construct → turret → wild_ai → critter_follow → raid → path_follow`. `system_time` runs second. That is the right slot — weather is observed by `turret`, `raid`, and `damageFormula` later in the same tick.

## 2. Battle integration (the trickiest seam)

- `computeDamage` (`src/game/Sim/Battle/damageFormula.ts:13-41`) is pure. It has no SimWorld handle; it takes `attacker`, `defender`, `move`, `rng`. Cleanest plumb: add optional `weather?: Weather` arg with default `Weather.Clear`. Rain reduces `move.power` for `CritterType.Fire` moves by 20% (multiply effective power by 0.8 right before computing `base`).
- `executeTurn` (`src/game/Sim/Battle/BattleSim.ts:8-92`) is the only caller in production code. It is invoked once from `Game.ts:111` (`recordBattleAction`) where `this.sim` is in scope, so `this.sim.weather` is reachable. The battle test (`tests/sim/battle.test.ts:113-132`) passes no weather; default `Weather.Clear` keeps it backwards-compatible.
- `BattleState` (`src/game/Sim/Battle/BattleState.ts:29-34`) is the serialized turn carrier. Do NOT add weather here — battles snapshot their own RNG state and we want weather to be a sim-level fact that can change mid-fight if a long battle straddles a weather edge. Pass weather as a positional arg to `executeTurn`/`computeDamage`.

## 3. Turret accuracy gate

- `system_turret` (`src/game/Sim/systems/turret.ts:20-56`) currently has no accuracy roll — it just sets `Health.hp[bestEid] -= 3`. Storm imposes a 25% miss. Implementation: when `sim.weather === Storm`, gate the damage line with `if (!sim.rng.chance(0.75)) continue` (consuming one RNG draw per shot — determinism cost is bounded by `FIRE_INTERVAL=8` and turret count).
- The `chance(0.75)` MUST be called inside the per-target inner loop (after a target is chosen) so we don't burn RNG on turrets with no target.
- Event log: emit a one-line "turret missed in the storm" to make the gameplay effect visible to the player without changing AC.

## 4. Raid pause

- `system_raid` (`src/game/Sim/systems/raid.ts:37-54`) fires when `r.scheduled && sim.tick >= r.nextRaidTick`. Pause during storm: early-return when `sim.weather === Weather.Storm`. Do NOT advance `nextRaidTick` — we want the raid to fire as soon as the storm clears, not be skipped entirely. This consumes zero RNG draws when paused, preserving determinism on either side of the storm edge.

## 5. Renderer overlay

- `Renderer` already has a fullscreen DOM tint (`nightTint`) drawn in screen space above the world (`src/game/Renderer/Renderer.ts:31-32,87-100`). We mirror that pattern with a new `weatherTint` Graphics, also in screen space, added to `app.stage` above `nightTint`.
- `drawWeatherTint(sim)` fills `host.clientWidth × host.clientHeight` with:
  - rain → `color=0x4060a0`, `alpha=0.20` (semi-transparent blue)
  - storm → `color=0x2c2c34`, `alpha=0.32` base, plus a deterministic lightning flicker: when `sim.weather===Storm && (sim.tick % 96) < 2 && sim.rng.chance(0.5)` … BUT calling `sim.rng` from the renderer would break determinism (renderer runs out-of-tick). Solution: derive flicker purely from `sim.tick` (e.g. `((sim.tick * 2654435761) >>> 0) % 240 < 2`) — no RNG draw, no sim coupling, but it is reproducible from a save.
- The overlay does NOT need to be added to viewport (no world-space scaling needed); fullscreen is fine and matches the night tint precedent.

## 6. Save migration v3 → v4

- `SAVE_VERSION = 3` (`src/game/Sim/Saves/schema.ts:1`), `SaveDoc = V1|V2|V3`, `CurrentSaveDoc = SaveDocV3`. Add `SaveDocV4 extends Omit<V3,'version'>` with `version: 4` and `weather?: { kind: 0|1|2; ticksRemaining: number }` (numbers, not enum names — bit-stable across enum renames).
- `migrateToCurrent` (`src/game/Sim/Saves/migrations.ts:6-13`) currently terminates at `version === 3`. Add a `v3ToV4` step that defaults weather to `{ kind: 0, ticksRemaining: 0 }` (clear, advance immediately on next tick).
- `codec.serialize` (`src/game/Sim/Saves/codec.ts:79-97`) writes `weather` from `sim.weather` + `sim.weatherTicksRemaining`. `codec.deserialize` (`:100-173`) reads back into the new fields; `createSimWorld` initializes them to clear/0 so a missing `doc.weather` is safe.
- Bump `SAVE_VERSION = 4`. Tests:
  - extend `tests/sim/migrations.test.ts` with a v3 fixture round-trip (`makeV3Fixture()` mirrors the existing v1 helper) that asserts default weather is clear.
  - extend `tests/sim/saves.test.ts` round-trip with weather set.

## 7. Determinism contract (CRITICAL)

The shared RNG is consumed in this fixed order in a tick:
1. `system_pawn_behavior` (existing — bed tie-break)
2. `system_jobs` (none currently)
3. `system_construct` (none currently)
4. `system_turret` (NEW: `chance(0.75)` per shot during storm)
5. `system_wild_ai` (existing chase rolls)
6. `system_raid` (existing scheduling rolls — gated by storm early-return; raid system itself does NOT roll RNG when paused)
7. `system_critter_follow` (existing)

Weather rolls (one `int(3)` to pick next kind, one `int(N)` for duration) MUST happen in `system_time` which runs BEFORE all of the above. This way, a turret shot during the same tick that weather flips already sees the new state, and the RNG sequence is invariant under tick boundary.

## 8. Schedule cadence

AC: "~1 weather change per in-game day". `DAY_LENGTH_TICKS = 8 * 60 * 10 = 4800`. Implementation: when `weatherTicksRemaining === 0`, pick a duration `~= DAY_LENGTH_TICKS` plus jitter (`rng.int(DAY_LENGTH_TICKS) + DAY_LENGTH_TICKS/2` → 0.5–1.5 days, mean 1.0). Pick next kind uniformly from `{clear, rain, storm}` via `rng.int(3)`. Initial state: clear with `ticksRemaining = 0` so the first roll happens on tick 0 (deterministic given seed).

## 9. Out-of-scope (documented for follow-ups)

The ticket Description mentions but the AC does NOT bind:
- chop/mine -5% during rain → would require touching `src/game/Sim/systems/jobs.ts:103` (`WORK_TICKS_CHOP/MINE`). Not in the AC "Files likely touched" list.
- pawn move -10% during storm → would require touching `src/game/Sim/systems/pathFollow.ts:7-8` (`STEP_INTERVAL`). Not in the AC files list.

These are flavour effects the description names. Following the Ten Commandments rule 5 ("touch only what the task requires") and rule 6 ("write the minimum"), we ship the AC-bound effects only (battle damage, turret accuracy, raid pause, overlay, save migration) and leave the work/move speed multipliers for a follow-up. Note in the Recommendation so QA does not flag the omission.

## 10. References

- Existing factory/system-hook pattern (for future-proofing if weather effects ever need DI): `makeJobSystem`/`makeRaidSystem` (`src/game/Sim/tick.ts:14-38`). Not needed here — weather is read-only state, no hooks required.
- Prior migration commit `cd90a69 feat(alpha): … save v2 migration` and `1969113 feat(build): … save v3` show the exact shape of a no-op migration step (`v1ToV2` adds undefined `raid`, `v2ToV3` defaults `resources` and `blueprintKeys`). Our `v3ToV4` follows the same shape.
- CMR-001 (`kanban/CMR-001.md:97-160`) shows the required Plan/Acceptance/Done-Signals format and severity table — mirror those structures verbatim.
