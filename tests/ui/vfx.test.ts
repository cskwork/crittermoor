import { describe, expect, it } from 'vitest'
import { VfxLayer } from '@/game/Renderer/VfxLayer'

describe('VfxLayer', () => {
  it('caps live particles after many spawns', () => {
    const layer = new VfxLayer()
    for (let i = 0; i < 60; i++) layer.spawn('build', i, i)
    // build emits 16 particles per call → 60 * 16 = 960 ideal; layer caps at 200.
    const count = (layer as unknown as { particles: unknown[] }).particles.length
    expect(count).toBeLessThanOrEqual(200)
    layer.dispose()
  })

  it('spawn for every kind without throwing', () => {
    const layer = new VfxLayer()
    expect(() => {
      layer.spawn('chop', 1, 1)
      layer.spawn('mine', 1, 1)
      layer.spawn('build', 1, 1)
      layer.spawn('raid', 1, 1)
      layer.spawn('tame', 1, 1)
      layer.spawn('autosave', 1, 1)
    }).not.toThrow()
    layer.dispose()
  })
})
