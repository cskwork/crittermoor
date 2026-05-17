import { openDB, type IDBPDatabase } from 'idb'
import { DAY_LENGTH_TICKS } from '@/shared/constants'
import type { SimWorld } from '../world'
import { deserialize, serialize } from './codec'
import type { SaveDoc, SaveMeta } from './schema'

const DB_NAME = 'crittermoor'
const DB_VERSION = 1
const STORE_DOC = 'saves'
const STORE_META = 'saveMeta'

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

export async function saveGame(slotId: string, sim: SimWorld, name = slotId): Promise<SaveMeta> {
  const doc = serialize(sim)
  const meta: SaveMeta = {
    slotId,
    name,
    savedAt: doc.savedAt,
    tick: doc.tick,
    day: Math.floor(doc.tick / DAY_LENGTH_TICKS) + 1,
    seed: doc.seed,
  }
  const db = await getDB()
  const tx = db.transaction([STORE_DOC, STORE_META], 'readwrite')
  await Promise.all([
    tx.objectStore(STORE_DOC).put(doc, slotId),
    tx.objectStore(STORE_META).put(meta, slotId),
  ])
  await tx.done
  return meta
}

export async function loadGame(slotId: string): Promise<SimWorld | null> {
  const db = await getDB()
  const doc = (await db.get(STORE_DOC, slotId)) as SaveDoc | undefined
  if (!doc) return null
  return deserialize(doc)
}

export async function listSaves(): Promise<SaveMeta[]> {
  const db = await getDB()
  const all = (await db.getAll(STORE_META)) as SaveMeta[]
  return all.sort((a, b) => b.savedAt - a.savedAt)
}

export async function deleteSave(slotId: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction([STORE_DOC, STORE_META], 'readwrite')
  await Promise.all([
    tx.objectStore(STORE_DOC).delete(slotId),
    tx.objectStore(STORE_META).delete(slotId),
  ])
  await tx.done
}
