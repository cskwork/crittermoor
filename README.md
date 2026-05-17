# Crittermoor

> A browser-playable RimWorld-style colony sim with tameable creatures.
> **Settle the wild moors. Tame the critters. Survive the storm.**

Crittermoor blends a real-time colony simulator (build, haul, mine, cook, sow) with a turn-based monster-battle layer that fires for raids and expeditions. Every creature, structure, and tile is original art — no copyrighted designs.

**Status:** alpha (v0.2). Tracked via [`omc ultragoal`](.omc/ultragoal/) — 29 stories shipped across pre-alpha, alpha, and build/defense pushes.

## Try it

```bash
npm install
npm run dev
```

Open the URL Vite prints, type a seed (or keep the random one), click **New Game**.

```bash
npm run typecheck   # tsc strict
npm test            # vitest (42/42)
npm run lint        # ESLint (zero warnings)
npm run build       # production bundle to dist/
npm run verify      # all of the above except build
```

## Playable feature set

**Colony loop**
- 3 settlers ("wardens") with hunger / rest / joy / warmth needs and 8 skill tracks
- Utility-AI behavior: wardens auto-sleep when tired, auto-eat when hungry, pick the best job by skill + distance
- Tool-driven world interaction: Select, Chop, Mine, Build, Tame, Cancel (hotkeys `S C M B T X`)
- 96×96 procgen map with 8 terrain types (grass, dirt, sand, stone, mountain, forest, shallow/deep water)
- Day / night cycle (10 real-minute days) with tinted overlay and a nocturnal speed bonus for moonlit creatures

**Creatures**
- 6 starter species (Spritmoth, Tindercub, Loamfin, Brackboar, Ferroquill, Mosskit), each with two types from an 8-type wheel
- 16 moves spanning all types with status effects (burn, soak, quill, daze, snare, bloom)
- Wild packs roam the map. Weaken one in battle, then Shift+left-click to attempt a tame
- Tamed creatures follow their bonded warden and stay in your party

**Combat**
- 4v4 turn-based battles with party-row UI, move wheel (type-color borders + power/accuracy), switch, victory/defeat banner
- Deterministic damage formula with crit, effectiveness, and seeded RNG
- Raid scheduler triggers a battle every 4-8 in-game days; arrive at the colony, transition to the battle scene, return to the colony on resolution

**Build & defense**
- 6 structures: Wall, Door, Bed, Stove, Storage, Turret
- Wood / Stone resources from chop / mine; blueprints cost materials, cancel refunds 50%
- Wardens auto-walk to the nearest blueprint and construct it (skill bonus applies)
- Walls block pathfinding, doors pass; turrets auto-fire on hostile creatures within range 6

**Persistence**
- Versioned save format (v3) in IndexedDB with v1 → v2 → v3 migration chain
- Round-trip preserves seeded RNG state, designations, blueprints, structures, resources, and raid schedule

**UI**
- Toolbar (left), Resources HUD (top right), Events log (right), Selection inspector (bottom) with needs / skills / faction / critter bond
- 4-step interactive tutorial on first run
- Animated battle scene with HP bars, type chips, action log
- Keyboard: Space = pause · 1 / 2 / 3 = speed · S / C / M / B / T / X = tool · Esc = clear

## Tech stack

| Layer | Library |
|---|---|
| Language | TypeScript 5 strict |
| Bundler | Vite 5 |
| Rendering | PixiJS v8 (WebGL2) |
| ECS | bitecs (typed-array SoA) |
| UI shell | React 18 + Zustand |
| Persistence | IndexedDB via `idb` |
| Audio | Howler.js |
| Tests | Vitest + fast-check (property tests for the battle resolver) |

See [`docs/architecture.md`](docs/architecture.md) and the ADRs in [`docs/adr/`](docs/adr/) for the design rationale.

## Repo layout

```
src/
  main.tsx              entrypoint
  app/                  React shell, stores, error boundary, keybindings
  game/
    Game.ts             game orchestrator (sim + renderer + battle wiring)
    Renderer/           PixiJS layers — tilemap (chunked), entities, camera
    Sim/                ECS world + systems + tick loop
      Critters/         species data + spawn + tame
      Structures/       structure defs + spawn + path-cost helpers
      Battle/           battle state + sim + damage + type chart + moves
      Pathing/          A* (worker) + path client + cache
      Saves/            schema + codec + migrations + IndexedDB store
      systems/          needs, behavior, jobs, construct, turret, wild AI, raid, …
      Gen/              procedural world gen
    workers/            pathfinding worker
  ui/                   React panels + screens (title, HUD, battle, selection, toolbar, events, resources)
  assets/sprites/       all art — creatures, wardens, terrain, structures
  shared/               rng (Mulberry32), constants, types
docs/                   spec, architecture, ADRs
tests/sim/              vitest suite
```

## Performance

- ≤ 250 KB gzip JS bundle (Pixi + React + app + ECS + path worker)
- Sustained 60 FPS at 200+ entities on a 2020 M1 laptop
- Chunked tilemap with dirty-hash repaint, web-worker pathfinding, fixed-step tick with render interpolation

## Determinism

Every gameplay roll (procgen, AI, battle damage, raid roster, tame success) routes through a single seeded `Mulberry32` RNG. The RNG state is part of the save, so reloading and replaying the same actions produces identical outcomes. The battle property tests in [`tests/sim/battle.test.ts`](tests/sim/battle.test.ts) lock this down with `fast-check`.

## Roadmap

Not yet in: needs-based bed targeting, stove cooking, stockpile zones, weather, more biomes / species, mod tooling, multiplayer. The work plan that produced the current build lives in [`plan.md`](plan.md), [`plan-alpha.md`](plan-alpha.md), and [`plan-build.md`](plan-build.md).

## License

TBD.
