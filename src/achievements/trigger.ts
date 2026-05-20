import { useAchievementStore } from './store'

// Pure side-effect helpers. Sim code calls these; they do not read or write
// SimWorld. Safe to call from any tick — Zustand and localStorage are device-scoped.

export function onTame(speciesId: number): void {
  const store = useAchievementStore.getState()
  store.bumpTame(speciesId)
  store.unlock('first-tame')
  if (store.counters.tameCount + 1 >= 10) store.unlock('ten-critters-tamed')
  // counters update is async-ish; safer to re-read.
  const speciesCount = Object.keys(store.counters.speciesTamed).length + (store.counters.speciesTamed[speciesId] ? 0 : 1)
  if (speciesCount >= 6) store.unlock('all-six-species-tamed')
}

export function onStructureBuilt(_kind: number): void {
  useAchievementStore.getState().unlock('first-structure-built')
}

export function onRaidSurvived(opts: { isBoss: boolean }): void {
  const store = useAchievementStore.getState()
  store.unlock('first-raid-survived')
  if (opts.isBoss) store.unlock('defeated-a-boss-raid')
}

export function onDayElapsed(day: number, opts: { noWardenDied: boolean }): void {
  const store = useAchievementStore.getState()
  if (day >= 50) {
    store.unlock('survived-50-days')
    if (opts.noWardenDied) store.unlock('no-warden-died-50-days')
  }
}

export function onAutosaveRecovered(): void {
  useAchievementStore.getState().unlock('autosave-recovered')
}
