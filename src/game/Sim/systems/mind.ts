import { defineQuery } from 'bitecs'
import type { SimWorld } from '../world'
import { Faction as FactionComp, Mind, Needs, Pawn } from '../components'
import { Faction } from '@/shared/constants'
import { createRng, type Rng } from '@/shared/rng'

// Pawn psychology, modeled on RimWorld's verified mood/mental-break system
// (deep-research 2026-06-03, docs/research/2026-06-03-realism-uiux-mobile.md):
//   mood = needs baseline + trait bias, eased over time;
//   below trait-shifted risk thresholds a probabilistic roll triggers a break.
// Mood lives in Pawn.mood (i8, -100..100). Thoughts fold straight into it.

export enum Trait {
  None = 0,
  Optimist = 1, // sunnier baseline, breaks less
  Pessimist = 2, // gloomier baseline, breaks more
  Steadfast = 3, // very break-resistant
  Nervous = 4, // very break-prone
}

interface TraitDef {
  label: string
  moodBias: number // added to the mood baseline target
  breakShift: number // + = more fragile (breaks at higher mood), - = tougher
}

const TRAIT_DEFS: Record<Trait, TraitDef> = {
  [Trait.None]: { label: 'Even-keeled', moodBias: 0, breakShift: 0 },
  [Trait.Optimist]: { label: 'Optimist', moodBias: 12, breakShift: -8 },
  [Trait.Pessimist]: { label: 'Pessimist', moodBias: -12, breakShift: 8 },
  [Trait.Steadfast]: { label: 'Steadfast', moodBias: 4, breakShift: -16 },
  [Trait.Nervous]: { label: 'Nervous', moodBias: -4, breakShift: 16 },
}

export function traitOf(eid: number): Trait {
  return (Mind.trait[eid] ?? Trait.None) as Trait
}

export function traitLabel(trait: number): string {
  return (TRAIT_DEFS[trait as Trait] ?? TRAIT_DEFS[Trait.None]).label
}

// Trait roll uses a LOCAL rng derived from (seed, eid), not sim.rng, so worldgen's
// shared RNG stream stays untouched and deterministic across saves/replays.
export function rollTrait(seed: number, eid: number): Trait {
  const r: Rng = createRng((seed ^ (eid * 0x9e3779b1)) | 0)
  if (r.chance(0.4)) return Trait.None // ~40% are unremarkable
  return r.pick([Trait.Optimist, Trait.Pessimist, Trait.Steadfast, Trait.Nervous])
}

// One-shot mood nudges from notable events. They fold directly into the persisted
// Pawn.mood, then mood drifts back toward baseline — a save-safe approximation of
// RimWorld's decaying-thought model (no separate per-thought store needed).
export const THOUGHTS = {
  ateMeal: 5,
  tamedCritter: 14,
  raidSurvived: 10,
  allyDowned: -16,
  sleptCold: -6,
} as const
export type ThoughtId = keyof typeof THOUGHTS

export function applyThought(eid: number, id: ThoughtId): void {
  Pawn.mood[eid] = clampMood((Pawn.mood[eid] ?? 0) + THOUGHTS[id])
}

// Break-risk tiers in mood space (-100..100), mapped from RimWorld's minor/major/
// extreme tiers. Below each, a per-check probability may trigger a break.
const RISK_MINOR = -25
const RISK_MAJOR = -50
const RISK_EXTREME = -75
const P_MINOR = 0.02
const P_MAJOR = 0.05
const P_EXTREME = 0.1
// Mood at which an active break ends and control returns to the player.
const MOOD_RECOVER = -15

// Pawn.flags bit 0: a mental break is active (behavior.ts forces Wandering).
export const BREAK_FLAG = 1

// Run cadence: matches the old mood update interval. Tick-gated so RNG draws are
// deterministic and break checks aren't spammed every tick.
const MIND_INTERVAL = 60

const mindQuery = defineQuery([Pawn, Needs, FactionComp, Mind])

function clampMood(v: number): number {
  return Math.max(-100, Math.min(100, v))
}

function isBroken(eid: number): boolean {
  return ((Pawn.flags[eid] ?? 0) & BREAK_FLAG) !== 0
}

export function system_mind(sim: SimWorld): void {
  if (sim.tick % MIND_INTERVAL !== 0) return
  const eids = mindQuery(sim.ecs)
  for (let i = 0; i < eids.length; i++) {
    const e = eids[i]!
    if (FactionComp.id[e] !== Faction.Player) continue
    const def = TRAIT_DEFS[traitOf(e)] ?? TRAIT_DEFS[Trait.None]

    // Ease mood toward the needs baseline plus the trait bias (70 avg == 0 mood).
    const avg = ((Needs.food[e] ?? 0) + (Needs.rest[e] ?? 0) + (Needs.joy[e] ?? 0)) / 3
    const target = clampMood(Math.round((avg - 70) * 2.5) + def.moodBias)
    const prev = Pawn.mood[e] ?? 0
    const mood = clampMood(prev + Math.sign(target - prev))
    Pawn.mood[e] = mood

    const flags = Pawn.flags[e] ?? 0
    if (isBroken(e)) {
      if (mood >= MOOD_RECOVER) Pawn.flags[e] = flags & ~BREAK_FLAG
      continue
    }
    // Probabilistic tiered break; trait shifts the thresholds.
    const shift = def.breakShift
    let p = 0
    if (mood <= RISK_EXTREME + shift) p = P_EXTREME
    else if (mood <= RISK_MAJOR + shift) p = P_MAJOR
    else if (mood <= RISK_MINOR + shift) p = P_MINOR
    if (p > 0 && sim.rng.chance(p)) {
      Pawn.flags[e] = flags | BREAK_FLAG
      sim.events.push(`Warden #${e} (${def.label}) snapped into a mental break.`)
    }
  }
}
