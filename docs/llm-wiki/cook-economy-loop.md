# Cook Economy Loop

## Getting the Feel (For Beginners)

### Why cook-economy-loop exists

The colony has a wardroom of resources (wood, stone) but until this loop existed, wood was only fuel for walls — nothing ate it, nothing fed the pawns. The cook loop is the **first producer-consumer pair** in Crittermoor: a Stove turns 2 wood into 1 meal, and a hungry warden later eats that meal for a big hunger swing. It's the smallest possible economy: one building, one resource, one consumer behavior — but it sets the contract every later loop (smelt ore, brew herbs, bake bread) follows.

The simplest way for a beginner to picture it:

`Idle warden with cookSkill → walk to nearest completed Stove → stand for a few ticks → spend 2 wood, add 1 meal → later, a hungry warden eats 1 meal for +60 food`

There are five terms you need to internalise at this stage.

| Term | Plain-English meaning |
|---|---|
| Cook job | A scheduled task assigned to one warden by the cook system; sits next to chop/mine in the job lineup. |
| Cook units | The chunks of work needed to finish one meal. `max(1, 4 - cookSkill)`; better cooks finish faster. |
| Meal cap | The colony stops cooking once `meals == 5`. Prevents the wardens from grinding wood into food forever. |
| Race guard | A re-check right before paying the cost; if wood ran out or the cap was hit between assign and finish, the job aborts without "double spending". |
| Eat preference | When a warden is hungry, the eat behavior tries to spend a meal first (`+60 food`); only falls back to slow regen if `meals == 0`. |

To make it concrete:

The colony has one warden with `cookSkill = 2` and a completed Stove three tiles away. Wood sits at 10, meals at 0. On the next ASSIGN_INTERVAL tick the cook system spots the eligible warden, finds the Stove, and assigns the job — a path request is fired and the warden walks to a tile adjacent to the Stove. Once adjacent, `Job.progress` ticks up each ASSIGN_INTERVAL fire. After 2 work units (because `cookSkill = 2` makes it `4 - 2 = 2`), the system re-checks wood/meal-cap, then decrements wood to 8 and bumps meals to 1. Three minutes later the same warden's food drops to 28; the eat behavior sees `meals > 0` and consumes one — food jumps to 88, meals goes back to 0, and the loop repeats.

The decision rule that matters at this stage:

**Just remember this: cook produces, eat consumes — both gate on the meal stockpile, and the producer always re-checks the stockpile right before paying so it can't overshoot the cap or spend wood it doesn't have.**

When you're ready to go deeper, read `build-structures-blueprints` (TBD) and `pawn-behaviors-and-needs` (TBD).

## Technical Reference

**Summary:** `src/game/Sim/systems/cook.ts` exports `makeCookSystem(hooks)` — a tick-gated system that runs at `ASSIGN_INTERVAL = 4`, mirroring `jobs.ts`. Eligible wardens (Player faction, not Sleeping/Eating, `Skills.cook >= 1`, no in-flight non-Cook job) are assigned the nearest completed Stove. After `max(1, 4 - cookSkill)` work units adjacent to the Stove the system spends `WOOD_PER_MEAL = 2` and produces 1 meal, capped at `MEALS_CAP = 5`. The producer side hands off to the consumer in `src/game/Sim/systems/behavior.ts` Eating branch, which prefers a meal (`HUNGER_PER_MEAL = 60`) before the existing `+1/4-tick` slow regen.

**Invariants & Constraints:**
- `JobKind.Cook = 3` is owned exclusively by `cook.ts`; `makeJobSystem` does NOT switch on Cook. Cook reuses `isAlreadyTargeted` (now exported from `jobs.ts:131`) to dedupe its targets against the chop/mine designation pool — see Decision log for the known collision risk.
- `Stove.blocksPath == true` (`Structures/defs.ts:59`), so the Stove tile itself has cost 0 to the pathfinder. Cook calls `nearestPassableNeighbor` (now exported from `construct.ts:105`) to compute the warden's actual destination. The warden treats "adjacent" as 8-connected (`abs(dx) <= 1 && abs(dy) <= 1`).
- Race guard at completion (`cook.ts:119-128`): re-reads `sim.resources.wood` and `sim.resources.meals` before debiting. Skips with a logged event if either fails. Without this, two wardens cooking simultaneously could double-spend wood or overshoot the cap by one.
- `clearJob` is duplicated locally inside `cook.ts:137` instead of imported from `jobs.ts`; importing would create a cyclic dep (cook depends on jobs for `JobKind`, jobs would then transitively pull cook).
- `HUNGER_PER_MEAL = 60` is duplicated inline in `behavior.ts:19` rather than imported from `cook.ts`. Intentional — keeps the dep direction clean (behavior never imports cook). The number is pinned by the AC.
- Save schema stays at v3. Legacy v3 saves whose `resources` object predates this ticket load with `meals = 0` via the `?? 0` fallback in `Saves/codec.ts` (legacy v1/v2 saves migrate to a 30/30/0 starter inside `migrations.ts`'s `v2ToV3`).
- Headless `runTick` (no hooks) skips cook entirely, matching the pre-existing jobs/construct exclusion. Cook needs the path hook to schedule walks.

**Files of interest:**
- `src/game/Sim/systems/cook.ts:22-54` — `makeCookSystem` outer loop: tick gate, warden iteration, assign/progress branching.
- `src/game/Sim/systems/cook.ts:96-134` — `progressCook` work loop with stove-removed guard and the wood/meal-cap race guard at completion.
- `src/game/Sim/systems/jobs.ts:12` — `JobKind.Cook = 3` enum extension; switch in `makeJobSystem` deliberately omits Cook.
- `src/game/Sim/systems/behavior.ts:18-55` — Eating regen branch with the meal-preference block.
- `src/game/Sim/world.ts:22-24, 59` — `ColonyResources.meals` field and `createSimWorld` initializer (`{ wood: 30, stone: 30, meals: 0 }`).
- `src/game/Sim/Saves/{schema,codec,migrations}.ts` — optional `meals?` on v3, `?? 0` default at load, `meals: 0` in `v2ToV3`.
- `src/ui/panels/Resources.tsx:16-18` — Wood / Stone / Meals row (React auto-escaped numeric interpolation).
- `tests/sim/jobs.test.ts` — 5 cook tests: happy path, meal-cap gate, low-wood gate, cookSkill=0 gate, determinism.
- `tests/sim/behavior.test.ts::eating prefers a meal over slow regen` — proves the consumer side.
- `tests/sim/saves.test.ts::loads a v3 save without meals field defaulting to 0` — proves backward compat.

**Observability hooks:**
- log: `Cooked (+1 meal) at (${stx},${sty}).` pushed to `sim.events` at `cook.ts:132` — fires once per successful cook cycle.
- log: `Cook skipped (insufficient wood).` at `cook.ts:120` — fires when the race guard catches a stockpile race.
- log: `Cook skipped (meal cap).` at `cook.ts:125` — fires when the race guard catches a cap race.

**Decision log:**
- 2026-05-20 | CMR-002 | Created. Chose Option B (new `makeCookSystem` file) over Option A (fold Cook into `makeJobSystem`) because the AC names `makeCookSystem` explicitly and PMs grade against the AC verbatim; the duplication cost was bounded by exporting two helpers (`isAlreadyTargeted`, `nearestPassableNeighbor`) instead of copying their bodies. Rejected Option C (Cook as a Behavior) because cooking must run when wardens are idle, not only when they are hungry. First-failing-test budget was tuned from the plan's 64 ticks down to 12 ticks (3 ASSIGN_INTERVAL fires) — the original budget let the warden re-cycle to the meal cap and broke the "exactly one meal" assertion. Save schema stayed at v3 with an optional `meals?` field rather than bumping to v4 because the AC explicitly froze the version; legacy saves default to 0 via `?? 0` at deserialize. Known LOW (deferred): `isAlreadyTargeted` keys on `Job.targetEid`, while chop/mine store `ty*width + tx` designation keys — on small maps these spaces can collide; effect at worst is a one-tick scheduling skip. Worth a refactor when a third producer arrives.

**Last updated:** 2026-05-20 by CMR-002.
