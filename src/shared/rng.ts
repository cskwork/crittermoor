// Mulberry32 — fast, seedable, 32-bit RNG. Deterministic given the same seed.
// Used for ALL gameplay randomness so saves and replays are bit-stable.

export interface Rng {
  state: number
  next(): number
  int(maxExclusive: number): number
  range(min: number, max: number): number
  chance(p: number): boolean
  pick<T>(arr: readonly T[]): T
  clone(): Rng
}

export function createRng(seed: number): Rng {
  let s = seed | 0
  const next = (): number => {
    s = (s + 0x6d2b79f5) | 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const rng: Rng = {
    get state() { return s },
    set state(v: number) { s = v | 0 },
    next,
    int(maxExclusive) { return Math.floor(next() * maxExclusive) },
    range(min, max) { return min + next() * (max - min) },
    chance(p) { return next() < p },
    pick(arr) { return arr[Math.floor(next() * arr.length)]! },
    clone() { return createRng(s) },
  }
  return rng
}

export function hashStringSeed(input: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
