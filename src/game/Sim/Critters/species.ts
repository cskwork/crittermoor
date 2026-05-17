import { CritterType } from './types'

export interface SpeciesStats {
  hp: number
  atk: number
  def: number
  satk: number
  sdef: number
  spd: number
}

export interface SpeciesDef {
  id: number
  key: string
  name: string
  types: readonly CritterType[]
  baseStats: SpeciesStats
  movePool: readonly string[]
  workTags: readonly string[]
  spriteKey: string
  flavor: string
}

export const SPECIES: readonly SpeciesDef[] = [
  {
    id: 1,
    key: 'spritmoth',
    name: 'Spritmoth',
    types: [CritterType.Spirit, CritterType.Air],
    baseStats: { hp: 45, atk: 35, def: 35, satk: 65, sdef: 55, spd: 80 }, // 315
    movePool: ['haunt', 'gust', 'ether_lash', 'cyclone'],
    workTags: ['scout', 'haul-light'],
    spriteKey: 'critter/spritmoth',
    flavor: 'A pale moth that drifts at dusk. Carries small loads on its silvery dust.',
  },
  {
    id: 2,
    key: 'tindercub',
    name: 'Tindercub',
    types: [CritterType.Fire, CritterType.Beast],
    baseStats: { hp: 60, atk: 70, def: 50, satk: 55, sdef: 45, spd: 60 }, // 340
    movePool: ['bite', 'ember', 'feral_charge', 'cinder_dash'],
    workTags: ['cook', 'combat'],
    spriteKey: 'critter/tindercub',
    flavor: 'A bear-pup with embers in its mane. Curls beside the stove to keep the colony warm.',
  },
  {
    id: 3,
    key: 'loamfin',
    name: 'Loamfin',
    types: [CritterType.Water, CritterType.Earth],
    baseStats: { hp: 65, atk: 50, def: 65, satk: 55, sdef: 65, spd: 40 }, // 340
    movePool: ['splash_strike', 'stone_butt', 'rip_tide', 'tremor'],
    workTags: ['irrigate', 'plant'],
    spriteKey: 'critter/loamfin',
    flavor: 'A river-eel that wriggles through mud and channels. Brings water to crops.',
  },
  {
    id: 4,
    key: 'brackboar',
    name: 'Brackboar',
    types: [CritterType.Earth, CritterType.Beast],
    baseStats: { hp: 80, atk: 80, def: 70, satk: 35, sdef: 45, spd: 45 }, // 355
    movePool: ['bite', 'stone_butt', 'feral_charge', 'tremor'],
    workTags: ['haul-heavy', 'combat'],
    spriteKey: 'critter/brackboar',
    flavor: 'A stout boar caked in dried mud. Hauls cartloads of stone without complaint.',
  },
  {
    id: 5,
    key: 'ferroquill',
    name: 'Ferroquill',
    types: [CritterType.Metal, CritterType.Air],
    baseStats: { hp: 55, atk: 65, def: 55, satk: 50, sdef: 50, spd: 75 }, // 350
    movePool: ['quill_volley', 'gust', 'iron_clad', 'cyclone'],
    workTags: ['mine', 'combat'],
    spriteKey: 'critter/ferroquill',
    flavor: 'A hawk-shaped creature lined with iron quills. Sniffs out ore from a hundred paces.',
  },
  {
    id: 6,
    key: 'mosskit',
    name: 'Mosskit',
    types: [CritterType.Plant, CritterType.Beast],
    baseStats: { hp: 55, atk: 45, def: 60, satk: 65, sdef: 60, spd: 55 }, // 340
    movePool: ['leaf_cut', 'bloomburst', 'bite', 'ether_lash'],
    workTags: ['herb', 'doctor'],
    spriteKey: 'critter/mosskit',
    flavor: 'A kitten of woven moss. Smells of herbs and dawn — a healer\'s companion.',
  },
]

const BY_ID = new Map<number, SpeciesDef>(SPECIES.map((s) => [s.id, s]))
const BY_KEY = new Map<string, SpeciesDef>(SPECIES.map((s) => [s.key, s]))

export function speciesById(id: number): SpeciesDef | undefined {
  return BY_ID.get(id)
}
export function speciesByKey(key: string): SpeciesDef | undefined {
  return BY_KEY.get(key)
}
