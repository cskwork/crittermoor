# Crittermoor — Game Design Specification (v0.1)

## 1. Premise & Tone

Players are wardens of a new settlement on the **Crittermoor** — a vast frontier wilderness teeming with critters. The first ship dropped you here with three survivors, basic tools, and a single starter critter. Build a colony, tame the wild, survive raids from rival factions and feral critter packs.

Tone: hopeful frontier survival. Not grim-dark; lightly humorous flavor text. PG-rated combat (no blood, status icons).

## 2. Core Loop

```
Plan needs → Assign jobs → Wardens & critters work → Day/night cycle →
Threats arise (raid / weather / wildlife) → Resolve (build / battle / flee) →
Critters bond & evolve → Tech research → Repeat → Win condition
```

**Win condition (MVP+1):** survive 60 days and launch the airship.
**Lose condition:** all wardens dead OR all critters dead AND no eggs in incubation.

## 3. Entities

### 3.1 Wardens (player-controlled humans)
- Stats: STR, AGI, INT, EMP (empathy — affects taming), END.
- Skills (level 0-20, XP from work): Construct, Mine, Cook, Plant, Tame, Combat, Medicine, Craft.
- Needs (0-100, decay per tick): Food, Rest, Joy, Warmth.
- Traits (1-3 per warden, generated): "Greenthumb", "Skittish", "Iron Stomach", etc.
- Schedule: 24-slot day, classify slot as Work/Sleep/Eat/Anything.

### 3.2 Critters (tameable creatures)
- Species (6 starters in MVP, more unlockable):
  - **Spritmoth** (Spirit/Air) — fast scout, light loads
  - **Tindercub** (Fire/Beast) — cooking bonus, ember attack
  - **Loamfin** (Water/Earth) — irrigation, swim, splash
  - **Brackboar** (Earth/Beast) — heavy haul, charge attack
  - **Ferroquill** (Metal/Air) — mining bonus, quill volley
  - **Mosskit** (Plant/Beast) — herbalism, leaf shield
- Per-critter data:
  - Species + level (1-50) + XP
  - Traits (e.g., "Eager", "Stubborn", "Brave")
  - Bond level with assigned warden (0-100)
  - 4 move slots (learned by level / tutor)
  - Held item (1 slot)
  - Work tags (which jobs this critter can assist)

### 3.3 Items, Structures, Terrain
- Items: wood, stone, food (raw/cooked), seeds, ore, alloy, medicine, capture-discs, eggs.
- Structures: wall (wood/stone), floor (dirt/wood/stone), door, bed, table, stove, crop, storage, workbench, incubator.
- Terrain types: grass, forest, stone, mountain, dirt, water (shallow/deep), sand.

## 4. Systems

### 4.1 Real-Time Sim (colony layer)
- Tick rate: 8 ticks/sec at 1x speed.
- Player can pause / step (Space) / 1x / 2x / 4x.
- All gameplay state advances on tick; render is interpolated between ticks.

### 4.2 Turn-Based Battle (engagement layer)
Triggered when:
- A raid lands on the map and any hostile reaches the warden's "battle line".
- The player initiates expedition combat against a wild critter pack.

Mechanics:
- 4v4 critter teams, side-view battle scene.
- Speed-based turn order (re-sorted each round).
- Move categories: Physical / Special / Status. Type chart (8 types) supplies multipliers.
- Status effects: Burn, Soak, Quill, Daze, Snare, Bloom.
- Switch-in cost: 1 tempo (limited to 2 free switches per round).
- AI: priority(weighted_score = damage_expected + status_value − self_risk).
- Reward: XP, capture chance on weakened wild critter (item-gated).

### 4.3 Jobs (real-time)
- Job categories: Build, Haul, Mine, Chop, Cook, Plant, Harvest, Tame, Hunt, Doctor, Research.
- Priority matrix per warden per category (0=disabled, 1-4=priority).
- Job board: highest priority pending job assigned to nearest capable worker.
- Critters can be tagged for specific job categories (per species capability).

### 4.4 Day/Night & Time
- 1 game day = 10 real minutes at 1x.
- Phases: Dawn (06-08), Day (08-18), Dusk (18-20), Night (20-06).
- Visibility reduced at night; some critters are nocturnal.

### 4.5 Raids & Events
- Raid timer (15-25 game-days), scales with colony wealth.
- Event types: bandit raid, feral pack, traveling tamer (trade), weather (rain/storm), critter migration.

## 5. UI

- Top bar: time, speed controls, alerts, wealth.
- Left rail: build menu, work tab, schedule, critter team.
- Bottom: selected entity inspector.
- Right rail: events log, research tree.
- Battle scene: full-screen takeover with HUD, party row, action wheel.
- All panels keyboard-navigable.

## 6. Controls

- Pan: WASD / arrow keys / middle-mouse drag.
- Zoom: scroll wheel / +/−.
- Select: left-click; drag-select rectangle.
- Order: right-click on target.
- Pause: Space. Speed: 1/2/3 keys.
- Build menu: B. Work tab: W. Schedule: T. Critters: C.

## 7. Tutorial

- 5-step interactive overlay on first new game: select warden → designate chop area → place bed → assign critter to job → speed up time.

## 8. Accessibility

- Color-blind palette toggle (Deuteranopia / Protanopia / Tritanopia).
- Pause on focus loss.
- Configurable tick rate (slow mode for cognitive accessibility).
- All actions reachable by keyboard.
- High-contrast UI mode.

## 9. Out of Scope (v1)

- 3D, multiplayer, mod tooling, mobile-touch UI (desktop browser first).
- More than 1 biome (Temperate Moor only at launch).
- More than 6 critter species at launch (12+ post-launch).

## 10. Definition of "Done" for MVP

1. From cold start (no save), player can: start new game with seed, see 96x96 generated map, control 3 wardens, build a wall and a bed, assign chop job, see critter mine ore, survive 1 raid via battle, save game, reload save, resume.
2. 60 FPS sustained at 200 entities on M1 Air baseline.
3. Bundle ≤ 600 KB JS gzip (excluding streamed assets).
4. Lighthouse perf ≥ 90 on title.
5. Vitest unit suite green; 80%+ coverage on `src/sim/`.
6. Final code-review + ai-slop-cleaner + verifier all clean.
