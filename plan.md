# Crittermoor — Production-Grade Web Colony Sim with Tameable Critters

> Working title: **Crittermoor** (alternates: *Tameheart Frontier*, *Beastward*).
> Tagline: "Settle the wild moors. Tame the critters. Survive the storm."

## 1. Vision

A browser-playable RimWorld-style colony simulator set on the frontier of a Pokemon/Palworld-inspired world. Players guide a small band of settlers ("wardens") who scavenge, build, farm, and capture original **critters** (legally distinct monsters) used as labor, defense, and battle companions. Combat resolution is **critter-vs-critter** in a turn-based mini-engagement layered on top of the real-time colony sim.

Non-goals: no infringing names/sprites/sound; no online multiplayer in v1; no 3D.

## 2. Pillars

1. **Real-time tick sim** with pausable speed control (1x/2x/4x), like RimWorld.
2. **Tile + ECS** world: 256x256 chunked map, data-oriented for thousands of entities.
3. **Critter-driven economy**: every critter has a species archetype + traits + bond level; they work jobs (haul/mine/farm) and battle.
4. **Turn-based critter battles** triggered by raids/expeditions, with type matchups, moves, status, items.
5. **Web-first**: 60 FPS on a 2019 laptop, <5 MB initial bundle, save in IndexedDB, full offline play after first load.
6. **Asset pipeline via Codex**: original critter art (16x16/32x32 sprites + 64x64 portraits), tilesets, UI icons; deterministic prompts checked in.
7. **Sustainable code**: TypeScript strict, ECS (`bitecs`), pure systems, deterministic seeded RNG, web-worker pathfinding, 80%+ unit coverage on sim core.

## 3. Tech Stack (locked)

| Layer | Choice | Rationale |
|---|---|---|
| Language | TypeScript 5 strict | Type safety on a large sim |
| Bundler | Vite 5 | Fast dev, small prod bundles |
| Rendering | PixiJS v8 (WebGL2, WebGPU fallback ready) | Battle-tested 2D, sprite batching |
| ECS | `bitecs` | Data-oriented, fast, deterministic |
| UI Overlay | React 18 + Zustand | Familiar, isolated from canvas |
| Pathfinding | Custom A* in Web Worker, JPS optional | Off main thread |
| Persistence | IndexedDB via `idb` | Large saves, async |
| Audio | Howler.js | Cross-browser, simple |
| Tests | Vitest + Playwright (smoke) | Fast unit + browser smoke |
| Lint/Format | ESLint + Prettier | Standard |
| CI hooks | npm scripts (typecheck/lint/test/build) | No CI vendor lock |

## 4. Core Architecture

- **Sim core** (pure, deterministic): runs N ticks/sec independent of render frame.
- **ECS components**: `Position`, `Velocity`, `Renderable`, `Pawn`, `Critter`, `Needs`, `Inventory`, `Job`, `Path`, `Health`, `CombatStats`, `Faction`, `Schedule`, `Bond`, `Species`.
- **Systems** (per tick): NeedsDecay → JobAssignment → Pathing → Movement → WorkExecution → Combat → Reproduction → Time.
- **World**: 4-layer tile grid (terrain, floor, structure, item-stack), chunked 32x32, dirty-rect render.
- **Save format**: versioned JSON snapshot of component buffers + RNG state; migration registry.
- **Determinism**: single seeded `Mulberry32` RNG per save; all randomness routed through it.
- **Web Worker**: pathfinding requests + heavy queries; postMessage with transferable buffers.

## 5. MVP Scope (playable v0.1)

- 1 biome (Temperate Moor), 96x96 map.
- 3 wardens with traits, needs (food/sleep/rest), priorities tab.
- 6 starter species critters (Codex-designed): Spritmoth, Tindercub, Loamfin, Brackboar, Ferroquill, Mosskit.
- Jobs: chop wood, mine stone, haul, build (wall/floor/door/bed/table/stove/storage), cook, sow/harvest, hunt, tame.
- Day/night cycle (24 in-game min = 10 real min), passive temperature.
- Raid event timer; raid triggers turn-based battle scene with player critter team (max 4).
- Save/load, new game with seed, main menu, tutorial overlay.

## 6. Production Quality Bars

- 60 FPS sustained at 200 entities on mid-tier laptop (target: M1 Air baseline).
- Initial gzip bundle ≤ 600 KB JS + 1.5 MB assets streamed.
- Lighthouse perf ≥ 90 on the title screen.
- Zero unhandled promise rejections; error boundary around React + canvas.
- All sim systems unit-tested; battle resolver property-tested with `fast-check`.
- a11y: full keyboard nav for menus, screen-reader labels on critical UI, color-blind safe palette.

## 7. Codex Delegation Contract

Codex (running locally via `codex` CLI) handles:
- **Asset generation**: SVG/PNG sprites, tilesheet packing scripts, icon sets — prompts checked into `assets/_prompts/`.
- **Heavy logic stubs**: pathfinding micro-opts, battle damage formulas, procedural map gen variants — Codex drafts; main agent reviews and integrates.
- **Schema-bound generators**: critter species data files from a JSON schema.

Codex output lands in `generated/` and is promoted into `src/` only after a code-review pass.

## 8. Stories (execution order)

| ID | Story | Output |
|---|---|---|
| G001 | Research & Architecture Spec | `docs/spec.md`, `docs/architecture.md`, ADRs |
| G002 | Project Scaffold | Vite + TS + Pixi + bitecs + React + tests + scripts |
| G003 | World & Tilemap | chunked grid, terrain types, render culling, fog |
| G004 | ECS Core & Sim Loop | components, systems, tick scheduler, worker pathfinding |
| G005 | Pawns & Needs | needs decay, schedule, priorities UI |
| G006 | Job System | chop/mine/haul/build/cook/sow/harvest |
| G007 | Critter System | species data (Codex), capture, tame, bond, work assignment |
| G008 | Turn-Based Battle | scene, moves, types, status, AI |
| G009 | UI Shell | React panels (colonist, critter, build, work, schedule) |
| G010 | Save/Load + Procedural World Gen | versioned saves, biome gen, seed input |
| G011 | Asset Pipeline (Codex) | sprite/atlas generator, prompts, build step |
| G012 | Polish & Tutorial | first-run UX, balancing, audio, music loop |
| G013 | Production Hardening | perf budgets, error boundaries, Lighthouse pass, build opts |
| G014 | Final Quality Gate | ai-slop-cleaner, verification, code-review — ship |

## 9. Risks & Mitigations

- **Scope creep** → MVP scope frozen; new features go to a `BACKLOG.md`.
- **Performance** → ECS + spatial hash + worker pathfinding from day 1; perf budget in CI.
- **Asset legality** → all sprites generated from original-prompt set; no reference images of copyrighted creatures.
- **Long-horizon drift** → this `plan.md` + ledger via `omc ultragoal`; each story produces evidence.
