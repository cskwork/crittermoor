# Crittermoor

> A browser-playable RimWorld-style colony sim with tameable critters.
> Settle the wild moors. Tame the critters. Survive the storm.

Crittermoor blends a real-time colony simulator (build, haul, mine, cook, sow) with a turn-based critter battle layer that fires for raids and expeditions. Every visual asset is original (no copyrighted creatures).

**Current status:** pre-alpha — actively building MVP per `docs/spec.md`. Tracked via `omc ultragoal` (see `.omc/ultragoal/`).

## Quick start

```bash
npm install
npm run dev          # vite dev server
npm run typecheck    # tsc strict
npm run test         # vitest
npm run build        # production bundle into dist/
```

Open the URL printed by `npm run dev`, enter a seed (or keep the random one), click **New Game**.

## Tech stack

| Layer | Library |
|---|---|
| Language | TypeScript 5 strict |
| Bundler | Vite 5 |
| Rendering | PixiJS v8 |
| ECS | bitecs |
| UI | React 18 + Zustand |
| Persistence | IndexedDB via `idb` |
| Audio | Howler.js |
| Tests | Vitest, fast-check, Playwright |

See [docs/architecture.md](docs/architecture.md) and the ADRs under [docs/adr/](docs/adr/) for the why.

## Repo layout

```
src/
  main.tsx          entrypoint
  app/              React shell + Zustand stores
  game/             Game orchestrator
    Renderer/       PixiJS scene
    Sim/            ECS world, systems, tick loop
  ui/               React panels & screens
  shared/           rng, constants, types
  workers/          pathfinding worker
tests/sim/          vitest unit tests
docs/               spec + architecture + ADRs
tools/codex-gen/    Codex prompt drivers for assets
generated/          Codex output (pre-promotion)
```

## Working on it

The 14-story plan lives in `.omc/ultragoal/goals.json`. Run:

```bash
omc ultragoal status              # see progress
omc ultragoal complete-goals      # get next-story handoff
```

Codex (`codex` CLI) is used for:
- original critter / tileset / icon generation (`tools/codex-gen/`)
- schema-bound species data files
- heavier logic sketches that the main agent reviews and integrates

## License

TBD (asset provenance is recorded per-batch in `generated/<batch>/manifest.json`).
