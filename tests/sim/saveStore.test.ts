import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSimWorld, spawnWarden } from '@/game/Sim/world'
import {
  AUTOSAVE_SLOT,
  _writeRawDoc,
  listSlotsOrdered,
  loadGameWithFallback,
  saveGame,
} from '@/game/Sim/Saves/store'
import { SaveCorruptError } from '@/game/Sim/Saves/schema'

beforeEach(() => {
  // Each test runs against a fresh in-memory IDB (jsdom + fake-indexeddb resets per import).
})

describe('save store (CRC + rollback + slot list)', () => {
  it('writes a slot then loads it back round-tripping the seed', async () => {
    const sim = createSimWorld(101)
    spawnWarden(sim, 5, 5, 0xffffff)
    await saveGame('slot1', sim, 'Test slot')
    const loaded = await loadGameWithFallback('slot1')
    expect(loaded).toBeTruthy()
    expect(loaded!.fromPrevSnapshot).toBe(false)
    expect(loaded!.sim.seed).toBe(101)
  })

  it('falls back to __prev snapshot when the active blob is corrupt', async () => {
    const sim = createSimWorld(202)
    await saveGame('slot2', sim, 'Test slot')
    // Overwrite the slot a second time so __prev exists.
    sim.tick = 999
    await saveGame('slot2', sim, 'Test slot')
    // Poison the active blob.
    await _writeRawDoc('slot2', { version: 3, crc: 1, broken: true })
    const loaded = await loadGameWithFallback('slot2')
    expect(loaded).toBeTruthy()
    expect(loaded!.fromPrevSnapshot).toBe(true)
  })

  it('throws SaveCorruptError when no recovery is possible', async () => {
    const sim = createSimWorld(303)
    await saveGame('slot3', sim, 'Test slot')
    await _writeRawDoc('slot3', { version: 3, crc: 7, broken: true })
    let caught: unknown = null
    try {
      await loadGameWithFallback('slot3')
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(SaveCorruptError)
  })

  it('lists the autosave + 3 named slots in canonical order', async () => {
    const sim = createSimWorld(404)
    await saveGame(AUTOSAVE_SLOT, sim, 'Autosave')
    const slots = await listSlotsOrdered()
    expect(slots.map((s) => s.slotId)).toEqual([AUTOSAVE_SLOT, 'slot1', 'slot2', 'slot3'])
    expect(slots[0]!.meta?.name).toBe('Autosave')
    void vi
  })
})
