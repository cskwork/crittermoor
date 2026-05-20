# Save v3 -- Additive Fields (no version bump)

## Getting the Feel (For Beginners)

### Why additive save fields exist

Player saves are sacred -- a save written by an older build must still load. Bumping the save version forces writing a migration step, which is heavy. For small additions (a new optional bookkeeping field, a new optional per-entity flag) there is a much cheaper trick: declare the new field as **optional** on the existing version. Old saves with the field missing keep loading because the deserializer treats `undefined` as "default" (usually an empty list).

The simplest way for a beginner to picture it:

`Old save missing new field -> deserializer sees undefined -> applies empty default -> world boots cleanly`

There are five terms you need to internalise at this stage.

| Term | Plain-English meaning |
|---|---|
| SaveDoc | The plain JSON object that represents a save on disk. Versioned (V1 / V2 / V3). |
| Additive field | A new optional property added to an existing version -- never required. Old saves omit it, new saves include it. |
| Migration | The code path that upgrades old SaveDoc shapes to the current one. Lives in `migrations.ts`. Adding an optional field DOES NOT need a migration. |
| Eid remap | Saved entity ids are renumbered on load; any field that points at an eid must be translated through `eidRemap`. |
| Second pass | A loop the codec runs AFTER all entities exist, used to wire up references (Bond, hatchery parents, egg eid) that need the remap. |

To make it concrete:

CMR-011 added a new top-level field `hatcheries?: HatcheryStateSnap[]` to `SaveDocV3`, and two optional per-entity fields `egg?` and `trait?`. A save written before CMR-011 lacks all three. On load the deserializer sees `doc.hatcheries === undefined`, calls `setHatcheries(sim, [])` (or skips the call entirely), and the world boots with zero hatcheries. No version bump, no migration code, no broken saves.

The decision rule that matters at this stage:

**Just remember this: if the new field is optional and "missing" maps cleanly to a sensible default, you can add it to the current save version without bumping; bump only when an existing field's shape or meaning changes.**

When you're ready to go deeper, read [sim-side-channel-state](sim-side-channel-state.md) and the raid precedent at `src/game/Sim/Saves/schema.ts:50-52`.

## Technical Reference

**Summary:** Three knobs to set when adding an additive field to `SaveDocV3`:
1. Declare it optional on the schema (TypeScript `?`).
2. On serialize, write it when state is present; skip it when state is empty.
3. On deserialize, default to empty when the field is absent. If the field carries eids, remap them via `eidRemap` in the second pass and drop rows whose target eid is missing.

**Invariants & Constraints:**
- New fields MUST be optional (`field?: T`). A required field would silently break older v3 saves.
- "Missing" must map to a behaviour-preserving default -- usually `[]` or `null`. If no sensible default exists, do not use this pattern: bump the version and write a migration.
- Eid remap rows with `eidRemap.get(oldEid) === undefined` are dropped, never thrown -- mirrors the Bond restore (`src/game/Sim/Saves/codec.ts` second pass).
- Multiple side-channel state objects must each be serialized AND remapped independently. Order in the codec is: entities -> re-link references -> side-channel state restore.
- Do not duplicate inherited fields. `raid?` is declared on `SaveDocV2` and inherited by V3 via `extends Omit<SaveDocV2, 'version'>` -- V3 should not redeclare it.
- `SAVE_VERSION = 3` stays at 3 for additive changes. Only bump when an existing field changes shape, semantics, or default.

**Files of interest:**
- `src/game/Sim/Saves/schema.ts:1` -- `SAVE_VERSION = 3`.
- `src/game/Sim/Saves/schema.ts:15` -- `EntitySnapshot.trait?` (per-entity additive field).
- `src/game/Sim/Saves/schema.ts:50-59` -- V1 -> V2 (`raid?`) -> V3 (`hatcheries?`) inheritance chain.
- `src/game/Sim/Saves/codec.ts` -- serialize/deserialize pipeline; second pass is the only safe place to dereference eids that come from outside the entity restore.
- `src/game/Sim/Saves/migrations.ts` -- only used for shape changes between versions, NOT for adding optional fields.
- `tests/sim/breeding.test.ts` -- the "v3 doc without `hatcheries` field loads with empty list" case is the canonical regression check for this pattern.

**Observability hooks:**
- none -- codec is a pure transform.

**Decision log:**
- 2026-05-20 | CMR-011 | Two additive fields (`hatcheries?`, `EntitySnapshot.egg?`, `EntitySnapshot.trait?`) added to V3 without a version bump. The "v3 missing field loads empty" test was the first regression to write.
- 2026-05-20 | CMR-012 | Exception: bumped to v4 for the fog `Uint8Array` even though `fog?: string` would have satisfied the additive rule. Driver was the acceptance text (`Save v4 (or piggy-back on weather v4): persist Fog with simple RLE`) plus the introduction of an RLE encoder in the pipeline. New companion entry [save-format-versioning](save-format-versioning.md) covers the bump case end-to-end.

**Last updated:** 2026-05-20 by CMR-012.
