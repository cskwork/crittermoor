// Achievement registry — 10 device-scoped first-time milestones.
//
// Persistence is intentionally separate from save files: a player's trophy
// gallery follows the device (browser) and survives across colonies. The id
// list is closed; adding a new achievement requires a registry edit.

export type AchievementId =
  | 'first-tame'
  | 'first-raid-survived'
  | 'first-structure-built'
  | 'ten-critters-tamed'
  | 'hundred-meals-cooked'
  | 'survived-50-days'
  | 'defeated-a-boss-raid'
  | 'all-six-species-tamed'
  | 'autosave-recovered'
  | 'no-warden-died-50-days'

export interface AchievementDef {
  id: AchievementId
  title: string
  description: string
  // 'wired' = trigger site exists in current build; 'stub' = registered for the
  // gallery but the underlying system has not landed yet. Surfaced in the
  // Trophies UI so players know which are reachable.
  status: 'wired' | 'stub'
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  {
    id: 'first-tame',
    title: 'First friend',
    description: 'Tame your first wild critter.',
    status: 'wired',
  },
  {
    id: 'first-raid-survived',
    title: 'Hold the line',
    description: 'Survive your first raid.',
    status: 'wired',
  },
  {
    id: 'first-structure-built',
    title: 'Brick by brick',
    description: 'Finish building any structure.',
    status: 'wired',
  },
  {
    id: 'ten-critters-tamed',
    title: 'Whisperer',
    description: 'Tame 10 critters in total on this device.',
    status: 'wired',
  },
  {
    id: 'hundred-meals-cooked',
    title: 'Hearth keeper',
    description: 'Cook 100 meals.',
    status: 'stub',
  },
  {
    id: 'survived-50-days',
    title: 'Half a season',
    description: 'Survive 50 in-game days in a single colony.',
    status: 'wired',
  },
  {
    id: 'defeated-a-boss-raid',
    title: 'Pack-breaker',
    description: 'Defeat a boss-tier raid.',
    status: 'stub',
  },
  {
    id: 'all-six-species-tamed',
    title: 'Full menagerie',
    description: 'Tame at least one of each of the six starter species.',
    status: 'wired',
  },
  {
    id: 'autosave-recovered',
    title: 'Crash-proof',
    description: 'Recover a colony from the autosave slot.',
    status: 'wired',
  },
  {
    id: 'no-warden-died-50-days',
    title: 'No one left behind',
    description: 'Reach day 50 without losing a warden.',
    status: 'stub',
  },
]

export function achievementById(id: AchievementId): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id)
}
