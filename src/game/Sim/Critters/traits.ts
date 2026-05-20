// Critter traits — randomized at spawn, attached as a per-eid record in the
// SimWorld side map (sim.traits). Each trait applies a multiplicative tweak
// to baseStats. Traits are not bitecs components because they are sparse:
// only critters carry them.
//
// Six traits, deliberately small so the design surface stays readable:
//
// | id        | stat tweaks                  |
// |-----------|------------------------------|
// | none      | (rare-by-omission baseline)  |
// | swift     | +20% spd, -10% hp            |
// | sturdy    | +20% hp, +10% def, -10% spd  |
// | fierce    | +20% atk, -10% def           |
// | clever    | +20% satk, -10% atk          |
// | brittle   | -10% def, -10% hp            |
// | radiant   | +10% satk, +10% sdef         |
//
// "none" is reserved for unrolled (or save-migrated) critters.

export type TraitId = 'none' | 'swift' | 'sturdy' | 'fierce' | 'clever' | 'brittle' | 'radiant'

export interface TraitDef {
  id: TraitId
  label: string
  description: string
  hp?: number
  atk?: number
  def?: number
  satk?: number
  sdef?: number
  spd?: number
}

export const TRAITS: readonly TraitDef[] = [
  { id: 'none', label: '—', description: 'Plain. No quirks.' },
  { id: 'swift', label: 'Swift', description: '+20% spd, -10% hp', spd: 1.2, hp: 0.9 },
  { id: 'sturdy', label: 'Sturdy', description: '+20% hp, +10% def, -10% spd', hp: 1.2, def: 1.1, spd: 0.9 },
  { id: 'fierce', label: 'Fierce', description: '+20% atk, -10% def', atk: 1.2, def: 0.9 },
  { id: 'clever', label: 'Clever', description: '+20% satk, -10% atk', satk: 1.2, atk: 0.9 },
  { id: 'brittle', label: 'Brittle', description: '-10% def, -10% hp', def: 0.9, hp: 0.9 },
  { id: 'radiant', label: 'Radiant', description: '+10% satk, +10% sdef', satk: 1.1, sdef: 1.1 },
]

const BY_ID = new Map<TraitId, TraitDef>(TRAITS.map((t) => [t.id, t]))

export function traitById(id: TraitId): TraitDef {
  return BY_ID.get(id) ?? TRAITS[0]!
}

// Weighted roll: "none" appears in 1/10 spawns; other 6 share evenly.
export function rollTrait(rng: { next: () => number }): TraitId {
  const r = rng.next()
  if (r < 0.1) return 'none'
  const pool: TraitId[] = ['swift', 'sturdy', 'fierce', 'clever', 'brittle', 'radiant']
  const idx = Math.floor(((r - 0.1) / 0.9) * pool.length)
  return pool[Math.min(pool.length - 1, idx)]!
}

export function applyTrait(stats: { hp: number; atk: number; def: number; satk: number; sdef: number; spd: number }, id: TraitId): typeof stats {
  const t = traitById(id)
  return {
    hp: Math.max(1, Math.round(stats.hp * (t.hp ?? 1))),
    atk: Math.max(1, Math.round(stats.atk * (t.atk ?? 1))),
    def: Math.max(1, Math.round(stats.def * (t.def ?? 1))),
    satk: Math.max(1, Math.round(stats.satk * (t.satk ?? 1))),
    sdef: Math.max(1, Math.round(stats.sdef * (t.sdef ?? 1))),
    spd: Math.max(1, Math.round(stats.spd * (t.spd ?? 1))),
  }
}
