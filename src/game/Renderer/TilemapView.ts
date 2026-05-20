import { Container, Graphics, Sprite } from 'pixi.js'
import { CHUNK_SIZE, TILE_SIZE, TERRAIN_COLOR, Terrain } from '@/shared/constants'
import type { SimWorld } from '../Sim/world'
import { getTerrainTexture, preloadTerrainTextures } from './TerrainTextures'

interface ChunkEntry {
  group: Container
  gfx: Graphics
  spriteByTile: Map<number, Sprite>
  terrainHash: number
  texturesReady: boolean
  waterTickBucket: number
}

const WATER_SHIMMER_PERIOD = 36 // ticks per shimmer step (~4.5s at 1x)

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
    const waterBucket = Math.floor(sim.tick / WATER_SHIMMER_PERIOD)
    for (let cy = 0; cy < this.chunksY; cy++) {
      for (let cx = 0; cx < this.chunksX; cx++) {
        this.redrawChunkIfDirty(sim, cx, cy, waterBucket)
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
    const initialBucket = Math.floor(sim.tick / WATER_SHIMMER_PERIOD)
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
          waterTickBucket: -1,
        }
        this.chunks.push(entry)
        this.redrawChunkIfDirty(sim, cx, cy, initialBucket)
      }
    }
  }

  private redrawChunkIfDirty(sim: SimWorld, cx: number, cy: number, waterBucket: number): void {
    const entry = this.chunks[cy * this.chunksX + cx]
    if (!entry) return
    const x0 = cx * CHUNK_SIZE
    const y0 = cy * CHUNK_SIZE
    const x1 = Math.min(x0 + CHUNK_SIZE, this.mapW)
    const y1 = Math.min(y0 + CHUNK_SIZE, this.mapH)
    const hasWater = chunkHasWater(sim, x0, y0, x1, y1)
    const hash = hashChunk(sim, x0, y0, x1, y1)
    const waterChanged = hasWater && waterBucket !== entry.waterTickBucket
    if (hash === entry.terrainHash && entry.texturesReady === this.texturesLoaded && !waterChanged) return
    entry.terrainHash = hash
    entry.texturesReady = this.texturesLoaded
    entry.waterTickBucket = waterBucket

    // Paint colored solids with per-tile jitter + speckles + water shimmer.
    const g = entry.gfx
    g.clear()
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const t = sim.map.terrain[y * this.mapW + x] as Terrain
        const baseColor = TERRAIN_COLOR[t]
        let color = baseColor
        // Deterministic per-tile variant 0..3.
        const v = (((x * 73856093) ^ (y * 19349663)) >>> 0) & 0xff
        const variant = v % 4
        if (t === Terrain.WaterShallow || t === Terrain.WaterDeep) {
          // Shimmer: phase per tile + global waterBucket → 4-step cycle.
          const phase = (v + waterBucket) & 0x3
          color = shadeColor(baseColor, phase === 0 ? 6 : phase === 1 ? 0 : phase === 2 ? -8 : 0)
        } else {
          // Small ±5% brightness jitter per tile so tiles aren't uniform.
          color = shadeColor(baseColor, [0, -4, 3, -2][variant]!)
        }
        g.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE).fill(color)
        // Tiny detail dots on grass / forest / stone (decoration only, fixed by hash).
        if (t === Terrain.Grass || t === Terrain.Forest || t === Terrain.Stone) {
          const dotCount = t === Terrain.Forest ? 2 : 1
          for (let i = 0; i < dotCount; i++) {
            const seed = (v * (i + 1)) >>> 0
            const ox = (seed % (TILE_SIZE - 4)) + 2
            const oy = ((seed >>> 4) % (TILE_SIZE - 4)) + 2
            const dotColor = shadeColor(baseColor, t === Terrain.Forest ? -16 : -10)
            g.rect(x * TILE_SIZE + ox, y * TILE_SIZE + oy, 2, 2).fill(dotColor)
          }
        }
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
        // Per-tile sprite tint variation breaks the "wallpaper" feel without new art.
        const v = (((x * 73856093) ^ (y * 19349663)) >>> 0) & 0xff
        const variantTint = shadeColor(0xffffff, [0, -8, 6, -4][v % 4]!)
        sprite.tint = variantTint
      }
    }
  }
}

function chunkHasWater(sim: SimWorld, x0: number, y0: number, x1: number, y1: number): boolean {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const t = sim.map.terrain[y * sim.map.width + x] as Terrain
      if (t === Terrain.WaterShallow || t === Terrain.WaterDeep) return true
    }
  }
  return false
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

// Shift each channel by `delta` (signed), clamped to [0..255].
function shadeColor(color: number, delta: number): number {
  const r = clamp255(((color >> 16) & 0xff) + delta)
  const g = clamp255(((color >> 8) & 0xff) + delta)
  const b = clamp255((color & 0xff) + delta)
  return (r << 16) | (g << 8) | b
}

function clamp255(v: number): number {
  return Math.max(0, Math.min(255, v))
}
