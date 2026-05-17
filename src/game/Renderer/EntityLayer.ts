import { Container, Graphics, Sprite } from 'pixi.js'
import { TILE_SIZE } from '@/shared/constants'
import type { SimWorld } from '../Sim/world'
import { Critter, Position, Renderable } from '../Sim/components'
import { defineQuery, hasComponent } from 'bitecs'
import { speciesById } from '../Sim/Critters/species'
import { createSpriteCache, type SpriteCache } from './SpriteCache'

const visibleQuery = defineQuery([Position, Renderable])

export class EntityLayer {
  readonly container: Container
  private graphicsByEid = new Map<number, Graphics>()
  private spriteByEid = new Map<number, Sprite>()
  private cache: SpriteCache

  constructor(_sim: SimWorld) {
    this.container = new Container()
    this.container.label = 'entities'
    this.cache = createSpriteCache()
    void this.cache.preloadAll() // async; sprites will appear once loaded
  }

  update(sim: SimWorld): void {
    const eids = visibleQuery(sim.ecs)
    const seen = new Set<number>()
    for (let i = 0; i < eids.length; i++) {
      const eid = eids[i]!
      seen.add(eid)
      const isCritter = hasComponent(sim.ecs, Critter, eid)
      const species = isCritter ? speciesById(Critter.speciesId[eid] ?? 0) : null
      const spriteKey = species?.key
      let node: Graphics | Sprite
      if (spriteKey) {
        node = this.ensureSprite(eid, spriteKey) ?? this.ensureGraphics(eid)
      } else {
        node = this.ensureGraphics(eid)
      }
      const px = Position.x[eid]! * TILE_SIZE + TILE_SIZE / 2
      const py = Position.y[eid]! * TILE_SIZE + TILE_SIZE / 2
      node.position.set(px, py)
    }
    for (const [eid, g] of this.graphicsByEid) {
      if (!seen.has(eid)) {
        g.destroy()
        this.graphicsByEid.delete(eid)
      }
    }
    for (const [eid, s] of this.spriteByEid) {
      if (!seen.has(eid)) {
        s.destroy()
        this.spriteByEid.delete(eid)
      }
    }
  }

  private ensureGraphics(eid: number): Graphics {
    let g = this.graphicsByEid.get(eid)
    if (!g) {
      g = new Graphics()
      g.circle(0, 0, 8).fill(Renderable.tint[eid] ?? 0xffffff)
      this.container.addChild(g)
      this.graphicsByEid.set(eid, g)
    }
    return g
  }

  private ensureSprite(eid: number, key: string): Sprite | null {
    let s = this.spriteByEid.get(eid)
    if (s) return s
    const tex = this.cache.textureBySpeciesKey(key)
    if (!tex) return null
    s = new Sprite(tex)
    s.anchor.set(0.5)
    s.width = TILE_SIZE
    s.height = TILE_SIZE
    this.container.addChild(s)
    this.spriteByEid.set(eid, s)
    // Remove placeholder graphics if present.
    const placeholder = this.graphicsByEid.get(eid)
    if (placeholder) {
      placeholder.destroy()
      this.graphicsByEid.delete(eid)
    }
    return s
  }
}
