export declare class Game {
    private renderer;
    private scheduler;
    private sim;
    private pathClient;
    private booted;
    constructor(host: HTMLDivElement);
    boot(): Promise<void>;
    newGame(seed: number): void;
    private applyLoaded;
    dispose(disposeRenderer?: boolean): void;
    private handleTileClick;
    private requestPath;
    private toggleDesignation;
}
