import { create } from 'zustand';
export const useUiStore = create((set) => ({
    screen: 'title',
    speed: 1,
    selectedEid: null,
    setScreen: (screen) => set({ screen }),
    setSpeed: (speed) => set({ speed }),
    setSelected: (selectedEid) => set({ selectedEid }),
}));
