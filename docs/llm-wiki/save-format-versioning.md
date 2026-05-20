# Save Format Versioning (Bump Case)

This entry covers the case where you MUST bump `SAVE_VERSION`. For the
opposite case (adding optional fields without a bump), read
[save-v3-additive-fields](save-v3-additive-fields.md) first -- the two
together describe the full save-evolution contract.

## Getting the Feel (For Beginners)

### Why save versioning exists

A save file is a snapshot of the whole simulation. Every time we add a new
piece of state that cannot be represented as an optional JSON field
(typically a packed binary blob -- terrain, cost, fog), the snapshot's
deserialise pipeline changes and we need a controlled way to upgrade old
saves. The version number is how the loader knows which migration steps
to run.

The simplest way for a beginner to picture it:

`Core flow: serialize at SAVE_VERSION -> bump version on each pipeline-changing addition -> migrateToCurrent chains vKToVK+1 -> deserialize trusts the current shape`

There are five terms you need to internalise at this stage.

| Term | Plain-English meaning |
|---|---|
| `SAVE_VERSION` | A single integer that records "this is what saves look like right now". Bumps by 1 when the pipeline changes. |
| `SaveDocVN` | A TypeScript interface describing exactly what a v*N* save looks like. We keep all of them around -- never delete an old one. |
| Migration | A pure function `SaveDocVK -> SaveDocVK+1` that adds new fields with safe defaults. |
| `migrateToCurrent` | A small chain that walks an incoming save up one version at a time until it matches `CurrentSaveDoc`. |
| Backfill default | The value an old save gets for a field that didn't exist when it was written. |

To make it concrete:

We ship v3 with `resources` (wood/stone) on the doc. A player saves. CMR-012
later adds a fog `Uint8Array` -- a binary blob, not a plain JSON field --
which needs a base64 RLE encoding step in serialize/deserialize. That
pipeline change forces a version bump. The loader sees `version: 3`, runs
`v3ToV4` which adds `fog: undefined`, and deserialize sees no fog string so
it leaves the freshly-allocated zero buffer alone. The player rejoins with
resources intact and a completely fogged map, which is the right behaviour
(no warden has scouted yet from the loaded sim's point of view).

The decision rule that matters at this stage:

**Just remember this: bump when the serialise/deserialise pipeline changes (binary blob, new encoder, changed semantics). Stay on the current version when it's just an optional JSON field -- see [save-v3-additive-fields](save-v3-additive-fields.md).**

## Technical Reference

**Summary:** Three files own the contract. `schema.ts` declares the version
constant and every `SaveDocVN` interface. `migrations.ts` registers the
ordered chain of pure migrators and exposes `migrateToCurrent`.
`codec.ts` owns `serialize` / `deserialize` plus binary helpers
(`b64encode`, `b64decode`, `packUint16LE`, `unpackUint16LE`, `rleEncode`,
`rleDecode`). Deserialize always migrates the incoming doc to current before
hydrating the sim.

**Invariants & Constraints:**
- `SAVE_VERSION` is strictly monotonic -- never reuse a number, never decrement.
- Each migration is pure: `SaveDocVK -> SaveDocVK+1` with no side effects, no I/O, no randomness.
- New fields must be optional (or have a safe default supplied in the prior version's migration). Never assume the field is present in any historical version.
- The current `createSimWorld` MUST initialise every field so an empty or corrupted save still produces a valid sim -- migrations only translate shape, allocation lives in the world builder.
- Binary blobs are little-endian. RLE is `(value u8, runLen u16-LE)` 3-byte pairs; decoder clamps writes to `expectedLen` so a malformed save cannot overflow the output buffer.
- When in doubt between bump and additive: a Uint8Array / Uint16Array blob always bumps; an optional record / array / scalar usually does not. The bump for CMR-012 was driven by acceptance text, not by the additive rule failing.

**Files of interest:**
- `src/game/Sim/Saves/schema.ts:1,22-58` -- `SAVE_VERSION`, every `SaveDocVN`, `SaveDoc` union, `CurrentSaveDoc`.
- `src/game/Sim/Saves/migrations.ts:6-36` -- `migrateToCurrent` chain plus each `vKToVK+1`.
- `src/game/Sim/Saves/codec.ts:182-259` -- binary helpers: `packUint16LE` / `unpackUint16LE`, `b64encode` / `b64decode`, `rleEncode` / `rleDecode`.
- `tests/sim/migrations.test.ts` -- pattern for "serialize current, downgrade fixture to vK, deserialize, assert post-migration shape".
- `tests/sim/saves.test.ts` -- round-trip pattern (serialize -> deserialize -> assert byte-equal).
- `tests/sim/fog.test.ts` -- the v4 bump's regression net (5 cases incl. v3 fixture migration).

**Adding a new version (checklist):**
1. Add `SaveDocVK+1 extends Omit<SaveDocVK, 'version'> { version: K+1; <new fields> }` in `schema.ts`.
2. Extend the `SaveDoc` union and re-point `CurrentSaveDoc`.
3. Bump `SAVE_VERSION` to `K+1`.
4. Add `vKToVK+1` in `migrations.ts` and append `if (cur.version === K) cur = vKToVK+1(cur)` before the current-version return.
5. Update `serialize` / `deserialize` for the new fields (binary blob -> base64 string, then back).
6. Update existing tests that assert `doc.version === K` to expect `K+1` (CMR-012's bump touched `build.test.ts`, `migrations.test.ts`, `raid.test.ts`).
7. Add a round-trip test for the new field AND a vK-fixture migration test that asserts the backfill default.

**Observability hooks:**
- none -- saves are local files, no metric/log/trace. Failure surfaces as a thrown error from `migrateToCurrent` (`unsupported save version after migration: <N>`).

**Decision log:**
- 2026-05-20 | CMR-012 | added v4 + RLE codec for fog. Chose RLE over 2-bit packing because acceptance said "simple RLE" and realistic disc-revealed maps compress to a handful of bytes. Cross-link added to `save-v3-additive-fields` since the two entries together cover the full bump-vs-additive decision tree.

**Last updated:** 2026-05-20 by CMR-012.
