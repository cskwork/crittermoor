import { create } from 'zustand'

export type Screen = 'title' | 'colony' | 'battle'
export type SpeedSetting = 0 | 1 | 2 | 4

interface UiState {
  screen: Screen
  speed: SpeedSetting
  selectedEid: number | null
  setScreen: (s: Screen) => void
  setSpeed: (s: SpeedSetting) => void
  setSelected: (eid: number | null) => void
}

export const useUiStore = create<UiState>((set) => ({
  screen: 'title',
  speed: 1,
  selectedEid: null,
  setScreen: (screen) => set({ screen }),
  setSpeed: (speed) => set({ speed }),
  setSelected: (selectedEid) => set({ selectedEid }),
}))
