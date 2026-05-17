import { create } from 'zustand'
import type { BattleAction, BattleState } from '@/game/Sim/Battle/BattleState'

interface BattleStore {
  state: BattleState | null
  onAction: ((side: 0 | 1, action: BattleAction) => void) | null
  onEnd: ((winner: 0 | 1 | null) => void) | null
  setState: (state: BattleState | null) => void
  setHandlers: (onAction: BattleStore['onAction'], onEnd: BattleStore['onEnd']) => void
}

export const useBattleStore = create<BattleStore>((set) => ({
  state: null,
  onAction: null,
  onEnd: null,
  setState: (state) => set({ state }),
  setHandlers: (onAction, onEnd) => set({ onAction, onEnd }),
}))
