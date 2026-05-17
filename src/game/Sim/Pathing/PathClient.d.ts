import type { PathRequest } from './AStar';
export interface PathClient {
    request(req: PathRequest): Promise<Int16Array | null>;
    dispose(): void;
}
export declare function createPathClient(): PathClient;
