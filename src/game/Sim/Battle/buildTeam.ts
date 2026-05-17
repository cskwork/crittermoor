import type { Rng } from '@/shared/rng'
import { speciesById, type SpeciesDef } from '../Critters/species'
import type { BattleCritter } from './BattleState'
import { CritterType } from '../Critters/types'

export function teamFromSpecies(speciesIds: number[], level: number, rng: Rng): BattleCritter[] {
  void rng
  const team: BattleCritter[] = []
  for (const id of speciesIds) {
    const s = speciesById(id)
    if (!s) continue
    team.push(buildBattleCritter(s, level))
  }
  return team
}

export function buildBattleCritter(species: SpeciesDef, level: number): BattleCritter {
  const scale = 1 + (level - 1) * 0.04
  const s = species.baseStats
  const hp = Math.round(s.hp * scale)
  const t1 = species.types[0] ?? CritterType.Beast
  const t2 = species.types[1] ?? null
  return {
    speciesId: species.id,
    level,
    types: [t1, t2],
    hp,
    maxHp: hp,
    atk: Math.round(s.atk * scale),
    def: Math.round(s.def * scale),
    satk: Math.round(s.satk * scale),
    sdef: Math.round(s.sdef * scale),
    spd: Math.round(s.spd * scale),
    moves: species.movePool.slice(0, 4),
    status: null,
    statusTurns: 0,
  }
}
