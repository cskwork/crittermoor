# Crittermoor — Look-and-Feel Push

> Builds on the shipped Functional-and-Fun ultragoal (F001..F007).
> Scope: visual depth (lighting, particles, terrain variety, entity polish)
> and UI/UX best practices (design tokens, focus rings, tooltips, mobile,
> accessibility) without breaking the 2D pixi/React stack or blowing the
> 300 KB gzip budget.

## Stories (5)

| ID | Story | Output |
|---|---|---|
| H001 | Terrain depth | Per-tile terrain variants (3-4 per kind) + animated water shimmer + biome-edge smoothing in the tilemap chunk repaint |
| H002 | Entity polish | Direction-aware warden tint variant + idle bob + selection highlight ring + in-world HP bar above hurt entities + smooth movement interpolation between tiles |
| H003 | VFX particles | Lightweight ParticleContainer overlay with effects on chop / mine / build / raid arrival / tame / autosave; reduced-motion gated; capped at N concurrent particles |
| H004 | Lighting & atmosphere | Improved day/night with directional gradient overlay + warm light pools around stove/turret tiles at night + optional film-grain post toggle |
| H005 | UI/UX best practices | CSS variable token sheet (color/space/font), unified button states (hover/active/focus/disabled), tooltip-on-delay primitive, focus rings on all interactives, custom cursor per tool, save-slot overwrite confirm dialog, mobile-friendly HUD reflow, ARIA live regions for events log, color-contrast audit |

## Definition of done

1. Day/night cycle reads as a true 2D scene with warm interior pools at night, not a flat overlay.
2. Chopping a forest tile produces a small leaf burst; building completion produces a spark fountain; tame success produces a heart pop.
3. Wardens face their movement direction (4-way tinted variant), bob gently while idle, slide between tiles instead of snapping.
4. Every interactive button shows the same hover/active/focus state and is keyboard-navigable with a visible focus ring.
5. Save dialog asks "overwrite slot 2?" before clobbering an existing save.
6. HUD reflows usably on <=800 px wide windows / touch devices.
7. Bundle JS stays ≤ 300 KB gzip.
8. All vitest tests still pass; new VFX particle util has a smoke test.
9. Final quality gate: ai-slop-cleaner clean, verification (typecheck + lint + test + build) clean.

## Risks & mitigations

- **Pixi v8 ParticleContainer footprint**: budget particles aggressively (≤ 200 live, recycled). Skip on `prefers-reduced-motion`.
- **Lighting cost**: render lighting as a single tinted overlay quad with masked light circles, not per-tile shaders.
- **Touch input**: existing mouse-only handlers stay; mobile reflow only resizes panels, no new gesture system.
- **Determinism**: VFX layer reads sim state but never mutates it.
