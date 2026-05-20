# Crittermoor — Functional & Fun Push

> Builds on the shipped Alpha (10/10) and Build & Defense (5/5) ultragoals.
> Scope: drain the in-flight Symphony pipeline, then ship the depth features the
> roadmap names — player agency, economic loop, creature/raid depth, world
> variety, and polish — gated behind a real quality bar.
>
> Source backlog: `kanban/CMR-008..CMR-041`. Plan is final cut, not a wish list.

## Stories (7)

| ID | Story | Output |
|---|---|---|
| F001 | Drain in-flight pipeline | Land CMR-008 autosave+CRC, CMR-009 14-SFX audio, CMR-010 3-slot save UI, CMR-015 battle juice, CMR-016 achievements; pipeline empty of in-progress/review work |
| F002 | Player agency | WorkPriority grid (per-warden x worktype, 0-4), 24h Schedule grid (Sleep/Work/Joy/Anything), Draft mode (click orders override autonomy), unified Priority+Schedule panel (CMR-031/032/039/040) |
| F003 | Economic depth | Items on tiles + Stockpile zones + Haul job + Workstation bills (recipe queue with repeat-until-X stop rule) (CMR-034/035/036) |
| F004 | Creature depth | Wild AI v2 (home range + pack cohesion + flee on low HP), Critter inspect panel (stats/moves/bond/trait/level), 6 critter traits with stat modifiers + spawn-time roll (CMR-019/021/027) |
| F005 | World variety + combat scaling | Multi-biome worldgen (3 biomes + biome-specific spawns), faction-aware doors (block enemies / pass friendlies), raid scaler (wealth + day curve), mood + mental break, doctor work (CMR-022/026/028/033/037) |
| F006 | Polish | Tutorial v2 (8-step interactive tour), DEV-only perf overlay (per-system ms + entity count + FPS), Joy / Recreation (JoyObjects in Joy slot), Plant / Farm (designation -> growth -> harvest -> RawFood) (CMR-017/018/038/041) |
| F007 | Save v4 + determinism replay + final quality gate | Determinism replay test (action log + hash compare), Save v4 migration (weather + fog + tech + traits one-shot + golden fixture), ai-slop-cleaner + verification + $code-review all clean (CMR-020/030) |

## Definition of done

1. All Symphony tickets above leave Todo/Explore/InProgress/Review/QA and land in Done.
2. From a fresh `npm install` + `npm run dev`, a player can: place stockpiles, queue a cooking bill, draft a warden to attack a raider, tame a critter with a trait, survive across two biomes, and reload from autosave without losing state.
3. `npm run typecheck` clean, `npm run lint` zero warnings, `npm test` 100% green (new tests cover priorities, bills, traits, biome gen, replay hash), `npm run build` gzip JS stays under 300 KB.
4. 60 FPS sustained at 300 entities + 100 structures + 50 items on the M1 Air baseline.
5. Save v4 round-trips and migrates from v1/v2/v3 fixtures without loss.
6. Final quality gate: ai-slop-cleaner clean (no speculative abstractions, no dead code), verification (typecheck + lint + test + build) clean, $code-review APPROVE.

## Risks & mitigations

- **Scope creep**: stories are bounded by the listed CMR IDs; new ideas go to a fresh backlog file, not into a story.
- **Pipeline interference**: F001 drains stale in-flight work first so later stories start from a clean board.
- **Save migration chain growth**: F007 collapses pending v3->v4 schema additions into one migration with a golden fixture so future migrations stay testable.
- **Bundle bloat**: each story re-checks gzip JS budget; if over, split assets via dynamic import before merging.
