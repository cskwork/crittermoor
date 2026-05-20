// SoundManager — typed play(id) API backed by WebAudio synth.
//
// Why synth instead of pre-recorded files: the game ships with no audio assets
// today and adding ~14 OGGs would blow the bundle budget. WebAudio produces
// short procedural blips that cover the trigger sites; real samples can swap
// in later by replacing one constant.
//
// The manager is autoplay-safe: it lazily creates the AudioContext on the
// first user gesture (any play() call). Before that, play() is a no-op.

export type SoundId =
  | 'chop_wood'
  | 'mine_stone'
  | 'build_complete'
  | 'eat'
  | 'sleep'
  | 'battle_hit'
  | 'battle_crit'
  | 'battle_victory'
  | 'battle_defeat'
  | 'critter_cry'
  | 'ui_click'
  | 'ui_hover'
  | 'error_blip'
  | 'raid_alarm'

interface SoundSpec {
  freq: number // Hz
  duration: number // seconds
  type: OscillatorType
  // Optional pitch sweep multiplier: end freq = freq * sweep.
  sweep?: number
  gain?: number
}

const SOUND_SPECS: Record<SoundId, SoundSpec> = {
  chop_wood: { freq: 220, duration: 0.08, type: 'square', sweep: 0.6 },
  mine_stone: { freq: 160, duration: 0.1, type: 'sawtooth', sweep: 0.5 },
  build_complete: { freq: 440, duration: 0.18, type: 'triangle', sweep: 1.5 },
  eat: { freq: 320, duration: 0.06, type: 'sine', sweep: 1.2 },
  sleep: { freq: 260, duration: 0.22, type: 'sine', sweep: 0.7 },
  battle_hit: { freq: 180, duration: 0.06, type: 'square', sweep: 0.55 },
  battle_crit: { freq: 380, duration: 0.14, type: 'sawtooth', sweep: 0.5, gain: 0.5 },
  battle_victory: { freq: 520, duration: 0.5, type: 'triangle', sweep: 2.0, gain: 0.45 },
  battle_defeat: { freq: 200, duration: 0.5, type: 'sawtooth', sweep: 0.4, gain: 0.45 },
  critter_cry: { freq: 360, duration: 0.18, type: 'triangle', sweep: 0.8 },
  ui_click: { freq: 540, duration: 0.04, type: 'square' },
  ui_hover: { freq: 720, duration: 0.025, type: 'sine', gain: 0.18 },
  error_blip: { freq: 140, duration: 0.16, type: 'square', sweep: 0.7 },
  raid_alarm: { freq: 280, duration: 0.4, type: 'sawtooth', sweep: 1.4, gain: 0.5 },
}

const VOLUME_KEY = 'crittermoor.audio.volume'

interface SoundManagerState {
  ctx: AudioContext | null
  master: GainNode | null
  volume: number
  muted: boolean
  // Throttle by id so a single tick can't fire the same SFX 50x.
  lastFiredAt: Map<SoundId, number>
}

const state: SoundManagerState = {
  ctx: null,
  master: null,
  volume: loadVolume(),
  muted: false,
  lastFiredAt: new Map(),
}

function loadVolume(): number {
  try {
    const raw = localStorage.getItem(VOLUME_KEY)
    if (raw === null) return 0.55
    const n = Number(raw)
    if (!Number.isFinite(n)) return 0.55
    return Math.min(1, Math.max(0, n))
  } catch {
    return 0.55
  }
}

function persistVolume(v: number): void {
  try {
    localStorage.setItem(VOLUME_KEY, String(v))
  } catch {
    // ignore
  }
}

function ensureCtx(): boolean {
  if (state.ctx) return true
  if (typeof window === 'undefined') return false
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return false
  try {
    const ctx = new Ctor()
    const master = ctx.createGain()
    master.gain.value = state.volume
    master.connect(ctx.destination)
    state.ctx = ctx
    state.master = master
    return true
  } catch {
    return false
  }
}

export const sound = {
  play(id: SoundId): void {
    if (state.muted) return
    if (state.volume <= 0) return
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const last = state.lastFiredAt.get(id) ?? -Infinity
    if (now - last < 30) return // 30 ms throttle per id
    state.lastFiredAt.set(id, now)
    if (!ensureCtx()) return
    const ctx = state.ctx!
    const master = state.master!
    const spec = SOUND_SPECS[id]
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.type = spec.type
    osc.frequency.setValueAtTime(spec.freq, ctx.currentTime)
    if (spec.sweep !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, spec.freq * spec.sweep),
        ctx.currentTime + spec.duration,
      )
    }
    const peak = spec.gain ?? 0.3
    env.gain.setValueAtTime(0, ctx.currentTime)
    env.gain.linearRampToValueAtTime(peak, ctx.currentTime + 0.005)
    env.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + spec.duration)
    osc.connect(env)
    env.connect(master)
    osc.start()
    osc.stop(ctx.currentTime + spec.duration + 0.02)
  },

  setVolume(v: number): void {
    const clamped = Math.min(1, Math.max(0, v))
    state.volume = clamped
    persistVolume(clamped)
    if (state.master && state.ctx) {
      state.master.gain.setValueAtTime(clamped, state.ctx.currentTime)
    }
  },

  getVolume(): number {
    return state.volume
  },

  setMuted(m: boolean): void {
    state.muted = m
  },
}

// Test seam — vitest can replace this to assert call sites.
export type SoundApi = typeof sound
