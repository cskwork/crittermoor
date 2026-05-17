import { Container, Graphics } from 'pixi.js'
import { CHUNK_SIZE, TILE_SIZE, TERRAIN_COLOR, type Terrain } from '@/shared/constants'
import type { SimWorld } from '../Sim/world'

interface ChunkEntry {
  gfx: Graphics
  terrainHash: number // cheap dirty-check
}

export class TilemapView {
  readonly container: Container
  private chunks: (ChunkEntry | null)[] = []
  private chunksX = 0
  private chunksY = 0
  private mapW = 0
  private mapH = 0

  constructor(sim: SimWorld) {
    this.container = new Container()
    this.container.label = 'tilemap'
    this.rebuild(sim)
  }

  update(sim: SimWorld): void {
    if (sim.map.width !== this.mapW || sim.map.height !== this.mapH) {
      this.rebuild(sim)
      return
    }
    for (let cy = 0; cy < this.chunksY; cy++) {
      for (let cx = 0; cx < this.chunksX; cx++) {
        this.redrawChunkIfDirty(sim, cx, cy)
      }
    }
  }

  private rebuild(sim: SimWorld): void {
    this.container.removeChildren()
    for (const e of this.chunks) e?.gfx.destroy()
    this.chunks = []
    this.mapW = sim.map.width
    this.mapH = sim.map.height
    this.chunksX = Math.ceil(this.mapW / CHUNK_SIZE)
    this.chunksY = Math.ceil(this.mapH / CHUNK_SIZE)
    for (let cy = 0; cy < this.chunksY; cy++) {
      for (let cx = 0; cx < this.chunksX; cx++) {
        const gfx = new Graphics()
        this.container.addChild(gfx)
        const entry: ChunkEntry = { gfx, terrainHash: -1 }
        this.chunks.push(entry)
        this.redrawChunkIfDirty(sim, cx, cy)
      }
    }
  }

  private redrawChunkIfDirty(sim: SimWorld, cx: number, cy: number): void {
    const entry = this.chunks[cy * this.chunksX + cx]
    if (!entry) return
    const x0 = cx * CHUNK_SIZE
    const y0 = cy * CHUNK_SIZE
    const x1 = Math.min(x0 + CHUNK_SIZE, this.mapW)
    const y1 = Math.min(y0 + CHUNK_SIZE, this.mapH)
    const hash = hashChunk(sim, x0, y0, x1, y1)
    if (hash === entry.terrainHash) return
    entry.terrainHash = hash
    const g = entry.gfx
    g.clear()
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const t = sim.map.terrain[y * this.mapW + x] as Terrain
        g.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE).fill(TERRAIN_COLOR[t])
      }
    }
  }
}

// FNV-1a over a chunk's terrain bytes. Cheap, sensitive to any tile change.
function hashChunk(sim: SimWorld, x0: number, y0: number, x1: number, y1: number): number {
  let h = 2166136261 >>> 0
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      h ^= sim.map.terrain[y * sim.map.width + x]!
      h = Math.imul(h, 16777619)
    }
  }
  return h >>> 0
}
