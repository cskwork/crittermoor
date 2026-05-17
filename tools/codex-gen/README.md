# Codex-driven asset pipeline

This directory drives **original asset generation** via the local `codex` CLI.

## Layout

- `assets/_prompts/*.yaml` — source-of-truth prompt sets (checked in).
- `tools/codex-gen/run-*.ts` — driver scripts that invoke `codex exec` to produce SVGs.
- `generated/<kind>/<timestamp>/` — raw batch output + `manifest.json` (provenance).
- `src/assets/sprites/` — promoted, accepted assets referenced by code.
- `tools/asset-pack.ts` — build step that packs promoted SVGs into a texture atlas.

## Workflow

1. Edit the prompt YAML in `assets/_prompts/`.
2. Run the driver, e.g. `npx tsx tools/codex-gen/run-critters.ts`.
3. Review the SVGs in `generated/critters/<batch>/`.
4. Promote the keepers into `src/assets/sprites/critter/` (manual `cp` or the upcoming `tools/promote.ts`).
5. The atlas packer picks them up on the next `npm run build`.

## Why not auto-promote?

Asset quality varies; a human reviewer (or a `code-reviewer` agent pass) gates each batch. This keeps the
art voice consistent and the legal posture clean.

## Provenance

Each batch's `manifest.json` records the prompt-file hash. To audit any sprite, look up its `spriteKey`
in `src/game/Sim/Critters/species.ts`, find the corresponding SVG, then check the batch manifest in
git history for the originating prompt commit.

## Safety

`run-*.ts` invokes `codex exec` with the `workspace-write` sandbox. It does NOT use
`--dangerously-bypass-approvals-and-sandbox`. If you want a fully autonomous batch, pre-approve the
commands in your codex config, or run the driver interactively.

## Roadmap

- `tools/promote.ts` — review-and-promote helper with diff preview.
- `tools/asset-pack.ts` — pack SVGs into a single atlas + JSON metadata.
- `tools/codex-gen/run-tilesets.ts` — terrain tile generator.
- `tools/codex-gen/run-icons.ts` — UI icon generator.
