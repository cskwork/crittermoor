# ADR 0005 — Codex-Driven Asset Pipeline

**Status:** Accepted (2026-05-17)

## Context
We need original critter sprites, tilesets, and UI icons. Hand-drawing is slow; off-the-shelf sprite packs risk licensing issues. The OpenAI Codex CLI is available locally and is strong at scripted generation.

## Decision
- All visual assets are generated through prompts checked into `assets/_prompts/`.
- Driver scripts in `tools/codex-gen/` invoke `codex` non-interactively (`codex exec` / scripted prompts) to:
  - Author or refine prompt files.
  - Produce SVG-first sprites; rasterize via `sharp` at the target sizes (16/32/64).
  - Generate species data (stats, moves) constrained by a JSON schema.
- Outputs land in `generated/<batch-id>/` with a manifest.
- A human (or `code-reviewer` agent) promotes accepted outputs into `src/assets/`.
- The build step (`tools/asset-pack.ts`) packs accepted sprites into atlases; code references stable `spriteId` constants.

## Why SVG-first
- Crisp at any scale; can be rasterized at multiple resolutions; small repo footprint; easy to diff in PRs.

## Legal posture
- No reference images of copyrighted creatures in prompts.
- Prompt set authored to invoke original silhouettes, color motifs, and biomes.
- Each promoted asset records the originating prompt commit hash for provenance.

## Consequences
- Asset velocity is high; quality varies per-batch and needs review.
- The art style stays consistent because the prompt set is the source of truth.
- Asset generation can be reproduced and audited.
