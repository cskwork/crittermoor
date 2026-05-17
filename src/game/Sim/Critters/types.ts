export enum CritterType {
  Beast = 0,
  Spirit = 1,
  Plant = 2,
  Fire = 3,
  Water = 4,
  Earth = 5,
  Air = 6,
  Metal = 7,
}

export const TYPE_COUNT = 8

export const TYPE_NAMES: Record<CritterType, string> = {
  [CritterType.Beast]: 'Beast',
  [CritterType.Spirit]: 'Spirit',
  [CritterType.Plant]: 'Plant',
  [CritterType.Fire]: 'Fire',
  [CritterType.Water]: 'Water',
  [CritterType.Earth]: 'Earth',
  [CritterType.Air]: 'Air',
  [CritterType.Metal]: 'Metal',
}

export const TYPE_COLOR: Record<CritterType, number> = {
  [CritterType.Beast]: 0xb88c5e,
  [CritterType.Spirit]: 0xc6b8ff,
  [CritterType.Plant]: 0x7fbf66,
  [CritterType.Fire]: 0xe07a5f,
  [CritterType.Water]: 0x6aa5d0,
  [CritterType.Earth]: 0xa68a5b,
  [CritterType.Air]: 0xcfe9f0,
  [CritterType.Metal]: 0x9aa3a8,
}
