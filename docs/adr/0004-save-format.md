# ADR 0004 — Versioned JSON Saves in IndexedDB

**Status:** Accepted (2026-05-17)

## Context
We need durable, large saves (50+ KB), no-server, and forward-migratable across game versions.

## Decision
- Use **IndexedDB** via `idb` library.
- Save a single JSON document per slot, plus a `meta` record (name, tick, day, screenshot dataURL).
- Save shape is **versioned**: top-level `version: number` plus structured payload.
- Migrations are pure functions `(prev) => next`, chained from `version` to current.
- Large arrays (tile maps) encoded as base64 to keep the JSON compact and stable.

## Why not localStorage
- 5 MB cap; synchronous; no structured cloning.

## Why not raw binary
- Migration becomes painful; the bundle/tooling overhead isn't worth the bytes saved at our size.

## Consequences
- Every breaking change to component layout must ship a migration in `src/game/Sim/Saves/migrations/`.
- A save written by version N can be loaded by version N+k as long as the migration chain is present.
- Export/import: a UI button dumps the JSON for backup, and reads it back via file input.
