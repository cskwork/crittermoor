import { Container, Graphics, Sprite } from 'pixi.js'
import { TILE_SIZE } from '@/shared/constants'
import type { SimWorld } from '../Sim/world'
import { Critter, Position, Renderable, Structure } from '../Sim/components'
import { defineQuery, hasComponent } from 'bitecs'
import { speciesById } from '../Sim/Critters/species'
import { STRUCTURES, type StructureKind } from '../Sim/Structures/defs'
import { createSpriteCache, type SpriteCache } from './SpriteCache'

const visibleQuery = defineQuery([Position, Renderable])

type SpriteRef =
  | { kind: 'critter'; speciesKey: string }
  | { kind: 'warden'; tint: number }
  | { kind: 'structure'; key: string; blueprint: boolean }

export class EntityLayer {
  readonly container: Container
  private graphicsByEid = new Map<number, Graphics>()
  private spriteByEid = new Map<number, Sprite>()
  private cache: SpriteCache

  constructor(_sim: SimWorld) {
    this.container = new Container()
    this.container.label = 'entities'
    this.cache = createSpriteCache()
    void this.cache.preloadAll()
  }

  update(sim: SimWorld): void {
    const eids = visibleQuery(sim.ecs)
    const seen = new Set<number>()
    for (let i = 0; i < eids.length; i++) {
      const eid = eids[i]!
      seen.add(eid)
      const ref = this.refFor(sim, eid)
      const node = this.ensureNode(eid, ref)
      const px = Position.x[eid]! * TILE_SIZE + TILE_SIZE / 2
      const py = Position.y[eid]! * TILE_SIZE + TILE_SIZE / 2
      node.position.set(px, py)
      if (ref.kind === 'structure' && node instanceof Sprite) {
        node.alpha = ref.blueprint ? 0.45 : 1
      }
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

  private refFor(sim: SimWorld, eid: number): SpriteRef {
    if (hasComponent(sim.ecs, Structure, eid)) {
      const kind = Structure.kind[eid] as StructureKind
      const def = STRUCTURES[kind]
      return {
        kind: 'structure',
        key: def?.spriteKey ?? 'wall',
        blueprint: Structure.state[eid] === 0,
      }
    }
    if (hasComponent(sim.ecs, Critter, eid)) {
      const species = speciesById(Critter.speciesId[eid] ?? 0)
      return { kind: 'critter', speciesKey: species?.key ?? 'spritmoth' }
    }
    return { kind: 'warden', tint: Renderable.tint[eid] ?? 0xffffff }
  }

  private ensureNode(eid: number, ref: SpriteRef): Graphics | Sprite {
    const sprite = this.ensureSprite(eid, ref)
    if (sprite) return sprite
    return this.ensureGraphics(eid)
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

  private ensureSprite(eid: number, ref: SpriteRef): Sprite | null {
    let s = this.spriteByEid.get(eid)
    if (s) return s
    let tex
    if (ref.kind === 'critter') tex = this.cache.textureBySpeciesKey(ref.speciesKey)
    else if (ref.kind === 'warden') tex = this.cache.textureForWardenTint(ref.tint)
    else tex = this.cache.textureForStructureKey(ref.key)
    if (!tex) return null
    s = new Sprite(tex)
    s.anchor.set(0.5)
    s.width = TILE_SIZE
    s.height = TILE_SIZE
    this.container.addChild(s)
    this.spriteByEid.set(eid, s)
    const placeholder = this.graphicsByEid.get(eid)
    if (placeholder) {
      placeholder.destroy()
      this.graphicsByEid.delete(eid)
    }
    return s
  }
}
