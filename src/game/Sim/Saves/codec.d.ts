import { type SimWorld } from '../world';
import { type SaveDoc } from './schema';
export declare function serialize(sim: SimWorld): SaveDoc;
export declare function deserialize(doc: SaveDoc): SimWorld;
