import { openDB, type IDBPDatabase } from 'idb'
import { DAY_LENGTH_TICKS } from '@/shared/constants'
import type { SimWorld } from '../world'
import { deserialize, serialize, verifyCrc } from './codec'
import { SaveCorruptError, type SaveDoc, type SaveMeta } from './schema'

const DB_NAME = 'crittermoor'
const DB_VERSION = 1
const STORE_DOC = 'saves'
const STORE_META = 'saveMeta'

export const AUTOSAVE_SLOT = 'autosave'
export const NAMED_SLOTS: readonly string[] = ['slot1', 'slot2', 'slot3']

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_DOC)) db.createObjectStore(STORE_DOC)
        if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META)
      },
    })
  }
  return dbPromise
}

function prevKey(slotId: string): string {
  return `${slotId}__prev`
}

export async function saveGame(slotId: string, sim: SimWorld, name = slotId): Promise<SaveMeta> {
  const doc = serialize(sim)
  const meta: SaveMeta = {
    slotId,
    name,
    savedAt: doc.savedAt,
    tick: doc.tick,
    day: Math.floor(doc.tick / DAY_LENGTH_TICKS) + 1,
    seed: doc.seed,
    colonyName: name,
  }
  const db = await getDB()
  // Rotate current → __prev before overwriting, so corruption recovery works.
  const existingDoc = (await db.get(STORE_DOC, slotId)) as SaveDoc | undefined
  const existingMeta = (await db.get(STORE_META, slotId)) as SaveMeta | undefined
  const tx = db.transaction([STORE_DOC, STORE_META], 'readwrite')
  const writes: Promise<unknown>[] = [
    tx.objectStore(STORE_DOC).put(doc, slotId),
    tx.objectStore(STORE_META).put(meta, slotId),
  ]
  if (existingDoc) writes.push(tx.objectStore(STORE_DOC).put(existingDoc, prevKey(slotId)))
  if (existingMeta) writes.push(tx.objectStore(STORE_META).put(existingMeta, prevKey(slotId)))
  await Promise.all(writes)
  await tx.done
  return meta
}

export interface LoadResult {
  sim: SimWorld
  fromPrevSnapshot: boolean
}

export async function loadGame(slotId: string): Promise<SimWorld | null> {
  const result = await loadGameWithFallback(slotId)
  return result ? result.sim : null
}

export async function loadGameWithFallback(slotId: string): Promise<LoadResult | null> {
  const db = await getDB()
  const doc = (await db.get(STORE_DOC, slotId)) as SaveDoc | undefined
  if (!doc) return null
  try {
    verifyCrc(doc, slotId)
    return { sim: deserialize(doc), fromPrevSnapshot: false }
  } catch (err) {
    if (!(err instanceof SaveCorruptError)) throw err
    const prev = (await db.get(STORE_DOC, prevKey(slotId))) as SaveDoc | undefined
    if (!prev) throw err
    verifyCrc(prev, prevKey(slotId))
    return { sim: deserialize(prev), fromPrevSnapshot: true }
  }
}

export async function listSaves(): Promise<SaveMeta[]> {
  const db = await getDB()
  const all = (await db.getAll(STORE_META)) as SaveMeta[]
  return all.filter((m) => !m.slotId.endsWith('__prev')).sort((a, b) => b.savedAt - a.savedAt)
}

export async function listSlotsOrdered(): Promise<{ slotId: string; meta: SaveMeta | null }[]> {
  const db = await getDB()
  const order = [AUTOSAVE_SLOT, ...NAMED_SLOTS]
  const out: { slotId: string; meta: SaveMeta | null }[] = []
  for (const slotId of order) {
    const meta = (await db.get(STORE_META, slotId)) as SaveMeta | undefined
    out.push({ slotId, meta: meta ?? null })
  }
  return out
}

export async function deleteSave(slotId: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction([STORE_DOC, STORE_META], 'readwrite')
  await Promise.all([
    tx.objectStore(STORE_DOC).delete(slotId),
    tx.objectStore(STORE_META).delete(slotId),
    tx.objectStore(STORE_DOC).delete(prevKey(slotId)),
    tx.objectStore(STORE_META).delete(prevKey(slotId)),
  ])
  await tx.done
}

// Test helper — exposed only for vitest fixtures to corrupt blobs.
export async function _writeRawDoc(slotId: string, raw: unknown): Promise<void> {
  const db = await getDB()
  await db.put(STORE_DOC, raw, slotId)
}
