# ADR 0002 — ECS via bitecs

**Status:** Accepted (2026-05-17)

## Context
A colony sim has thousands of entities with overlapping component sets. Class-hierarchy AI ("Pawn extends Mobile extends GameObject") scales badly and cache-thrashes.

## Decision
Adopt `bitecs` — a Structure-of-Arrays ECS with typed-array storage and bitmask queries.

## Rationale
- Typed arrays → cache friendly, deterministic memory.
- Queries are O(n entities matching).
- Easy to snapshot (just memcpy buffers) → ideal for save/replay.
- Tiny runtime (~6 KB).

## Alternatives
- **`miniplex`**: object-of-objects, friendlier API but slower at scale.
- **Hand-rolled**: rejected — `bitecs` already solves this well.

## Consequences
- All component access goes through `Component[eid] = value` — verbose but explicit.
- We adopt a `world` per scene (overworld vs battle) to isolate state.
- Components are flat (no nested objects); complex data uses parallel typed arrays or external maps keyed by `eid`.
