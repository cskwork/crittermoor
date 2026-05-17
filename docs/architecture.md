# Crittermoor — Technical Architecture

## 1. Layered Overview

```
┌──────────────────────────────────────────────────────────────┐
│  React UI Shell (menus, panels, HUD)        Zustand stores   │
├──────────────────────────────────────────────────────────────┤
│  Render Layer (PixiJS v8)   ← interpolates between sim ticks │
├──────────────────────────────────────────────────────────────┤
│  Sim Core (deterministic)                                     │
│   - ECS (bitecs)                                              │
│   - Systems: Needs, Jobs, Path, Move, Work, Combat, Time      │
│   - Seeded RNG (Mulberry32)                                   │
├──────────────────────────────────────────────────────────────┤
│  Web Worker: Pathfinding (A*) + heavy queries                 │
├──────────────────────────────────────────────────────────────┤
│  Persistence (IndexedDB via idb) + Asset Cache (Cache API)    │
└──────────────────────────────────────────────────────────────┘
```

Render layer never mutates sim state. UI never reads ECS buffers directly — it subscribes to selector snapshots published per tick.

## 2. Module Layout

```
src/
  main.tsx              entrypoint — boots React + PixiJS
  app/
    App.tsx             root React tree
    routes.ts           title / new-game / in-game / battle
    stores/             zustand stores (uiStore, selectionStore, alertsStore)
  game/
    Game.ts             owns sim + renderer, tick loop
    Renderer/
      Renderer.ts       PixiJS app, viewport, layers
      TilemapView.ts    chunked tilemap rendering
      SpriteAtlas.ts    atlas + animation
      BattleView.ts     battle scene renderer
    Sim/
      world.ts          ECS world, components, RNG
      components.ts     bitecs components
      systems/          one file per system
        needs.ts
        jobs.ts
        pathing.ts
        movement.ts
        work.ts
        combat.ts
        time.ts
        ai.ts
      Tilemap.ts        terrain layers, chunk index
      Pathing/          A* impl + worker bridge
        AStar.ts
        worker.ts
      Battle/
        BattleSim.ts    pure turn resolver
        moves.ts
        types.ts
      Saves/
        schema.ts
        save.ts
        migrations/
      Gen/
        worldGen.ts     terrain procgen
        critterGen.ts   species + roll
      Critters/
        species.ts      data tables (Codex-generated)
        bond.ts
  ui/
    components/         shared React components
    panels/             ColonistPanel, CritterPanel, BuildMenu, WorkTab, Schedule, EventsLog
    battle/             BattleHUD, MoveWheel, PartyRow
    icons/              SVG icon set
  shared/
    types.ts
    constants.ts
    rng.ts
    spatial.ts          spatial hash
  workers/
    path.worker.ts
  assets/
    sprites/            atlas-packed PNGs (built by tooling)
    audio/              ogg loops + sfx
    fonts/
tools/
  asset-pack.ts         build-step atlas packer
  codex-gen/            codex prompt drivers (CLI scripts)
docs/
  spec.md
  architecture.md
  adr/
tests/
  sim/                  vitest unit tests
  battle/               property tests (fast-check)
  e2e/                  playwright smoke
```

## 3. ECS Component Schema (bitecs)

| Component | Fields |
|---|---|
| `Position` | x:f32, y:f32 |
| `TilePos` | tx:i16, ty:i16 |
| `Velocity` | vx:f32, vy:f32 |
| `Renderable` | spriteId:u16, layer:u8, tint:u32 |
| `Pawn` | flags:u8, mood:i8 |
| `Needs` | food:u8, rest:u8, joy:u8, warmth:u8 |
| `Skills` | construct:u8, mine:u8, cook:u8, plant:u8, tame:u8, combat:u8, medicine:u8, craft:u8 |
| `Critter` | speciesId:u16, level:u8, xp:u32, bond:u8 |
| `Health` | hp:i16, maxHp:i16, downed:u8 |
| `CombatStats` | atk:u8, def:u8, satk:u8, sdef:u8, spd:u8 |
| `Inventory` | slotItem[8]:u16, slotQty[8]:u16 |
| `Job` | kind:u8, targetEid:u32, state:u8, progress:u16 |
| `Path` | nodeCount:u16, cursor:u16, nodesPtr:u32 |
| `Faction` | id:u8 |
| `Schedule` | slots[24]:u8 |
| `Bond` | partnerEid:u32, level:u8 |
| `Wild` | aggression:u8, packId:u16 |

Tags (zero-size): `IsWarden`, `IsCritter`, `Selected`, `Hostile`, `Player`, `Sleeping`, `InBattle`, `Dead`.

Queries are precomputed and reused.

## 4. Tick Loop

```ts
function tick(dt: number) {
  rng.seed = world.rngState
  system_time(world)
  system_needs(world)
  system_jobs(world)         // assigns Job to idle pawns
  system_path_request(world) // posts to worker, reads back results
  system_movement(world)
  system_work(world)         // progresses Job
  system_ai(world)           // wild critters
  system_combat(world)       // melee on-map
  world.rngState = rng.seed
  publishSelectors(world)    // diff & push to Zustand
}
```

- Fixed tick interval (125ms at 1x). Accumulator pattern with up to 5 catch-up ticks per frame.
- Render `Position` is interpolated from `Position_prev` + `Position` by alpha.
- Pause: tick scheduler halts; render keeps running.

## 5. Pathfinding

- A* on the tile grid with 4 or 8 connectivity (8 with corner-cut prevention).
- Heuristic: octile distance.
- Cost: terrain cost + structure penalty + door open/closed.
- Runs in `path.worker.ts`. Main thread posts `{requestId, fromTx, fromTy, toTx, toTy, faction}`, worker replies with `{requestId, nodes:Int16Array}`.
- Cached map snapshots: worker keeps a dirty-rect mirror of the cost grid; main thread sends only deltas.

## 6. Determinism & RNG

- Single `Mulberry32` instance per save. All randomness (proc-gen, AI rolls, battle damage) draws from it.
- RNG state serialized into save file. Replays of same seed + same inputs are bit-identical.

## 7. Save Format

```jsonc
{
  "version": 1,
  "seed": 1234567890,
  "tick": 4321,
  "rngState": 998877,
  "world": { /* tile arrays as base64 */ },
  "entities": [
    { "eid": 7, "components": { "Position": {"x":12.5,"y":8.0}, "Pawn": {...} } }
  ],
  "research": [...],
  "stats": {...}
}
```

Save migrations live in `src/game/Sim/Saves/migrations/v{n}-to-v{n+1}.ts`. `load` walks migrations forward.

## 8. Performance Budgets

| Metric | Budget |
|---|---|
| Initial JS gzip | ≤ 600 KB |
| First asset bundle | ≤ 1.5 MB |
| Sustained FPS (200 entities) | ≥ 60 |
| Tick CPU at 1x | ≤ 6 ms |
| Pathfinding p95 (worker) | ≤ 20 ms |
| Memory (steady-state) | ≤ 250 MB |

Hooks: `performance.mark` around each system; debug overlay shows ms/system.

## 9. Testing Strategy

- **Sim core**: pure functions where possible; vitest covers each system in isolation with a hand-built world.
- **Battle**: fast-check property tests on damage formula invariants (e.g., type-multiplier symmetry, damage monotonicity in ATK).
- **Pathfinding**: golden tests on canned maps.
- **Save/load**: round-trip equality on a fixture world.
- **E2E**: Playwright headless — new game, place a wall, save, reload, verify wall present.
- Coverage gate: ≥ 80% on `src/game/Sim/**`.

## 10. Asset Pipeline (Codex-driven)

- `tools/codex-gen/` contains node scripts that invoke the `codex` CLI with deterministic prompts.
- Each generation run writes outputs to `generated/<batch>/` with a manifest.
- Promotion: code-review pass moves accepted assets into `src/assets/sprites/` and the species/icon data files.
- `tools/asset-pack.ts` packs sprites into atlases using `free-tex-packer-core` (or hand-rolled MaxRects) and emits JSON metadata.
- Atlases referenced by stable `spriteId` constants so code is decoupled from filenames.

## 11. Error Handling

- React `<ErrorBoundary>` around UI shell, with "Save & Send Report" fallback.
- `window.onerror` + `unhandledrejection` listeners route to a logger; in dev they fail loud, in prod they show a non-blocking toast.
- Sim systems are wrapped in a try/catch per system per tick — a system fault freezes the sim and surfaces a recoverable alert, never crashes the page.

## 12. Build & Deploy

- `vite build` → static `dist/` deployable to any static host (GH Pages, S3 + CloudFront, Vercel, Netlify).
- No backend in v1. Saves stay in IndexedDB; export/import JSON via a UI button.
- Service worker (Workbox) for full-offline play after first load (post-MVP).
