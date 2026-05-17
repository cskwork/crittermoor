export type Screen = 'title' | 'colony' | 'battle';
export type SpeedSetting = 0 | 1 | 2 | 4;
interface UiState {
    screen: Screen;
    speed: SpeedSetting;
    selectedEid: number | null;
    setScreen: (s: Screen) => void;
    setSpeed: (s: SpeedSetting) => void;
    setSelected: (eid: number | null) => void;
}
export declare const useUiStore: import("zustand").UseBoundStore<import("zustand").StoreApi<UiState>>;
export {};
