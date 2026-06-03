import type { CurrentSaveDoc, EntityV4Snapshot, EntityV5Snapshot, SaveDoc, SaveDocV1, SaveDocV2, SaveDocV3, SaveDocV4, SaveDocV5 } from './schema'

// Migration registry: each entry takes a save at version N and returns version N+1.
// All migrations must be deterministic and lossless within their input scope.

export function migrateToCurrent(doc: SaveDoc): CurrentSaveDoc {
  let cur: SaveDoc = doc
  if (cur.version === 1) cur = v1ToV2(cur)
  if (cur.version === 2) cur = v2ToV3(cur)
  if (cur.version === 3) cur = v3ToV4(cur)
  if (cur.version === 4) cur = v4ToV5(cur)
  if (cur.version === 5) return cur
  const v: number = (cur as { version: number }).version
  throw new Error(`unsupported save version after migration: ${v}`)
}

function v1ToV2(v1: SaveDocV1): SaveDocV2 {
  return {
    ...v1,
    version: 2,
    raid: undefined,
  }
}

function v2ToV3(v2: SaveDocV2): SaveDocV3 {
  return {
    ...v2,
    version: 3,
    resources: { wood: 30, stone: 30 },
    blueprintKeys: [],
  }
}

function v3ToV4(v3: SaveDocV3): SaveDocV4 {
  // Lossy promotion: trait + home anchor get defaults; agency/stockpiles/farms
  // start empty. The next save by the running game will fill them in.
  const entities: EntityV4Snapshot[] = v3.entities.map((e) => ({ ...e }))
  return {
    ...v3,
    version: 4,
    entities,
    agency: [],
    stockpiles: [],
    factionDoorTiles: [],
    farms: [],
    items: [],
  }
}

function v4ToV5(v4: SaveDocV4): SaveDocV5 {
  // Additive: pawn `mind` is absent on v4 blobs. Wardens respawn with a freshly
  // rolled trait and mood eases from needs; the next save fills mind in.
  const entities: EntityV5Snapshot[] = v4.entities.map((e) => ({ ...e }))
  return {
    ...v4,
    version: 5,
    entities,
  }
}
