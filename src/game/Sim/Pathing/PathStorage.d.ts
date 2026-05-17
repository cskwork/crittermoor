export interface StoredPath {
    nodes: Int16Array;
    cursor: number;
}
export declare class PathStorage {
    private map;
    set(eid: number, nodes: Int16Array): void;
    get(eid: number): StoredPath | undefined;
    clear(eid: number): void;
    size(): number;
}
