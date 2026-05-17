import { Container, Graphics, Sprite } from 'pixi.js'
import { CHUNK_SIZE, TILE_SIZE, TERRAIN_COLOR, type Terrain } from '@/shared/constants'
import type { SimWorld } from '../Sim/world'
import { getTerrainTexture, preloadTerrainTextures } from './TerrainTextures'

interface ChunkEntry {
  group: Container
  gfx: Graphics
  spriteByTile: Map<number, Sprite>
  terrainHash: number
  texturesReady: boolean
}

export class TilemapView {
  readonly container: Container
  private chunks: (ChunkEntry | null)[] = []
  private chunksX = 0
  private chunksY = 0
  private mapW = 0
  private mapH = 0
  private texturesLoaded = false

  constructor(sim: SimWorld) {
    this.container = new Container()
    this.container.label = 'tilemap'
    this.rebuild(sim)
    void preloadTerrainTextures().then(() => {
      this.texturesLoaded = true
      // Bust hashes so the next update repaints with sprites layered over solids.
      for (const c of this.chunks) if (c) c.terrainHash = -1
    })
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
    for (const e of this.chunks) {
      if (!e) continue
      e.group.destroy({ children: true })
    }
    this.container.removeChildren()
    this.chunks = []
    this.mapW = sim.map.width
    this.mapH = sim.map.height
    this.chunksX = Math.ceil(this.mapW / CHUNK_SIZE)
    this.chunksY = Math.ceil(this.mapH / CHUNK_SIZE)
    for (let cy = 0; cy < this.chunksY; cy++) {
      for (let cx = 0; cx < this.chunksX; cx++) {
        const group = new Container()
        const gfx = new Graphics()
        group.addChild(gfx)
        this.container.addChild(group)
        const entry: ChunkEntry = {
          group,
          gfx,
          spriteByTile: new Map(),
          terrainHash: -1,
          texturesReady: false,
        }
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
    if (hash === entry.terrainHash && entry.texturesReady === this.texturesLoaded) return
    entry.terrainHash = hash
    entry.texturesReady = this.texturesLoaded

    // Always paint colored solids as the fallback layer so tiles never go blank.
    const g = entry.gfx
    g.clear()
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const t = sim.map.terrain[y * this.mapW + x] as Terrain
        g.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE).fill(TERRAIN_COLOR[t])
      }
    }

    if (!this.texturesLoaded) return
    // Lay terrain sprites on top once textures are ready.
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const t = sim.map.terrain[y * this.mapW + x] as Terrain
        const tex = getTerrainTexture(t)
        const localKey = (y - y0) * CHUNK_SIZE + (x - x0)
        let sprite = entry.spriteByTile.get(localKey)
        if (!tex) {
          if (sprite) {
            sprite.destroy()
            entry.spriteByTile.delete(localKey)
          }
          continue
        }
        if (!sprite) {
          sprite = new Sprite(tex)
          sprite.width = TILE_SIZE
          sprite.height = TILE_SIZE
          entry.group.addChild(sprite)
          entry.spriteByTile.set(localKey, sprite)
        } else if (sprite.texture !== tex) {
          sprite.texture = tex
        }
        sprite.position.set(x * TILE_SIZE, y * TILE_SIZE)
      }
    }
  }
}

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
