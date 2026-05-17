// Pure A* on a uniform grid; deterministic ordering via fixed tie-breaks.
// Cost grid: 0 = impassable. Heuristic: octile distance.

export interface PathRequest {
  width: number
  height: number
  cost: Uint16Array
  fromX: number
  fromY: number
  toX: number
  toY: number
  allowDiagonal?: boolean
}

export interface PathResult {
  ok: boolean
  nodes: Int16Array // flat [x0,y0, x1,y1, ...]
  expanded: number
}

const D = 10
const D2 = 14

export function aStar(req: PathRequest): PathResult {
  const { width, height, cost, fromX, fromY, toX, toY } = req
  const allowDiag = req.allowDiagonal !== false
  const len = width * height
  const fromIdx = idx(fromX, fromY, width)
  const toIdx = idx(toX, toY, width)
  if (fromIdx === toIdx) return { ok: true, nodes: new Int16Array([fromX, fromY]), expanded: 0 }
  if (toX < 0 || toY < 0 || toX >= width || toY >= height) return fail()
  if (cost[toIdx] === 0) return fail()

  const gScore = new Uint32Array(len).fill(0xffffffff)
  const cameFrom = new Int32Array(len).fill(-1)
  const closed = new Uint8Array(len)
  const open = new MinHeap()
  gScore[fromIdx] = 0
  open.push(fromIdx, heuristic(fromX, fromY, toX, toY, allowDiag))

  let expanded = 0
  while (open.size > 0) {
    const cur = open.pop()
    if (cur === toIdx) {
      return { ok: true, nodes: reconstruct(cameFrom, cur, width), expanded }
    }
    if (closed[cur]) continue
    closed[cur] = 1
    expanded++
    const cx = cur % width
    const cy = (cur / width) | 0
    for (let dir = 0; dir < (allowDiag ? 8 : 4); dir++) {
      const dx = DIR_X[dir]!
      const dy = DIR_Y[dir]!
      const nx = cx + dx
      const ny = cy + dy
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
      const ni = idx(nx, ny, width)
      const tileCost = cost[ni]!
      if (tileCost === 0 || closed[ni]) continue
      // prevent corner-cut through impassable
      if (dx !== 0 && dy !== 0) {
        if (cost[idx(cx + dx, cy, width)] === 0 || cost[idx(cx, cy + dy, width)] === 0) continue
      }
      const stepCost = (dx !== 0 && dy !== 0 ? D2 : D) * (tileCost / 10)
      const tentative = gScore[cur]! + (stepCost | 0)
      if (tentative < gScore[ni]!) {
        cameFrom[ni] = cur
        gScore[ni] = tentative
        const f = tentative + heuristic(nx, ny, toX, toY, allowDiag)
        open.push(ni, f)
      }
    }
  }
  return fail()

  function fail(): PathResult {
    return { ok: false, nodes: new Int16Array(0), expanded }
  }
}

function idx(x: number, y: number, w: number): number {
  return y * w + x
}

function heuristic(x: number, y: number, tx: number, ty: number, allowDiag: boolean): number {
  const dx = Math.abs(x - tx)
  const dy = Math.abs(y - ty)
  return allowDiag ? D * (dx + dy) + (D2 - 2 * D) * Math.min(dx, dy) : D * (dx + dy)
}

const DIR_X = [1, 0, -1, 0, 1, 1, -1, -1]
const DIR_Y = [0, 1, 0, -1, 1, -1, 1, -1]

function reconstruct(cameFrom: Int32Array, end: number, width: number): Int16Array {
  const path: number[] = []
  let cur = end
  while (cur !== -1) {
    path.push(cur % width, (cur / width) | 0)
    cur = cameFrom[cur]!
  }
  const out = new Int16Array(path.length)
  for (let i = 0, j = path.length - 2; j >= 0; j -= 2) {
    out[i++] = path[j]!
    out[i++] = path[j + 1]!
  }
  return out
}

// Tiny binary heap keyed by f-score.
class MinHeap {
  private nodes: number[] = []
  private scores: number[] = []
  size = 0
  push(node: number, score: number): void {
    this.nodes.push(node)
    this.scores.push(score)
    this.size++
    this.bubbleUp(this.size - 1)
  }
  pop(): number {
    const top = this.nodes[0]!
    const lastNode = this.nodes.pop()!
    const lastScore = this.scores.pop()!
    this.size--
    if (this.size > 0) {
      this.nodes[0] = lastNode
      this.scores[0] = lastScore
      this.sinkDown(0)
    }
    return top
  }
  private bubbleUp(i: number): void {
    while (i > 0) {
      const p = (i - 1) >> 1
      if (this.scores[i]! < this.scores[p]!) {
        this.swap(i, p)
        i = p
      } else break
    }
  }
  private sinkDown(i: number): void {
    for (;;) {
      const l = 2 * i + 1
      const r = 2 * i + 2
      let smallest = i
      if (l < this.size && this.scores[l]! < this.scores[smallest]!) smallest = l
      if (r < this.size && this.scores[r]! < this.scores[smallest]!) smallest = r
      if (smallest === i) break
      this.swap(i, smallest)
      i = smallest
    }
  }
  private swap(a: number, b: number): void {
    const tn = this.nodes[a]!
    const ts = this.scores[a]!
    this.nodes[a] = this.nodes[b]!
    this.scores[a] = this.scores[b]!
    this.nodes[b] = tn
    this.scores[b] = ts
  }
}
