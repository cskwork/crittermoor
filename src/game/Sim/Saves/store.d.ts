import type { SimWorld } from '../world';
import type { SaveMeta } from './schema';
export declare function saveGame(slotId: string, sim: SimWorld, name?: string): Promise<SaveMeta>;
export declare function loadGame(slotId: string): Promise<SimWorld | null>;
export declare function listSaves(): Promise<SaveMeta[]>;
export declare function deleteSave(slotId: string): Promise<void>;
