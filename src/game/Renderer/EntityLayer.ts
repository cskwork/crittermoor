import { Container, Graphics, Sprite } from 'pixi.js'
import { TILE_SIZE } from '@/shared/constants'
import type { SimWorld } from '../Sim/world'
import {
  Critter,
  Health,
  Item,
  Position,
  PositionPrev,
  Renderable,
  Structure,
  TilePos,
} from '../Sim/components'
import { defineQuery, hasComponent } from 'bitecs'
import { useUiStore } from '@/app/stores/uiStore'
import { speciesById } from '../Sim/Critters/species'
import { STRUCTURES, type StructureKind } from '../Sim/Structures/defs'
import { createSpriteCache, type SpriteCache } from './SpriteCache'

const visibleQuery = defineQuery([Position, Renderable])

type SpriteRef =
  | { kind: 'critter'; speciesKey: string }
  | { kind: 'warden'; tint: number }
  | { kind: 'structure'; key: string; blueprint: boolean }
  | { kind: 'item'; tint: number }

interface NodeEntry {
  // Either a pixi Graphics fallback or a real Sprite.
  display: Graphics | Sprite
  // Decoration overlays attached to the same eid.
  selectionRing: Graphics | null
  hpBar: Graphics | null
  // Cached previous tile so we can detect "now moving"; idle bob applies only when stationary.
  lastTileKey: number
}

const BOB_AMPLITUDE = 1.2

export class EntityLayer {
  readonly container: Container
  private graphicsByEid = new Map<number, Graphics>()
  private spriteByEid = new Map<number, Sprite>()
  private entries = new Map<number, NodeEntry>()
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
    const selectedEid = useUiStore.getState().selectedEid
    const reduced = prefersReducedMotion()
    const bobPhase = sim.tick * 0.18
    for (let i = 0; i < eids.length; i++) {
      const eid = eids[i]!
      seen.add(eid)
      const ref = this.refFor(sim, eid)
      const node = this.ensureNode(eid, ref)
      // Smooth tile-to-tile interpolation. PositionPrev holds the previous
      // tick's Position; we lerp between them so wardens slide.
      const px = lerp(PositionPrev.x[eid] ?? Position.x[eid] ?? 0, Position.x[eid] ?? 0, 0.85) * TILE_SIZE + TILE_SIZE / 2
      let py = lerp(PositionPrev.y[eid] ?? Position.y[eid] ?? 0, Position.y[eid] ?? 0, 0.85) * TILE_SIZE + TILE_SIZE / 2

      // Idle bob — only when stationary and not a structure/item.
      const tx = TilePos.tx[eid] ?? 0
      const ty = TilePos.ty[eid] ?? 0
      const tileKey = ty * sim.map.width + tx
      const entry = this.entries.get(eid)
      const stationary = entry?.lastTileKey === tileKey
      if (!reduced && stationary && (ref.kind === 'warden' || ref.kind === 'critter')) {
        py += Math.sin(bobPhase + (eid % 7) * 0.6) * BOB_AMPLITUDE
      }
      node.position.set(px, py)
      if (ref.kind === 'structure' && node instanceof Sprite) {
        node.alpha = ref.blueprint ? 0.45 : 1
      }
      // Selection ring under the sprite.
      this.updateSelectionRing(eid, eid === selectedEid, ref)
      // In-world HP bar for hurt creatures / wardens.
      this.updateHpBar(sim, eid, ref)

      if (entry) entry.lastTileKey = tileKey
    }
    for (const [eid, g] of this.graphicsByEid) {
      if (!seen.has(eid)) {
        g.destroy()
        this.graphicsByEid.delete(eid)
        this.disposeDecor(eid)
        this.entries.delete(eid)
      }
    }
    for (const [eid, s] of this.spriteByEid) {
      if (!seen.has(eid)) {
        s.destroy()
        this.spriteByEid.delete(eid)
        this.disposeDecor(eid)
        this.entries.delete(eid)
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
    if (hasComponent(sim.ecs, Item, eid)) {
      return { kind: 'item', tint: Renderable.tint[eid] ?? 0x9a6f47 }
    }
    return { kind: 'warden', tint: Renderable.tint[eid] ?? 0xffffff }
  }

  private ensureNode(eid: number, ref: SpriteRef): Graphics | Sprite {
    const sprite = this.ensureSprite(eid, ref)
    if (sprite) {
      this.registerEntry(eid, sprite)
      return sprite
    }
    const g = this.ensureGraphics(eid, ref)
    this.registerEntry(eid, g)
    return g
  }

  private registerEntry(eid: number, display: Graphics | Sprite): void {
    let entry = this.entries.get(eid)
    if (!entry) {
      entry = { display, selectionRing: null, hpBar: null, lastTileKey: -1 }
      this.entries.set(eid, entry)
    } else {
      entry.display = display
    }
  }

  private ensureGraphics(eid: number, ref?: SpriteRef): Graphics {
    let g = this.graphicsByEid.get(eid)
    if (!g) {
      g = new Graphics()
      const tint = Renderable.tint[eid] ?? 0xffffff
      if (ref && ref.kind === 'item') {
        g.poly([0, -6, 6, 0, 0, 6, -6, 0]).fill(tint).stroke({ width: 1, color: 0x222222 })
      } else {
        g.circle(0, 0, 8).fill(tint).stroke({ width: 1, color: 0x12181f, alpha: 0.6 })
      }
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
    else if (ref.kind === 'item') tex = null
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

  private updateSelectionRing(eid: number, selected: boolean, ref: SpriteRef): void {
    const entry = this.entries.get(eid)
    if (!entry) return
    if (!selected || ref.kind === 'item') {
      if (entry.selectionRing) {
        entry.selectionRing.destroy()
        entry.selectionRing = null
      }
      return
    }
    if (!entry.selectionRing) {
      const ring = new Graphics()
      this.container.addChildAt(ring, 0) // below the sprite
      entry.selectionRing = ring
    }
    const r = ref.kind === 'structure' ? TILE_SIZE * 0.55 : TILE_SIZE * 0.45
    entry.selectionRing.clear()
    entry.selectionRing.circle(0, 0, r).stroke({ width: 2, color: 0xf0c674, alpha: 0.9 })
    entry.selectionRing.position.set(entry.display.position.x, entry.display.position.y)
  }

  private updateHpBar(sim: SimWorld, eid: number, ref: SpriteRef): void {
    const entry = this.entries.get(eid)
    if (!entry) return
    if (ref.kind === 'item' || ref.kind === 'structure' || !hasComponent(sim.ecs, Health, eid)) {
      if (entry.hpBar) {
        entry.hpBar.destroy()
        entry.hpBar = null
      }
      return
    }
    const hp = Health.hp[eid] ?? 0
    const maxHp = Health.maxHp[eid] ?? 1
    const hurt = hp < maxHp && hp > 0
    if (!hurt) {
      if (entry.hpBar) {
        entry.hpBar.destroy()
        entry.hpBar = null
      }
      return
    }
    if (!entry.hpBar) {
      const bar = new Graphics()
      this.container.addChild(bar)
      entry.hpBar = bar
    }
    const w = TILE_SIZE * 0.65
    const h = 3
    const pct = Math.max(0, Math.min(1, hp / Math.max(1, maxHp)))
    entry.hpBar.clear()
    entry.hpBar.rect(-w / 2, -TILE_SIZE * 0.55, w, h).fill({ color: 0x12181f, alpha: 0.75 })
    entry.hpBar.rect(-w / 2, -TILE_SIZE * 0.55, w * pct, h).fill(pct > 0.5 ? 0xa8d08d : pct > 0.25 ? 0xf0c674 : 0xe07a5f)
    entry.hpBar.position.set(entry.display.position.x, entry.display.position.y)
  }

  private disposeDecor(eid: number): void {
    const entry = this.entries.get(eid)
    if (!entry) return
    entry.selectionRing?.destroy()
    entry.hpBar?.destroy()
    entry.selectionRing = null
    entry.hpBar = null
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
