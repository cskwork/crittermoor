export interface PathRequest {
    width: number;
    height: number;
    cost: Uint16Array;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    allowDiagonal?: boolean;
}
export interface PathResult {
    ok: boolean;
    nodes: Int16Array;
    expanded: number;
}
export declare function aStar(req: PathRequest): PathResult;
