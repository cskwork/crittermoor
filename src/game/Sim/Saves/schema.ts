export const SAVE_VERSION = 4

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
  // CRC32 over the JSON form of this doc with `crc` set to 0.
  // Absent on older blobs; present on every blob written by the current codec.
  crc?: number
}

export interface AgencyEntry {
  eid: number
  priorities: { chop: number; mine: number; build: number; tame: number; haul: number }
  schedule: number[] // length 24
  drafted: boolean
}

export interface SaveDocV4 extends Omit<SaveDocV3, 'version' | 'entities'> {
  version: 4
  // v4 carries the same entity shape as v3 but with optional trait + home.
  entities: EntityV4Snapshot[]
  agency?: AgencyEntry[]
  stockpiles?: number[]
  factionDoorTiles?: number[]
  farms?: { key: number; growth: number }[]
  // Items dropped on tiles, persisted so the round-trip is lossless.
  items?: ItemSnapshot[]
}

export interface ItemSnapshot {
  tx: number
  ty: number
  kind: number
  qty: number
}

export interface EntityV4Snapshot extends EntitySnapshot {
  trait?: string
  homeAnchor?: { tx: number; ty: number }
}

export type SaveDoc = SaveDocV1 | SaveDocV2 | SaveDocV3 | SaveDocV4

export type CurrentSaveDoc = SaveDocV4

export interface SaveMeta {
  slotId: string
  name: string
  savedAt: number
  tick: number
  day: number
  seed: number
  colonyName?: string
}

export class SaveCorruptError extends Error {
  constructor(public readonly slotId: string, message: string) {
    super(message)
    this.name = 'SaveCorruptError'
  }
}
