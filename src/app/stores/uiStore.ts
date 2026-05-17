import { create } from 'zustand'

export type Screen = 'title' | 'colony' | 'battle'
export type SpeedSetting = 0 | 1 | 2 | 4
export type ToolMode = 'select' | 'chop' | 'mine' | 'tame' | 'cancel' | 'build'

interface UiState {
  screen: Screen
  speed: SpeedSetting
  selectedEid: number | null
  toolMode: ToolMode
  buildKind: number // StructureKind id, 0 = none
  setScreen: (s: Screen) => void
  setSpeed: (s: SpeedSetting) => void
  setSelected: (eid: number | null) => void
  setToolMode: (m: ToolMode) => void
  setBuildKind: (k: number) => void
}

export const useUiStore = create<UiState>((set) => ({
  screen: 'title',
  speed: 1,
  selectedEid: null,
  toolMode: 'select',
  buildKind: 0,
  setScreen: (screen) => set({ screen }),
  setSpeed: (speed) => set({ speed }),
  setSelected: (selectedEid) => set({ selectedEid }),
  setToolMode: (toolMode) => set({ toolMode }),
  setBuildKind: (buildKind) => set({ buildKind }),
}))
