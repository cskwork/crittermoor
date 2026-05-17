import { CritterType } from '../Critters/types'

export type MoveCategory = 'physical' | 'special' | 'status'
export type StatusKind = 'burn' | 'soak' | 'quill' | 'daze' | 'snare' | 'bloom'

export interface MoveDef {
  id: string
  name: string
  type: CritterType
  power: number
  accuracy: number
  category: MoveCategory
  statusChance?: number
  status?: StatusKind
  description: string
}

export const MOVES: readonly MoveDef[] = [
  // Beast
  { id: 'bite', name: 'Bite', type: CritterType.Beast, power: 45, accuracy: 100, category: 'physical', description: 'Quick chomp.' },
  { id: 'feral_charge', name: 'Feral Charge', type: CritterType.Beast, power: 70, accuracy: 90, category: 'physical', description: 'Reckless tackle.' },
  // Spirit
  { id: 'haunt', name: 'Haunt', type: CritterType.Spirit, power: 40, accuracy: 100, category: 'special', statusChance: 0.25, status: 'daze', description: 'May daze the target.' },
  { id: 'ether_lash', name: 'Ether Lash', type: CritterType.Spirit, power: 65, accuracy: 95, category: 'special', description: 'Spectral whip.' },
  // Plant
  { id: 'leaf_cut', name: 'Leaf Cut', type: CritterType.Plant, power: 40, accuracy: 100, category: 'physical', description: 'Razor leaves.' },
  { id: 'bloomburst', name: 'Bloomburst', type: CritterType.Plant, power: 75, accuracy: 90, category: 'special', statusChance: 0.2, status: 'bloom', description: 'May entangle (bloom).' },
  // Fire
  { id: 'ember', name: 'Ember', type: CritterType.Fire, power: 40, accuracy: 100, category: 'special', statusChance: 0.2, status: 'burn', description: 'Light sparks.' },
  { id: 'cinder_dash', name: 'Cinder Dash', type: CritterType.Fire, power: 70, accuracy: 95, category: 'physical', description: 'Sprint of flame.' },
  // Water
  { id: 'splash_strike', name: 'Splash Strike', type: CritterType.Water, power: 45, accuracy: 100, category: 'physical', description: 'A jet of water.' },
  { id: 'rip_tide', name: 'Rip Tide', type: CritterType.Water, power: 75, accuracy: 85, category: 'special', statusChance: 0.25, status: 'soak', description: 'May soak the target.' },
  // Earth
  { id: 'stone_butt', name: 'Stone Butt', type: CritterType.Earth, power: 50, accuracy: 100, category: 'physical', description: 'Headbutt with rocks.' },
  { id: 'tremor', name: 'Tremor', type: CritterType.Earth, power: 70, accuracy: 95, category: 'special', statusChance: 0.2, status: 'daze', description: 'Ground shakes.' },
  // Air
  { id: 'gust', name: 'Gust', type: CritterType.Air, power: 40, accuracy: 100, category: 'special', description: 'A sharp breeze.' },
  { id: 'cyclone', name: 'Cyclone', type: CritterType.Air, power: 75, accuracy: 90, category: 'special', description: 'Spiraling winds.' },
  // Metal
  { id: 'quill_volley', name: 'Quill Volley', type: CritterType.Metal, power: 60, accuracy: 95, category: 'physical', statusChance: 0.25, status: 'quill', description: 'May quill (bleed).' },
  { id: 'iron_clad', name: 'Iron Clad', type: CritterType.Metal, power: 0, accuracy: 100, category: 'status', description: 'Boost defense (status placeholder).' },
]

const MOVE_INDEX = new Map(MOVES.map((m) => [m.id, m]))

export function getMove(id: string): MoveDef | undefined {
  return MOVE_INDEX.get(id)
}
