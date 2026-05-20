import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sound } from '@/audio/SoundManager'

// happy-dom lacks AudioContext. Stub it so play() exercises the typed API
// without trying to synthesize a tone.
beforeEach(() => {
  const oscStub = () => ({
    type: 'sine',
    frequency: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  })
  const gainStub = () => ({
    gain: {
      value: 0,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  })
  ;(globalThis as unknown as { AudioContext: unknown }).AudioContext = vi.fn().mockImplementation(() => ({
    currentTime: 0,
    destination: {},
    createOscillator: vi.fn(oscStub),
    createGain: vi.fn(gainStub),
  }))
})

afterEach(() => {
  delete (globalThis as unknown as { AudioContext?: unknown }).AudioContext
})

describe('SoundManager', () => {
  it('persists volume to localStorage and reflects it via getVolume', () => {
    sound.setVolume(0.42)
    expect(sound.getVolume()).toBeCloseTo(0.42, 5)
    expect(localStorage.getItem('crittermoor.audio.volume')).toBe('0.42')
  })

  it('clamps volume to [0, 1]', () => {
    sound.setVolume(-5)
    expect(sound.getVolume()).toBe(0)
    sound.setVolume(99)
    expect(sound.getVolume()).toBe(1)
  })

  it('play(id) is a no-op when volume is 0 — does not construct AudioContext', () => {
    sound.setVolume(0)
    const ctor = (globalThis as unknown as { AudioContext: ReturnType<typeof vi.fn> }).AudioContext
    sound.play('chop_wood')
    expect(ctor).not.toHaveBeenCalled()
  })

  it('play(id) covers every SoundId without throwing', () => {
    sound.setVolume(0.5)
    const ids = [
      'chop_wood',
      'mine_stone',
      'build_complete',
      'eat',
      'sleep',
      'battle_hit',
      'battle_crit',
      'battle_victory',
      'battle_defeat',
      'critter_cry',
      'ui_click',
      'ui_hover',
      'error_blip',
      'raid_alarm',
    ] as const
    for (const id of ids) expect(() => sound.play(id)).not.toThrow()
  })
})
