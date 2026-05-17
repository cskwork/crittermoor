// External storage for path nodes keyed by entity id; bitecs components can't hold arrays.

export interface StoredPath {
  nodes: Int16Array
  cursor: number
}

export class PathStorage {
  private map = new Map<number, StoredPath>()
  set(eid: number, nodes: Int16Array): void {
    this.map.set(eid, { nodes, cursor: 0 })
  }
  get(eid: number): StoredPath | undefined {
    return this.map.get(eid)
  }
  clear(eid: number): void {
    this.map.delete(eid)
  }
  size(): number {
    return this.map.size
  }
}
