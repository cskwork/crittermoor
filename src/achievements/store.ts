import { create } from 'zustand'
import { ACHIEVEMENTS, type AchievementId } from './registry'

const STORAGE_KEY = 'crittermoor.achievements.v1'
const COUNTERS_KEY = 'crittermoor.achievements.counters.v1'

interface PersistedShape {
  unlocked: Record<AchievementId, number> // id -> unlocked-at epoch ms
}

interface CountersShape {
  tameCount: number
  speciesTamed: Record<number, number> // speciesId -> count
}

function loadPersisted(): PersistedShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { unlocked: {} as Record<AchievementId, number> }
    const parsed = JSON.parse(raw) as PersistedShape
    if (typeof parsed !== 'object' || parsed === null || typeof parsed.unlocked !== 'object') {
      return { unlocked: {} as Record<AchievementId, number> }
    }
    return parsed
  } catch {
    return { unlocked: {} as Record<AchievementId, number> }
  }
}

function loadCounters(): CountersShape {
  try {
    const raw = localStorage.getItem(COUNTERS_KEY)
    if (!raw) return { tameCount: 0, speciesTamed: {} }
    const parsed = JSON.parse(raw) as CountersShape
    return {
      tameCount: typeof parsed.tameCount === 'number' ? parsed.tameCount : 0,
      speciesTamed: typeof parsed.speciesTamed === 'object' && parsed.speciesTamed ? parsed.speciesTamed : {},
    }
  } catch {
    return { tameCount: 0, speciesTamed: {} }
  }
}

function persist(state: PersistedShape): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Quota exceeded or disabled storage — game still runs, gallery just loses persistence.
  }
}

function persistCounters(c: CountersShape): void {
  try {
    localStorage.setItem(COUNTERS_KEY, JSON.stringify(c))
  } catch {
    // ignore
  }
}

interface ToastEvent {
  id: AchievementId
  shownAt: number
}

interface AchievementStore {
  unlocked: Record<AchievementId, number>
  toasts: ToastEvent[]
  counters: CountersShape
  unlock: (id: AchievementId) => boolean
  bumpTame: (speciesId: number) => void
  dismissToast: (shownAt: number) => void
  reset: () => void
}

export const useAchievementStore = create<AchievementStore>((set, get) => ({
  unlocked: loadPersisted().unlocked,
  toasts: [],
  counters: loadCounters(),
  unlock: (id) => {
    const { unlocked, toasts } = get()
    if (unlocked[id]) return false
    const now = Date.now()
    const nextUnlocked = { ...unlocked, [id]: now }
    persist({ unlocked: nextUnlocked })
    set({ unlocked: nextUnlocked, toasts: [...toasts, { id, shownAt: now }] })
    return true
  },
  bumpTame: (speciesId) => {
    const next: CountersShape = {
      tameCount: get().counters.tameCount + 1,
      speciesTamed: { ...get().counters.speciesTamed, [speciesId]: (get().counters.speciesTamed[speciesId] ?? 0) + 1 },
    }
    persistCounters(next)
    set({ counters: next })
  },
  dismissToast: (shownAt) => {
    set({ toasts: get().toasts.filter((t) => t.shownAt !== shownAt) })
  },
  reset: () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(COUNTERS_KEY)
    } catch {
      // ignore
    }
    set({
      unlocked: {} as Record<AchievementId, number>,
      toasts: [],
      counters: { tameCount: 0, speciesTamed: {} },
    })
  },
}))

export function totalAchievements(): number {
  return ACHIEVEMENTS.length
}
