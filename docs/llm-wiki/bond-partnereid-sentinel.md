# Bond.partnerEid = 0 Sentinel (codec round-trip rule)

## Getting the Feel (For Beginners)

### Why this rule exists

A bonded critter usually points at the warden it follows around. Some critters are bonded to "the colony in general" instead — for example, the ones the player buys from the travelling tamer. We represent that as `Bond.partnerEid = 0` ("no specific warden, just trust the player faction"). There is a quiet trap when those critters get saved and loaded that the codec now guards against explicitly.

The simplest way for a beginner to picture it:

`Core flow: buy critter -> partnerEid=0 -> save -> reload -> codec keeps Bond + drops Wild`

There are five terms you need to internalise at this stage.

| Term | Plain-English meaning |
|---|---|
| Eid | The numeric id ECS gives every entity (critter, warden, item). |
| bitecs sentinel eid 0 | Entity 0 is the framework's "no entity" placeholder; we never put components on it. |
| eidRemap | A table the save loader builds: "old saved id N -> new live id M". |
| Bond.partnerEid | The warden id this critter follows -- or `0` for "no one specific". |
| No-partner sentinel | The codec branch that keeps `partnerEid = 0` instead of trying to remap it. |

To make it concrete:

The player buys a Squirrel. The buy code attaches `Bond` with `partnerEid = 0` (no specific warden) and removes `Wild`. The player saves and reloads. Before the codec fix, the loader saw "old id 0" missing from the remap table, assumed the bond was dangling, silently dropped the Bond, and left the Squirrel still tagged `Wild`. The player paid wood + stone and the critter visibly reverted to a wild animal sitting on their colony. The fix is one branch in the codec's second pass: treat `partnerEid === 0` as a deliberate no-partner sentinel, re-attach Bond, drop Wild.

The decision rule that matters at this stage:

**Just remember this: `partnerEid = 0` means "bonded to the colony, no specific warden" -- the codec, `critterFollow`, and any new reader must short-circuit on this value rather than treat it as a missing reference.**

When you're ready to go deeper, read [sim-side-channel-state](sim-side-channel-state.md) (trader is the third side-channel instance and the only producer of `partnerEid = 0` today).

## Technical Reference

**Summary:** Entity 0 is bitecs' reserved sentinel and never carries components. `allQuery` therefore never serializes it and the codec's `eidRemap` never contains a key for `0`. Any `Bond.partnerEid === 0` written by gameplay (only the trader buy path so far) must be handled by an explicit branch in the codec's second-pass Bond resolver, otherwise the Bond + Wild cleanup silently skips and the player-visible state is wrong.

**Invariants & Constraints:**
- `Bond.partnerEid = 0` is the documented "no specific warden, bond to the colony" sentinel. Any new caller using it MUST add a buy/spawn -> serialize -> deserialize regression test asserting `hasComponent(Bond)` AND `!hasComponent(Wild)`.
- Codec deserialize must branch on `partnerEid === 0` BEFORE calling `eidRemap.get(...)`. The lookup will always return `undefined` for `0` even when the bond is valid.
- The follow system already short-circuits on `partnerEid === 0` so a no-partner bonded critter loiters instead of chasing entity 0 around the map. Keep this reader-side contract intact.
- The tame path writes a real warden eid (`tame.ts`) and is unaffected by the sentinel branch -- only the trader path takes the `0` branch today.
- Do not "fix" this by storing the first warden's eid as a fallback. The no-partner semantic is also what makes the no-warden colony case survive (no warden -> still bondable).

**Files of interest:**
- `src/game/Sim/Saves/codec.ts:157-176` -- second-pass Bond resolver with the `partnerEid === 0` branch.
- `src/game/Sim/systems/trader.ts` (`buyTraderOffer`) -- only producer of `Bond.partnerEid = 0` today.
- `src/game/Sim/systems/critterFollow.ts:18` -- reader-side short-circuit on the same sentinel.
- `tests/sim/trader.test.ts` -- regression test pinning `Bond.level === 10` and `!hasComponent(Wild)` across save -> load.

**Observability hooks:**
- none -- the sentinel is normal-path code, not an error.

**Decision log:**
- 2026-05-20 | CMR-013 | Added the `partnerEid === 0` branch in `codec.ts` and the regression test. The first review pass shipped without it and the bug only surfaced when a buy -> save -> load test was added. Considered storing the first warden's eid instead and rejected because that breaks the "bonded to the colony, no specific warden" semantic and still fails when no warden exists.

**Last updated:** 2026-05-20 by CMR-013.
