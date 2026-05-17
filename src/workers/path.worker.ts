// Path worker: receives PathRequest, replies with PathResult.
// Transfers the cost grid by reference (SharedArrayBuffer optional; here we copy).
import { aStar, type PathRequest, type PathResult } from '@/game/Sim/Pathing/AStar'

interface PathMessage extends PathRequest {
  requestId: number
}

self.onmessage = (e: MessageEvent<PathMessage>) => {
  const { requestId, ...req } = e.data
  const res: PathResult = aStar(req)
  ;(self as unknown as Worker).postMessage(
    { requestId, ok: res.ok, nodes: res.nodes, expanded: res.expanded },
    [res.nodes.buffer],
  )
}
