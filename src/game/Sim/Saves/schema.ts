export const SAVE_VERSION = 3

export interface EntitySnapshot {
  eid: number
  pos: { x: number; y: number }
  tile: { tx: number; ty: number }
  faction: number
  needs?: { food: number; rest: number; joy: number; warmth: number }
  health?: { hp: number; maxHp: number }
  renderable?: { spriteId: number; layer: number; tint: number }
  critter?: { speciesId: number; level: number; xp: number; bond: number }
  bond?: { partnerEid: number; level: number }
  structure?: { kind: number; state: number; progress: number }
}

export interface DesignationSnapshot {
  kind: 'chop' | 'mine'
  tx: number
  ty: number
}

export interface SaveDocV1 {
  version: 1
  savedAt: number
  seed: number
  tick: number
  rngState: number
  map: {
    width: number
    height: number
    terrain: string // base64
    cost: string // base64
  }
  entities: EntitySnapshot[]
  designations: DesignationSnapshot[]
  events: string[]
}

export interface SaveDocV2 extends Omit<SaveDocV1, 'version'> {
  version: 2
  raid?: { nextRaidTick: number; scheduled: boolean }
}

export interface SaveDocV3 extends Omit<SaveDocV2, 'version'> {
  version: 3
  resources?: { wood: number; stone: number }
  blueprintKeys?: number[]
}

export type SaveDoc = SaveDocV1 | SaveDocV2 | SaveDocV3

export type CurrentSaveDoc = SaveDocV3

export interface SaveMeta {
  slotId: string
  name: string
  savedAt: number
  tick: number
  day: number
  seed: number
}
