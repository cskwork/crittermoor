import { create } from 'zustand'

export type Screen = 'title' | 'colony' | 'battle'
export type SpeedSetting = 0 | 1 | 2 | 4
export type ToolMode = 'select' | 'chop' | 'mine' | 'tame' | 'cancel' | 'build' | 'stockpile'

interface UiState {
  screen: Screen
  speed: SpeedSetting
  selectedEid: number | null
  toolMode: ToolMode
  buildKind: number // StructureKind id, 0 = none
  showPriorities: boolean
  setScreen: (s: Screen) => void
  setSpeed: (s: SpeedSetting) => void
  setSelected: (eid: number | null) => void
  setToolMode: (m: ToolMode) => void
  setBuildKind: (k: number) => void
  togglePriorities: () => void
  setShowPriorities: (v: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  screen: 'title',
  speed: 1,
  selectedEid: null,
  toolMode: 'select',
  buildKind: 0,
  showPriorities: false,
  setScreen: (screen) => set({ screen }),
  setSpeed: (speed) => set({ speed }),
  setSelected: (selectedEid) => set({ selectedEid }),
  setToolMode: (toolMode) => set({ toolMode }),
  setBuildKind: (buildKind) => set({ buildKind }),
  togglePriorities: () => set((s) => ({ showPriorities: !s.showPriorities })),
  setShowPriorities: (showPriorities) => set({ showPriorities }),
}))
