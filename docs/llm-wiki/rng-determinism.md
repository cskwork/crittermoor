# RNG Determinism (where new `sim.rng.*` draws can live)

## Getting the Feel (For Beginners)

### Why RNG determinism matters

Saves and replays must be **bit-stable**: load the same save, run the same ticks, and you must get the exact same world. The whole sim is built around one seeded RNG stream (`sim.rng`, a Mulberry32). Every random draw the sim makes is a step on that stream. If a new system calls `sim.rng.*` somewhere unexpected, every later draw shifts by one step, and unrelated tests (raid scheduling, wild AI, taming) start producing different outcomes. That's how "I just added a new feature" silently breaks five passing tests.

The simplest way for a beginner to picture it:

`Same seed -> same stream of draws -> same world. Drift any draw, drift every later draw.`

There are five terms you need to internalise at this stage.

| Term | Plain-English meaning |
|---|---|
| Seed | A single number that anchors the RNG. Same seed, same world. |
| Stream | The ordered sequence of values the RNG produces -- every `sim.rng.int(...)` call advances by one. |
| Draw | One call to `sim.rng.chance(p) / int(n) / pick(arr)`. Each one consumes one step. |
| Drift | The damage caused when a new system inserts a draw earlier than the existing draws expected. |
| Rare gate | A pattern where new RNG draws are tucked behind a state transition that only happens in rare ticks, so untouched saves consume zero new draws. |

To make it concrete:

The breeding system at CMR-011 only consumes RNG when a hatchling is born (`sim.rng.int(4)` for trait pick -- once per hatchling). It does not roll RNG every tick, not even per hatchery. Result: a save that never builds a Hatchery sees zero new RNG draws, so all pre-existing seeded tests (raid, wild AI, saves) keep their byte-for-byte outputs. If breeding had rolled "should the egg appear this tick?" on every tick, every single seeded test would have drifted.

The decision rule that matters at this stage:

**Just remember this: every new `sim.rng.*` call shifts the entire stream from that tick onward -- put new draws behind the rarest gate that still makes the feature work, and never use `Math.random`.**

When you're ready to go deeper, read [breeding-hatchery](breeding-hatchery.md) and the RNG implementation at `src/shared/rng.ts`.

## Technical Reference

**Summary:** All stochastic behaviour goes through `sim.rng.chance(p)`, `sim.rng.int(n)`, `sim.rng.pick(arr)` -- a Mulberry32 seeded from `createSimWorld(seed)`. Never `Math.random()`. New systems must place their RNG draws behind the rarest gate possible (a state transition, not a per-tick roll) so existing seeded tests stay byte-stable. Tick order matters too: a system inserted before an existing system that already calls RNG will shift every downstream draw.

**Invariants & Constraints:**
- `Math.random()` is banned anywhere inside sim systems. Use `sim.rng`.
- Every new draw call shifts the stream from that tick onward. Existing seeded tests are the canary -- if they drift, your RNG placement is wrong.
- Prefer rare gates: trait roll at hatch (CMR-011, ~once per 1200 ticks per hatchery) is fine; per-tick "should this egg progress?" is not.
- System order in `runTick` is part of the determinism contract. Adding a system that calls RNG between two existing systems re-orders the stream for downstream calls. Test the full suite after any reorder.
- For headless tests, `runTick` is the canonical advance. `sim.tick++` is performed before the systems run, so "N runTicks since seed" maps 1:1 to "N ticks elapsed".

**Files of interest:**
- `src/shared/rng.ts` -- Mulberry32 implementation; `chance`, `int`, `pick` are the only legal entrypoints.
- `src/game/Sim/world.ts` -- `createSimWorld(seed)` is where the seed enters the world.
- `src/game/Sim/tick.ts:24-50` -- both `makeRunTick` and headless `runTick`; insertion order of new systems is the most common drift source.
- `src/game/Sim/systems/breeding.ts:163` -- exemplar of a rare-gate draw: `sim.rng.int(BREEDING_TRAITS.length)` happens once per hatchling, never per tick.
- `src/game/Sim/systems/raid.ts` -- reference for an RNG-using system that already lives in the canonical tick order; new systems near raid must preserve the order.
- `tests/sim/breeding.test.ts` "two sims with same seed produce identical hatchling traitId" -- exemplar regression test for determinism.

**Observability hooks:**
- none -- RNG drift is detected by test diffs, not runtime metrics.

**Decision log:**
- 2026-05-20 | CMR-011 | Documented the "rare gate" pattern. CMR-011's breeding system consumes exactly one RNG draw per hatchling, demonstrating that a new system can be added to the canonical tick order without breaking any of the 42 pre-existing seeded tests.

**Last updated:** 2026-05-20 by CMR-011.
