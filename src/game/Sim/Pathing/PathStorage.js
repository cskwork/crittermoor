// External storage for path nodes keyed by entity id; bitecs components can't hold arrays.
export class PathStorage {
    map = new Map();
    set(eid, nodes) {
        this.map.set(eid, { nodes, cursor: 0 });
    }
    get(eid) {
        return this.map.get(eid);
    }
    clear(eid) {
        this.map.delete(eid);
    }
    size() {
        return this.map.size;
    }
}
