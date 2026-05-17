import { create } from 'zustand'

export type Screen = 'title' | 'colony' | 'battle'
export type SpeedSetting = 0 | 1 | 2 | 4
export type ToolMode = 'select' | 'chop' | 'mine' | 'tame' | 'cancel'

interface UiState {
  screen: Screen
  speed: SpeedSetting
  selectedEid: number | null
  toolMode: ToolMode
  setScreen: (s: Screen) => void
  setSpeed: (s: SpeedSetting) => void
  setSelected: (eid: number | null) => void
  setToolMode: (m: ToolMode) => void
}

export const useUiStore = create<UiState>((set) => ({
  screen: 'title',
  speed: 1,
  selectedEid: null,
  toolMode: 'select',
  setScreen: (screen) => set({ screen }),
  setSpeed: (speed) => set({ speed }),
  setSelected: (selectedEid) => set({ selectedEid }),
  setToolMode: (toolMode) => set({ toolMode }),
}))
