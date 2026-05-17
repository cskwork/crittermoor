# ADR 0003 — Fixed-Step Tick Loop with Render Interpolation

**Status:** Accepted (2026-05-17)

## Context
Sim must be deterministic (for saves & multiplayer-later), but render should be smooth on any monitor refresh rate.

## Decision
Decouple sim and render:

- Sim runs at **8 fixed ticks/sec** at 1x speed (4 ms work budget per tick).
- Render runs at `requestAnimationFrame` cadence.
- Interpolation alpha `α = (now - lastTickAt) / tickDuration` blends `Position_prev` → `Position`.
- Accumulator caps catch-up ticks at 5/frame to avoid "spiral of death".

## Speed control
- 1x = 8 t/s, 2x = 16 t/s, 4x = 32 t/s, Pause = 0.
- Speed is the only knob; tick duration stays nominal, accumulator advances faster.

## Consequences
- Game feels smooth even when speed changes.
- All gameplay must be a pure function of `(world, tick)` — no `Date.now()` inside systems.
- Tests can run N ticks instantly without rendering.
