# Crittermoor — Build & Defense Plan

> Follows the Alpha (10/10) plan. Scope: real construction with materials, structures that affect pathfinding and behavior, and basic defense vs raids.

## Stories (5)

| ID | Story | Output |
|---|---|---|
| B001 | Structure core + sprites | Wall/Bed/Stove/Door/Storage/Turret components; Codex-generated SVG sprites; render via Sprite per structure |
| B002 | Build menu + blueprint + construct job | Build mode in toolbar; ghost preview at hover; left-click places blueprint; warden walks to blueprint, consumes materials, completes structure |
| B003 | Materials + inventory | Wood from chop, Stone from mine, displayed in HUD; build costs deducted; not enough → blueprint waits |
| B004 | Pathfinding + behavior integration | Walls/Mountains impassable, Doors passable; Bed → sleep target; Stove → eat target; Turret → auto-attacks hostiles in range |
| B005 | Save v3 + final quality gate | Schema v3 preserves structures + materials + blueprints; v2→v3 migration; ai-slop-cleaner + verification + code-review clean |

## Definition of done

1. Place 4 walls + 1 door + 1 bed via build menu; wardens build them; bed accepted as sleep target.
2. Raid arrives at base, must path around walls to reach wardens; turret shoots hostiles.
3. Save → reload → structures intact, materials preserved.
4. 60 FPS at 300 entities + 100 structures on M1 Air.
5. All tests + new structure/material/build tests green.
