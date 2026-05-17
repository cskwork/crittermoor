# ADR 0001 — Tech Stack

**Status:** Accepted (2026-05-17)

## Context
We need a web-only, performant, statically deployable game with a long shelf life.

## Decision
- TypeScript 5 (strict)
- Vite 5 build
- PixiJS v8 for 2D rendering (WebGL2 primary)
- `bitecs` for ECS
- React 18 + Zustand for UI overlay
- Vitest + Playwright for tests
- ESLint + Prettier
- Howler.js for audio
- `idb` for IndexedDB persistence

## Alternatives considered
- **Phaser 3**: more batteries (input, scene mgmt, tween) but heavier, opinionated scene model conflicts with our React-shell + Pixi-canvas split.
- **Three.js**: overkill — 2D is the design intent.
- **Godot HTML5 export**: large runtime (~20 MB wasm), poor React interop.
- **Unity WebGL**: enormous initial download; long compile times.
- **Svelte UI**: smaller bundles but React's ecosystem (a11y libs, dev tooling) wins for now.

## Consequences
- Smaller bundle than full game engines.
- We own the scene/asset/input pipeline ourselves — more code, more control.
- React for menus keeps DOM a11y story strong.
