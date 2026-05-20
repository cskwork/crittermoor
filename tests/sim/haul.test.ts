import { describe, expect, it } from 'vitest'
import { createSimWorld, spawnWarden } from '@/game/Sim/world'
import { dropItem, findItemAt, listLooseItems } from '@/game/Sim/Items/spawn'
import { ItemKind } from '@/game/Sim/Items/defs'
import { makeHaulSystem, tryPickup } from '@/game/Sim/systems/haul'
import { JobKind } from '@/game/Sim/systems/jobs'
import { Carry, Job, TilePos } from '@/game/Sim/components'
import { hasComponent } from 'bitecs'

describe('items + haul', () => {
  it('dropItem creates a stack and findItemAt returns it', () => {
    const sim = createSimWorld(1)
    const eid = dropItem(sim, ItemKind.Wood, 3, 4, 5)
    expect(eid).toBeGreaterThan(0)
    expect(findItemAt(sim, 3, 4, ItemKind.Wood)).toBe(eid)
    expect(listLooseItems(sim)).toContain(eid)
  })

  it('dropping into a stockpile tile is filtered from listLooseItems', () => {
    const sim = createSimWorld(2)
    const key = 4 * sim.map.width + 3
    sim.stockpiles.add(key)
    const eid = dropItem(sim, ItemKind.Stone, 3, 4, 3)
    expect(eid).toBeGreaterThan(0)
    expect(listLooseItems(sim)).not.toContain(eid)
  })

  it('haul system assigns a haul job when a stockpile and loose item exist', () => {
    const sim = createSimWorld(3)
    const warden = spawnWarden(sim, 0, 0)
    dropItem(sim, ItemKind.Wood, 2, 2, 3)
    sim.stockpiles.add(0)
    const haul = makeHaulSystem({ requestPath: () => undefined })
    sim.tick = 0 // ensures ASSIGN_INTERVAL boundary hits
    haul(sim)
    expect(hasComponent(sim.ecs, Job, warden)).toBe(true)
    expect(Job.kind[warden]).toBe(JobKind.Haul)
  })

  it('warden carrying an item drops it into the colony pool at the stockpile', () => {
    const sim = createSimWorld(4)
    const warden = spawnWarden(sim, 0, 0)
    const item = dropItem(sim, ItemKind.Wood, 2, 2, 4)
    sim.stockpiles.add(0)
    const haul = makeHaulSystem({ requestPath: () => undefined })

    sim.tick = 0
    haul(sim)
    expect(Job.kind[warden]).toBe(JobKind.Haul)

    // Teleport warden onto the item then pick up directly (path follow lives elsewhere).
    TilePos.tx[warden] = 2
    TilePos.ty[warden] = 2
    tryPickup(sim, warden, item)
    expect(hasComponent(sim.ecs, Carry, warden)).toBe(true)

    // Teleport warden onto the stockpile and re-run haul to drop.
    TilePos.tx[warden] = 0
    TilePos.ty[warden] = 0
    const initialWood = sim.resources.wood
    sim.tick += 6
    haul(sim)
    expect(sim.resources.wood).toBe(initialWood + 4)
    expect(hasComponent(sim.ecs, Carry, warden)).toBe(false)
  })
})
