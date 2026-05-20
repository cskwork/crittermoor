# CMR-001 Review — detail notes

Sister to the severity table in `## Review Findings`. The body of that
section is capped at 6 rows; this file carries the reasoning, repro
steps, and suggested fixes.

## Scope confirmed

- Base SHA: `4dff091` (origin/main at branch creation); workspace branch
  `symphony/CMR-001`.
- Commits since base: `cabe600` (plumbing symlinks only — Symphony
  exempt), `b190ef4` (state flip, no code), `cd0129b` (the real work
  commit — production + tests + docs + lint scope tweak).
- Verified locally: `npm test` 48/48 pass, `npm run typecheck` exit 0,
  `npm run lint` exit 0.
- `[no-test]` scan over base..HEAD finds only `cabe600`, which changed
  exclusively `.claude`, `docs/symphony-prompts`, `skills` symlinks — all
  Symphony plumbing pointing into the host-backed worktree. Exempt per
  rule (counts as `docs/`+`.symphony/`-class plumbing, no prod code).
  Logged in `## Review`.

## HIGH — stale `sim.paths` survives the `Sleeping` transition

### Evidence chain (code-only repro)

1. `src/game/Sim/tick.ts:30` — `behaviorSystem(sim)` runs *before*
   `jobsSystem(sim)` and well before `system_path_follow(sim)`.
2. `src/game/Sim/systems/behavior.ts:72-74` — when behavior flips to
   `Sleeping` (or `Eating`), `cancelActiveJob` runs.
3. `src/game/Sim/systems/behavior.ts:84-90` — `cancelActiveJob` clears
   `Job.kind/state/progress/targetEid` only. It does **not** touch
   `sim.paths`. (Compare `src/game/Sim/systems/pathFollow.ts:18`, the
   only current call site of `sim.paths.clear(eid)`, which fires only
   when a path is fully traversed.)
4. `src/game/Sim/systems/behavior.ts:102-103` — `tickSleeping` does
   `if (sim.paths.get(eid)) return`, intending "already walking to a
   bed; don't double-request". With a stale job-path still in the map,
   this fires unconditionally — no bed search, no new `requestPath`.
5. `src/game/Sim/tick.ts:37` — `system_path_follow(sim)` runs and walks
   the warden one tile along the stale path toward the **old job
   target**, not a bed.

### Reproduction recipe (test that would catch this — add in In Progress)

```ts
it('cancels stale job path and routes to a bed when sleep triggers mid-job', () => {
  const sim = createSimWorld(20)
  const eid = spawnWarden(sim, 2, 2)
  // Pretend the jobs system handed this warden a path to a chop target.
  sim.paths.set(eid, new Int16Array([2, 2, 10, 2]))
  Needs.rest[eid] = 10
  spawnCompleteStructure(sim, StructureKind.Bed, 3, 2)
  const { hooks, calls } = makeCapturingHooks()
  makeBehaviorSystem(hooks)(sim)
  expect(calls.length).toBe(1)               // bed path WAS requested
  expect(calls[0]!.toX).toBe(3)              // ...to the bed, not (10,2)
  expect(sim.paths.get(eid)).toBeUndefined() // ...and stale path was cleared
})
```

### Suggested fix shape (do not implement here — for the In Progress rewind)

Two cheap options. Either is acceptable; prefer (A) since it preserves
intent at the transition edge and keeps `tickSleeping` ignorant of where
the path came from:

- **A.** When the FSM enters `Sleeping`/`Eating` (i.e. `behavior !==
  prev && behavior === Sleeping/Eating`), clear `sim.paths` for that
  eid. Place the `sim.paths.clear(eid)` next to the existing
  `cancelActiveJob(sim, eid)` call at `behavior.ts:73`, gated on the
  transition edge so we don't clobber a fresh bed-walk every tick.
- **B.** In `tickSleeping`, before the `if (sim.paths.get(eid)) return`
  short-circuit, verify the path's terminal node lands on an available
  bed tile via `findBedAtTile`; otherwise clear and fall through.

Pair the fix with the AC scorecard test above so QA can score it.

## MEDIUM — `isBedOccupied` treats all `Pawn` entities as occupants

### Evidence

- `src/game/Sim/systems/behavior.ts:28` defines
  `occupantQuery = defineQuery([TilePos, Pawn])`.
- `src/game/Sim/systems/behavior.ts:189-199` returns `true` as soon as
  any non-self entity with `TilePos + Pawn` shares the bed tile.
- The ticket AC says: "A Bed is considered occupied while a **warden's**
  Position equals the bed's tile". The In Progress writeup
  (`docs/CMR-001/work/feature.md:25-26`) explicitly cites the
  `isMobileOnTile` precedent — but that precedent also filters out
  `Structure` entities and runs in a context where only Player wardens
  are expected.
- Beds carry `blocksPath: false` (Domain Brief). Anything with `Pawn`
  can transit a bed tile: wild critters (`spawnWildCritter` in
  `src/game/Sim/world.ts`), raiders, tamed critters. While the wild AI
  doesn't actively path *to* beds, nothing prevents passing through
  one; the moment it does, every nearby Sleeping warden's
  `findNearestAvailableBed` filters that bed out for the duration.

### Suggested fix shape

Cheapest: filter `isBedOccupied` to `FactionComp.id[pEid] === Faction.Player`
to match the AC wording ("warden"). If we later want stricter "only if
that warden is itself Sleeping", add `Pawn.behavior[pEid] === Sleeping`
to the same predicate; the AC's "currently sleeping" hint already
supports it. Either change is one line.

## LOW (deferred, flagged for Learn)

- Mid-walk bed disappearance: if a chosen bed is destroyed or another
  warden parks on it after `requestPath` fired, the original warden
  continues following the stale path then ground-sleeps wherever they
  land. The HIGH fix above (path-clear on transition) doesn't cover
  this, but it's narrower and probably out of scope for CMR-001.
  Consider a follow-up ticket to re-evaluate the chosen bed each
  Sleeping tick.
- `findBedAtTile` is exported but only used internally by `isOnBedTile`;
  trim the `export` or document why it's part of the public surface.

## Verify artefacts

No `docs/CMR-001/verify/` outputs — this ticket changed sim-tick
behavior, not a runtime HTTP API, and the acceptance criteria are vitest
assertions. Live HTTP proof would be theatre; the repro recipe above is
the evidence In Progress should turn into an executable test.
