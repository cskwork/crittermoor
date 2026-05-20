# Fog of War

## Getting the Feel (For Beginners)

### Why fog of war exists

Without fog the player sees every tile and every wild critter on day one,
which kills the exploration tension a colony sim is supposed to have. Fog is
the layer that hides what the player has not yet walked close enough to see.
It only affects what the renderer draws — the simulation under the hood keeps
running with full information.

The simplest way for a beginner to picture it:

`Core flow: warden moves -> fog system scans visible disc -> fog grid updates -> renderer paints dim/black -> wild critters off-visible are hidden`

There are five terms you need to internalise at this stage.

| Term | Plain-English meaning |
|---|---|
| Fog grid | One byte per tile (`0` unseen / `1` explored / `2` visible) -- the source of truth for what is hidden. |
| Vision radius | How far one warden can see; default 8 tiles, measured as a circle around the warden. |
| Explored | A tile the player has seen before but no warden currently sees -- it shows at 50% brightness. |
| Pre-pass | The first thing the fog system does each tick: drop every `visible` tile back to `explored` before re-marking. |
| Monotonic reveal | Once a tile is explored it never goes back to unseen -- fog only forgets *current* visibility, not memory. |

To make it concrete:

A new game starts with a completely black map. Your two wardens spawn near
the centre and the disc around them reveals immediately. You order one to
chop wood in the east -- as it walks, tiles ahead of it brighten and the
tiles it leaves behind fade to 50% (still remembered, just not currently
watched). A wild critter that was on a tile your warden could see suddenly
wanders north into never-explored terrain -- its sprite simply disappears.

The decision rule that matters at this stage:

**Just remember this: fog is a UX layer painted by the renderer -- no AI, jobs, or pathfinding ever read it.**

When you're ready to go deeper, read [save-format-versioning](save-format-versioning.md) for how fog gets persisted across saves.

## Technical Reference

**Summary:** A `Uint8Array` lives on `TileMap.fog`, indexed `y * width + x`,
values in `{0, 1, 2}`. The sim runs `system_fog` each tick: it pre-passes
`2 -> 1`, then re-marks `2` inside an inclusive Euclidean disc around every
player-faction warden. A dedicated Pixi `FogLayer` (chunked-hash, mirroring
`TilemapView`) paints black `alpha=1` over unseen tiles and black `alpha=0.5`
over explored tiles. `EntityLayer` skips Wild critters on tiles where
`fog !== 2`, and saves persist the grid as base64-encoded RLE in `SaveDocV4`.

**Invariants & Constraints:**
- Reveal is monotonic: `0 -> {1,2}`; `2 -> 1` each pre-pass; `1` stays `1` unless re-revealed to `2`. A tile never goes back to `0`.
- AI, jobs, and AStar MUST NOT read `sim.map.fog`. The contract is documented at `src/game/Sim/systems/fog.ts:9-10`.
- Vision math is Euclidean inclusive, `dx*dx + dy*dy <= R*R` with `R = VISION_RADIUS = 8`. Matches the turret range idiom (`src/game/Sim/systems/turret.ts:33,42`).
- "Line-of-sight" in the ticket title was NOT extended to raycasting against walls -- acceptance specified only radius. A future LOS ticket would have to add ray walking on top.
- Renderer mount order is fixed: `tilemap -> entities -> FogLayer -> overlay`. The designation overlay stays on top so the player's own chop/mine marks remain visible through fog.

**Files of interest:**
- `src/game/Sim/world.ts:8-15,43-55` -- `TileMap.fog` field and zero allocation in `createSimWorld`.
- `src/game/Sim/systems/fog.ts:14-44` -- `system_fog`: pre-pass + warden disc rewrite.
- `src/game/Sim/tick.ts` -- runs `system_fog` after `system_path_follow` in both `makeRunTick` and headless `runTick`.
- `src/game/Renderer/FogLayer.ts:10-77` -- chunked-hash paint, exact mirror of `TilemapView`.
- `src/game/Renderer/Renderer.ts` -- mounts/updates/disposes `FogLayer` between `EntityLayer` and `overlay`.
- `src/game/Renderer/EntityLayer.ts` -- Wild gate: `hasComponent(Wild) && fog[idx] !== 2` skips `seen.add` so the cleanup pass destroys the node.
- `src/game/Sim/Saves/codec.ts:218-259` -- `rleEncode` / `rleDecode` (3-byte pair: `value u8 + runLen u16-LE`).
- `src/game/Sim/Saves/schema.ts:1,50-54` -- `SAVE_VERSION = 4`, `SaveDocV4.fog?: string`.
- `src/game/Sim/Saves/migrations.ts:10,33-36` -- `v3ToV4` defaults `fog: undefined` (deserialize keeps the zero buffer).
- `tests/sim/fog.test.ts` -- 5 cases: disc reveal, monotonicity, round-trip, v3 migration, Wild gate.

**Observability hooks:**
- none -- pure deterministic sim; visual presence on screen and the Vitest suite are the only observability surface.

**Decision log:**
- 2026-05-20 | CMR-012 | initial entry. Chose Option B (dedicated `FogLayer` + RLE save v4) over inlining the second graphics into `TilemapView` or naive full-canvas repaint. Euclidean over Chebyshev for consistency with `turret.ts:33,42`. RLE over 2-bit packing because acceptance said "simple RLE" and realistic payloads are a handful of bytes.

**Last updated:** 2026-05-20 by CMR-012.
