// Path worker: receives PathRequest, replies with PathResult.
// Transfers the cost grid by reference (SharedArrayBuffer optional; here we copy).
import { aStar } from '@/game/Sim/Pathing/AStar';
self.onmessage = (e) => {
    const { requestId, ...req } = e.data;
    const res = aStar(req);
    self.postMessage({ requestId, ok: res.ok, nodes: res.nodes, expanded: res.expanded }, [res.nodes.buffer]);
};
