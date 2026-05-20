# LLM Wiki Index

Living memory for the Crittermoor project. One row per topic; click through for beginner explainer + technical reference.

| topic-slug | one-line summary | last touched (issue) |
|---|---|---|
| battle-enemy-ai | How enemies score and pick moves each turn (deterministic, RNG only for tie-breaks). | 2026-05-20 (CMR-005) |
| cook-economy-loop | Stove-based producer (2 wood -> 1 meal) plus the eat-prefers-meal consumer; first economy pair. | 2026-05-20 (CMR-002) |
| breeding-hatchery | Hatchery -> Egg -> hatchling loop: timings, components, faction flip, RNG draw point. | 2026-05-20 (CMR-011) |
| sim-side-channel-state | Hidden state on `SimWorld` (`_raid`, `_hatcheries`) accessed only via getters; codec round-trips through it. | 2026-05-20 (CMR-011) |
| save-v3-additive-fields | How to extend v3 saves with optional fields without bumping the version; eid remap second pass. | 2026-05-20 (CMR-011) |
| rng-determinism | Where new `sim.rng.*` draws can/can't live without breaking existing seeded tests. | 2026-05-20 (CMR-011) |
| fog-of-war | Per-tile visibility (unseen / explored / visible) driven by warden positions, painted by a Pixi chunked layer, persisted via RLE. | 2026-05-20 (CMR-012) |
| save-format-versioning | When and how to bump `SAVE_VERSION` (binary blobs, pipeline changes). Complement to `save-v3-additive-fields`. | 2026-05-20 (CMR-012) |
| bond-partnereid-sentinel | `Bond.partnerEid = 0` is the documented "no specific warden" sentinel; codec must branch on it before remap. | 2026-05-20 (CMR-013) |
