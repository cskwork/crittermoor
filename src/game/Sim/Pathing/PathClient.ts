import type { PathRequest } from './AStar'

interface PendingRequest {
  resolve(nodes: Int16Array): void
  reject(reason: unknown): void
}

export interface PathClient {
  request(req: PathRequest): Promise<Int16Array | null>
  dispose(): void
}

export function createPathClient(): PathClient {
  const worker = new Worker(new URL('../../../workers/path.worker.ts', import.meta.url), { type: 'module' })
  const pending = new Map<number, PendingRequest>()
  let nextId = 1
  worker.onmessage = (e: MessageEvent<{ requestId: number; ok: boolean; nodes: Int16Array }>) => {
    const p = pending.get(e.data.requestId)
    if (!p) return
    pending.delete(e.data.requestId)
    p.resolve(e.data.ok ? e.data.nodes : new Int16Array(0))
  }
  worker.onerror = (e) => {
    for (const p of pending.values()) p.reject(e)
    pending.clear()
  }
  return {
    request(req) {
      const requestId = nextId++
      // Worker mutates incoming cost buffer view; send a copy to keep our grid intact.
      const copy = new Uint16Array(req.cost)
      return new Promise((resolve, reject) => {
        pending.set(requestId, {
          resolve: (nodes) => resolve(nodes.length === 0 ? null : nodes),
          reject,
        })
        worker.postMessage({ ...req, cost: copy, requestId }, [copy.buffer])
      })
    },
    dispose() {
      worker.terminate()
      for (const p of pending.values()) p.reject(new Error('PathClient disposed'))
      pending.clear()
    },
  }
}
