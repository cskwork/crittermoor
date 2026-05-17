# Crittermoor — Alpha Polish Plan

> Followup to the MVP plan in `plan.md` (14/14 stories shipped pre-alpha).
> Scope: turn the playable scaffold into a coherent **alpha** with proper critter gameplay loop, real assets, smarter pawn AI, and battle UI.

## Why this plan exists

The pre-alpha is **playable** but thin:
- Pawn AI is "nearest designation"; no needs-driven priorities, no traits, no schedule honoring.
- Critter system has all the data (6 species, 16 moves, 8-type wheel) but no in-world critter entities yet — they exist only as battle stubs.
- `BattleScreen` is a placeholder.
- No real sprites — wardens are colored circles, terrain is solid color.
- Tilemap repaints every tick (9,216 ops at 8 Hz) — first perf bottleneck.
- Save format does not preserve eids, so cross-ref components (Job.targetEid, Bond.partnerEid) cannot survive a save once they go live.

Alpha tightens all of these so a player can: tame a critter, build a small base, survive a raid via the battle screen, save & continue.

## Stories (10)

| ID | Story | Output |
|---|---|---|
| A001 | Pawn AI v2 (needs-driven + utility scoring) | system_ai picks job by `score(need, distance, skill)`; sleep when rest<25; eat when food<30; tests cover priority |
| A002 | Wild critter entities + spawning + wander AI | Critter entity (Position, Species, Faction.Wild, Wild aggression); spawner places packs per biome; wild AI wanders within home range, aggros on player proximity |
| A003 | Capture & tame mechanic | "Capture-disc" item, tame action triggers on weakened wild critter, success roll uses `tame` skill + bond seed; tamed critter switches faction to Player and gains workTags-bound job eligibility |
| A004 | Critter work assignment + execution | Critters with workTag join the job board (haul/mine/cook/herb); chosen via assignment UI; tests verify ferroquill mining bonus, tindercub cook bonus |
| A005 | Raid event → battle scene trigger | Raid timer (15-25 game days, scaled by colony wealth); on raid landing, screen transitions to BattleScreen with player team (active critters) vs raider team |
| A006 | BattleScreen UI wired to BattleSim | Party row, move wheel, target picker, log; keyboard nav; deterministic outcome via shared rng; victory/defeat back to colony |
| A007 | Day/night cycle visuals + nocturnal critters | Tinted overlay by `phaseOf(sim)`; nocturnal critters (e.g. Spritmoth) get +spd at night; tests verify phase boundaries |
| A008 | Tilemap chunking + perf hardening | Chunk 16x16 cells; redraw only dirty chunks; frame budget telemetry; PathClient reuses single ArrayBuffer; in-DEV perf overlay (ms/system, fps) |
| A009 | Codex-generated critter sprites + atlas | Run `tools/codex-gen/run-critters.ts`, promote accepted SVGs into `src/assets/sprites/critter/`, `tools/asset-pack.ts` builds an atlas, EntityLayer renders from atlas |
| A010 | Save v2 + final quality gate | Save schema v2 preserves eids + Bond + Critter components + battle outcome flags; migration v1→v2; ai-slop-cleaner + verification + code-review all clean |

## Definition of Alpha-Done

1. From cold start: new game → tame a Spritmoth at night → assign it to haul → see it haul → build a stockpile → survive a raid via the battle screen → save → reload → resume.
2. 60 FPS sustained at 300 entities on M1 Air baseline.
3. Save bundle still < 600 KB gzip.
4. All sim tests + new AI tests + new battle integration tests green.
5. code-reviewer recommendation APPROVE for alpha scope.

## Risk register

- **Sprite consistency** — Codex may produce inconsistent styles; mitigation: prompt set is the single source of truth, each batch reviewed before promote.
- **Battle pacing** — 4v4 with 16 moves can stall; mitigation: tune move power and accuracy in A006 against playtest data.
- **Pawn AI feels random** — utility weights need tuning; mitigation: expose weights as constants, log decision traces in DEV mode.
- **Save migration regression** — mitigation: keep a fixture v1 save and add a golden-load test in `tests/sim/migrations.test.ts`.
