# Changelog 2026-06-03 — Realism + UI/UX + Mobile (priorities 1-3)

Source: deep-research report `docs/research/2026-06-03-realism-uiux-mobile.md`.
Constraint honored: everything stays client-side → runs on GitHub Pages / Vercel static hosting (no server, no COOP/COEP headers).

## Priority 1 — Mobile touch navigation

Decision: extend the existing `Camera` class with touch gestures instead of adding `pixi-viewport`.
Why: a working custom camera (pan + wheel zoom) already exists; extending it is surgical, adds zero dependencies (keeps the bundle lean for static hosting), and avoids pixi-viewport's Safari pinch plugin. The research's validated facts (DOM touch events, gesture types) apply equally to a hand-rolled solution.

- `src/game/Renderer/Camera.ts`: single-finger drag-pan + two-finger pinch-zoom (anchored on the midpoint, with two-finger pan). Mouse/pen paths unchanged; touch branches off `pointerType`.
- `src/app/index.css`: `.canvas-host { touch-action: none; overscroll-behavior: none }` — the modern way to hand all gestures to the camera. Research confirmed `preventDefault()` is NOT required (refuted 0-3), so we rely on CSS, not event suppression.
- `index.html`: viewport meta `maximum-scale=1, user-scalable=no, viewport-fit=cover` so the browser's own pinch-zoom doesn't fight the game's.

## Priority 2 — Emergent pawn psychology (traits + thoughts + probabilistic breaks)

Modeled on RimWorld's verified mood/break system (mood = baseline + net thoughts; trait-shifted probabilistic break tiers).

Determinism strategy (replay + save/reload tests must stay green):
- Trait roll uses a LOCAL rng derived from `(seed, eid)`, NOT `sim.rng` → worldgen's shared RNG stream is untouched, so all existing worldgen-dependent tests stay identical.
- Break rolls use `sim.rng` (gameplay randomness, replay-tracked). Test scenarios keep moods high → no breaks → no extra RNG draws → determinism preserved.
- Trait + mood are PERSISTED (additive save v5) so a reloaded pawn equals a never-saved pawn exactly. `eid` is reassigned on load, so an eid-derived trait would be unstable — persistence is required for correctness.

Files:
- `components.ts`: new `Mind { trait }` component.
- `systems/mind.ts` (new): `Trait` enum (Optimist/Pessimist/Steadfast/Nervous + None), trait defs (moodBias + breakShift), `rollTrait(seed, eid)`, thought catalog + `applyThought`, `system_mind` (eases mood toward needs+trait baseline, then trait-shifted 3-tier probabilistic break via `Pawn.flags` BREAK_FLAG). Runs on a 60-tick cadence.
- `systems/needs.ts`: mood logic removed (now owned by `system_mind`); keeps needs decay only.
- `systems/behavior.ts`: mental break is now flag-driven (set/cleared by `system_mind`) instead of the old deterministic `-60` snap. Eating→Idle applies an `ateMeal` thought.
- `Critters/tame.ts`: successful tame applies a `tamedCritter` thought to the warden.
- `world.ts`: `spawnWarden` adds `Mind` and rolls a trait (optional override for save restore).
- `tick.ts`: `system_mind` runs after needs, before behavior (both runTick variants).
- Saves: schema v5 (`EntityV5Snapshot.mind`), `v4ToV5` additive migration, codec serialize/deserialize of trait + mood.
- Tests: `tests/sim/mind.test.ts` (9 tests); version-guard updates in replay/build/migrations/raid tests (4→5).

## Priority 3 — RimWorld-style inspect + alert information architecture

- `panels/SelectionPanel.tsx`: inspector now shows warden Mood bar (color by stress tier) + personality Trait chip.
- `panels/AlertStack.tsx` (new): right-side urgent-state stack (mental break, downed, starving, exhausted, stressed), severity-sorted, capped at 6, polled every 250ms. Clicking an alert centers the camera on the warden and selects it — distinct from the rolling event log, per the research's "persistent detail vs transient urgency" split.
- `Renderer.ts`: `focusOnTile(tx, ty)` centers the camera.
- `Game.ts`: `__crittermoorFocus(eid)` bridge (center camera + select).
- `HUD.tsx`: mounts `<AlertStack />`; help text gains touch controls.

## Verification

`npm run typecheck` (clean), `npm run lint` (0 warnings), `npm test` (100/100, incl. determinism replay + save/reload), `npm run build` (ok). Touch gestures are logic-verified (no device in CI); existing mouse/desktop paths unchanged.
