# Breeding (Hatchery + Egg + Hatchling)

## Getting the Feel (For Beginners)

### Why breeding exists

The colony can lose critters to raids, hunger, or accidents. Taming wild critters is slow and unreliable, so without a renewable source the population only shrinks. The Hatchery is the loop that lets two tamed critters of the same species produce a new bonded critter while the player keeps playing.

The simplest way for a beginner to picture it:

`Build Hatchery -> Assign two same-species parents -> Wait 600 ticks for Egg -> Wait 600 ticks for Hatchling -> Idle`

There are five terms you need to internalise at this stage.

| Term | Plain-English meaning |
|---|---|
| Hatchery | A small building you place on a tile. Once built, you can park two parents at it. |
| Parents | Two tamed (Player-faction) critters of the same species, parked at one Hatchery. |
| Egg | The little entity that appears on the Hatchery tile 600 ticks after both parents are assigned. |
| Hatchling | The baby critter that pops out of the Egg another 600 ticks later; it joins the colony already bonded. |
| Trait | A flavour tag (Hardy / Swift / Bright / Stoic) rolled once for the hatchling and only the hatchling. |

To make it concrete:

You build a Hatchery in the middle of your camp, then drop two of your tamed Foxes onto it. Ten in-game minutes (600 sim-ticks) later an Egg appears on the tile. Ten minutes after that the Egg is gone and a level-1 Fox is standing on the tile, already trusting you (Bond level 20) and labelled "Hardy". The two parents are unchanged and stay assigned, so you can decide whether to pull them off or breed again.

The decision rule that matters at this stage:

**Just remember this: a Hatchery produces exactly one new critter per 1200-tick cycle, and the only randomness in the cycle is the trait the baby gets.**

When you're ready to go deeper, read [sim-side-channel-state](sim-side-channel-state.md) and [save-v3-additive-fields](save-v3-additive-fields.md).

## Technical Reference

**Summary:** Hatchery is `StructureKind.Hatchery = 7` (`src/game/Sim/Structures/defs.ts`). Two Player-faction critters of the same species are bound to a hatchery via `assignToHatchery(sim, hEid, parentA, parentB)`. The `system_breeding` system runs a side-channel state machine (`Idle -> Incubating -> Hatching -> Idle`) per hatchery, gated on `sim.tick >= state.nextEventTick`. At the first gate (incubation done) an `Egg` ECS entity is spawned on the hatchery tile (`Egg{speciesId, hatchTick}` + `TilePos` + `Renderable` + `FactionComp`). At the second gate (hatch) `spawnCritter(level:1)` is called, the hatchling is flipped to `Faction.Player` (the `tame.ts` sequence: remove `Wild`, add `Bond` with `level=20`), a `CritterTrait{traitId: sim.rng.int(4)}` is added, and the egg entity is destroyed AFTER the hatchling spawn (to avoid bitecs eid reuse colliding with the codec eid-remap).

**Invariants & Constraints:**
- The full cycle from `assignToHatchery` to a hatchling existing is exactly `INCUBATE_TICKS + HATCH_TICKS = 1200` ticks (constants in `src/game/Sim/systems/breeding.ts:22-23`).
- `system_breeding` is registered AFTER `sim.tick++` in both `makeRunTick` and headless `runTick`. Consequence: "N runTicks elapsed since assign" maps 1:1 to "N ticks passed". Do not reorder.
- Exactly one `sim.rng.int(4)` is consumed per hatchling. No other RNG is consumed by the breeding system. This isolates the new RNG draws to the rare hatch event so existing seeded suites (raid, wild AI, saves) remain byte-stable.
- Parents are NOT consumed. After hatch the hatchery returns to `Idle` with the parents still recorded on the state row; re-assigning is the player's call.
- Egg destroy MUST happen after `spawnCritter`. Reversing the order risks bitecs reusing the egg's eid for the hatchling on the same tick, which would confuse `eidRemap` on the next save round-trip.
- Validation in `assignToHatchery` rejects: hatchery not built (`Structure.state !== 1`), wrong kind, parent missing `Critter`, parent not `Faction.Player`, `speciesId` mismatch, same eid twice, parent already in another active hatchery row, this hatchery already active.

**Files of interest:**
- `src/game/Sim/Structures/defs.ts:9,82-91` -- `StructureKind.Hatchery` enum + STRUCTURES row (wood: 8, buildTicks: 60, blocksPath: false).
- `src/game/Sim/components.ts:51-54` -- `Egg{speciesId, hatchTick}` and `CritterTrait{traitId}` components.
- `src/game/Sim/systems/breeding.ts` -- full state machine, `assignToHatchery`, `system_breeding`, `BREEDING_TRAITS` table.
- `src/game/Sim/tick.ts:24-50` -- `system_breeding` registration in both run-tick paths.
- `src/game/Sim/Critters/tame.ts:44-48` -- canonical "make a tamed critter" sequence reused inside `transitionToIdle`.
- `tests/sim/breeding.test.ts` -- 8 cases covering timings, validation, RNG determinism, save round-trip, and v3 missing-field migration.

**Observability hooks:**
- log: `'A hatchery egg is incubating.'` at `src/game/Sim/systems/breeding.ts:149` -- signals incubation -> hatching transition.
- log: `` `An egg hatched -- a level 1 ${name} joined the colony.` `` at `src/game/Sim/systems/breeding.ts:172` -- signals hatch -> idle transition.
- metric: none -- counts not exposed; query the world directly via `getHatcheries(sim)` or `defineQuery([Egg])`.
- trace: none -- single-process sim, no spans.

**Decision log:**
- 2026-05-20 | CMR-011 | Initial implementation. Egg modelled as an ECS entity (not just data on `HatcheryState`) so it round-trips through the existing entity codec and can later carry inventory/visual behaviour without re-plumbing.

**Last updated:** 2026-05-20 by CMR-011.
