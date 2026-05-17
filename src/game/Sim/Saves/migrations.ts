import type { CurrentSaveDoc, SaveDoc, SaveDocV1, SaveDocV2, SaveDocV3 } from './schema'

// Migration registry: each entry takes a save at version N and returns version N+1.
// All migrations must be deterministic and lossless within their input scope.

export function migrateToCurrent(doc: SaveDoc): CurrentSaveDoc {
  let cur: SaveDoc = doc
  if (cur.version === 1) cur = v1ToV2(cur)
  if (cur.version === 2) cur = v2ToV3(cur)
  if (cur.version === 3) return cur
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
