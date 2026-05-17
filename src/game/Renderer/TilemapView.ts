import { Container, Graphics } from 'pixi.js'
import { TILE_SIZE, TERRAIN_COLOR, type Terrain } from '@/shared/constants'
import type { SimWorld } from '../Sim/world'

export class TilemapView {
  readonly container: Container
  private gfx: Graphics
  private lastTickRendered = -1

  constructor(sim: SimWorld) {
    this.container = new Container()
    this.container.label = 'tilemap'
    this.gfx = new Graphics()
    this.container.addChild(this.gfx)
    this.render(sim)
  }

  update(sim: SimWorld): void {
    if (sim.tick !== this.lastTickRendered) {
      this.render(sim)
      this.lastTickRendered = sim.tick
    }
  }

  private render(sim: SimWorld): void {
    const g = this.gfx
    g.clear()
    const { width, height, terrain } = sim.map
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const t = terrain[y * width + x] as Terrain
        const color = TERRAIN_COLOR[t]
        g.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE).fill(color)
      }
    }
  }
}
