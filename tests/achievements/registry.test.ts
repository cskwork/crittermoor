import { beforeEach, describe, expect, it } from 'vitest'
import { ACHIEVEMENTS } from '@/achievements/registry'
import { useAchievementStore } from '@/achievements/store'
import { onAutosaveRecovered, onStructureBuilt, onTame } from '@/achievements/trigger'

beforeEach(() => {
  useAchievementStore.getState().reset()
})

describe('achievements', () => {
  it('registry has exactly 10 entries with unique ids', () => {
    expect(ACHIEVEMENTS).toHaveLength(10)
    const ids = ACHIEVEMENTS.map((a) => a.id)
    expect(new Set(ids).size).toBe(10)
  })

  it('first tame unlocks first-tame achievement and creates a toast', () => {
    onTame(1)
    const { unlocked, toasts } = useAchievementStore.getState()
    expect(unlocked['first-tame']).toBeGreaterThan(0)
    expect(toasts.find((t) => t.id === 'first-tame')).toBeTruthy()
  })

  it('repeated tame does not re-toast the same achievement', () => {
    onTame(1)
    const firstToasts = useAchievementStore.getState().toasts.length
    onTame(1)
    onTame(1)
    expect(useAchievementStore.getState().toasts.length).toBe(firstToasts)
  })

  it('structure built unlocks first-structure-built', () => {
    onStructureBuilt(0)
    expect(useAchievementStore.getState().unlocked['first-structure-built']).toBeGreaterThan(0)
  })

  it('autosave recovery unlocks autosave-recovered', () => {
    onAutosaveRecovered()
    expect(useAchievementStore.getState().unlocked['autosave-recovered']).toBeGreaterThan(0)
  })
})
