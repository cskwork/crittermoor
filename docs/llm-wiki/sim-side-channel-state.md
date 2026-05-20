# Sim Side-Channel State (hidden `SimWorld` fields)

## Getting the Feel (For Beginners)

### Why side-channel state exists

Most game state lives inside the ECS (entities + components). But some state isn't a "thing on the map" -- it's a small bookkeeping record like "when is the next raid scheduled?" or "which two critters are paired at this hatchery and how far through incubation are they?" Stuffing that into ECS components would be over-engineered, but stuffing it into module-level globals would break saves and replays. The side-channel pattern is the middle road: hide a normal JS object on the `SimWorld` itself, and expose it only through a pair of getters.

The simplest way for a beginner to picture it:

`SimWorld -> hidden field (_raid, _hatcheries) -> getter/setter -> codec round-trip`

There are five terms you need to internalise at this stage.

| Term | Plain-English meaning |
|---|---|
| SimWorld | The big object that owns the ECS plus tick counter, RNG, events. It's the "world handle" passed to every system. |
| Side-channel | An optional JS field tucked onto SimWorld next to the ECS (e.g. `_raid`, `_hatcheries`). Not visible to bitecs at all. |
| Getter / Setter | A small `getRaidState(sim)` / `setRaidState(sim, x)` pair -- the only legal way for outside code to read or write the side-channel. |
| Codec | The save serializer/deserializer. It calls the getter on save, calls the setter on load. |
| Eid remap | Because saved entity ids are renumbered on load, any side-channel field that holds an eid must be translated through `eidRemap` in a second pass. |

To make it concrete:

The raid system needs to remember "next raid lands at tick 1800". That's one number -- too small to be a component, too important to lose on save. The raid system stores it as `sim._raid = { nextRaidTick: 1800, scheduled: true }`. Outside callers only ever go through `getRaidState(sim)` / `setRaidState(sim, x)`, so nobody is tempted to add new fields directly. The save codec serializes it into a `raid?` field on the save doc and reverses the process on load. CMR-011 added a second instance of the same pattern for hatcheries.

The decision rule that matters at this stage:

**Just remember this: if your new state is a small bookkeeping object that doesn't belong on any single entity, hide it on `SimWorld`, expose two getters, and let the codec round-trip it.**

When you're ready to go deeper, read [save-v3-additive-fields](save-v3-additive-fields.md) and the raid implementation at `src/game/Sim/systems/raid.ts:17-35`.

## Technical Reference

**Summary:** A small piece of non-entity state that needs to survive saves is stored as an optional, prefix-underscored field on the `SimWorld` (e.g. `_raid`, `_hatcheries`). The field is reached only via a `SimWith<Name>` interface widening + a `getX(sim)` / `setX(sim, value)` pair declared in `src/game/Sim/world.ts`. The save codec calls the getter on serialize and the setter on deserialize. References to entity ids inside the side-channel state must be remapped through `eidRemap` in the codec's second pass.

**Invariants & Constraints:**
- Field name is `_<concept>` (underscore prefix). Outside `world.ts` nobody dereferences it directly.
- The getter returns `null` when absent -- callers must coalesce (`?? []` or `?? defaultState`).
- The setter is the only writer outside the system that owns it. Systems can mutate items in the returned list/object in place, but they should not introduce new fields without updating the codec.
- All entity ids inside the side-channel state are remapped through `eidRemap` AFTER the entity restore pass. Rows whose remap target is missing are silently dropped (same pattern the Bond restore uses).
- The pattern is for small bookkeeping objects, not bulk data. A side-channel that grows unbounded should become a component or a separate ECS sub-world.

**Files of interest:**
- `src/game/Sim/systems/raid.ts:17-35` -- first instance: `SimWithRaid`, `getRaidState`, `setRaidState`.
- `src/game/Sim/world.ts:74-83` -- second instance: `SimWithHatcheries`, `getHatcheries`, `setHatcheries` (hatcheries getter lives in `world.ts` because the breeding system imports the type from there).
- `src/game/Sim/Saves/codec.ts` -- both side-channels are serialized (`getRaidState(sim)`, `getHatcheries(sim)`) and remapped on the second pass with `eidRemap`.
- `src/game/Sim/Saves/schema.ts` -- both fields appear as optional on the save doc (`raid?` inherited via V2, `hatcheries?` declared on V3).

**Observability hooks:**
- none -- pattern itself has no events or metrics; observability belongs to the owning system (raid, breeding).

**Decision log:**
- 2026-05-20 | CMR-011 | Promoted from "single-use raid trick" to a named pattern after adding the second instance (`_hatcheries`). Documented to make it easier for future tickets to choose this over component sprawl.
- 2026-05-20 | CMR-013 | Added the third instance (`_trader`, see `src/game/Sim/systems/trader.ts`). Three instances now confirm the shape; do not abstract -- N=3 is still cheaper to clone than to factor. Trader also produced a codec gotcha when a bonded eid was set to the bitecs sentinel `0`; captured separately in [bond-partnereid-sentinel](bond-partnereid-sentinel.md).

**Last updated:** 2026-05-20 by CMR-013.
