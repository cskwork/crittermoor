export enum StructureKind {
  Wall = 1,
  Door = 2,
  Bed = 3,
  Stove = 4,
  Storage = 5,
  Turret = 6,
}

export interface StructureDef {
  kind: StructureKind
  key: string
  name: string
  spriteKey: string // matches src/assets/sprites/structure/<spriteKey>.svg
  cost: { wood: number; stone: number }
  buildTicks: number // how long warden must work to complete
  blocksPath: boolean // walls/turret block; door does not
  description: string
}

export const STRUCTURES: Record<StructureKind, StructureDef> = {
  [StructureKind.Wall]: {
    kind: StructureKind.Wall,
    key: 'wall',
    name: 'Wall',
    spriteKey: 'wall',
    cost: { wood: 0, stone: 4 },
    buildTicks: 60,
    blocksPath: true,
    description: 'Stone wall, impassable.',
  },
  [StructureKind.Door]: {
    kind: StructureKind.Door,
    key: 'door',
    name: 'Door',
    spriteKey: 'door',
    cost: { wood: 4, stone: 0 },
    buildTicks: 50,
    blocksPath: false,
    description: 'Wooden door — wardens may pass through.',
  },
  [StructureKind.Bed]: {
    kind: StructureKind.Bed,
    key: 'bed',
    name: 'Bed',
    spriteKey: 'bed',
    cost: { wood: 3, stone: 0 },
    buildTicks: 60,
    blocksPath: false,
    description: 'Sleep target for wardens.',
  },
  [StructureKind.Stove]: {
    kind: StructureKind.Stove,
    key: 'stove',
    name: 'Stove',
    spriteKey: 'stove',
    cost: { wood: 2, stone: 3 },
    buildTicks: 80,
    blocksPath: true,
    description: 'Cooking station — wardens eat nearby.',
  },
  [StructureKind.Storage]: {
    kind: StructureKind.Storage,
    key: 'storage',
    name: 'Storage',
    spriteKey: 'storage',
    cost: { wood: 4, stone: 0 },
    buildTicks: 40,
    blocksPath: false,
    description: 'Storage crate (decorative for now).',
  },
  [StructureKind.Turret]: {
    kind: StructureKind.Turret,
    key: 'turret',
    name: 'Turret',
    spriteKey: 'turret',
    cost: { wood: 2, stone: 4 },
    buildTicks: 120,
    blocksPath: true,
    description: 'Auto-fires at hostile critters in range.',
  },
}

export const STRUCTURE_LIST: readonly StructureDef[] = Object.values(STRUCTURES)
