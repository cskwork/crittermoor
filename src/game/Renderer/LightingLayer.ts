import { Container, Graphics } from 'pixi.js'
import { defineQuery, hasComponent } from 'bitecs'
import { TILE_SIZE } from '@/shared/constants'
import type { SimWorld } from '../Sim/world'
import { Structure, TilePos } from '../Sim/components'
import { StructureKind } from '../Sim/Structures/defs'
import { phaseOf } from '../Sim/systems/time'

const structQuery = defineQuery([Structure, TilePos])

// LightingLayer renders warm pools at night around heat-producing structures
// (stove + turret). Implementation is intentionally cheap: a single Graphics
// per light source, redrawn only when the phase or structure set changes.
export class LightingLayer {
  readonly container: Container
  private lightsByEid = new Map<number, Graphics>()
  private lastPhase: string = 'day'
  private lastStructureHash = 0

  constructor() {
    this.container = new Container()
    this.container.label = 'lighting'
    this.container.eventMode = 'none'
  }

  update(sim: SimWorld): void {
    const phase = phaseOf(sim)
    const wantLights = phase === 'night' || phase === 'dusk'
    if (!wantLights) {
      this.clear()
      this.lastPhase = phase
      return
    }
    const hash = hashStructures(sim)
    if (phase === this.lastPhase && hash === this.lastStructureHash && this.lightsByEid.size > 0) return
    this.lastPhase = phase
    this.lastStructureHash = hash
    this.repaint(sim, phase)
  }

  dispose(): void {
    for (const g of this.lightsByEid.values()) g.destroy()
    this.lightsByEid.clear()
    this.container.destroy({ children: true })
  }

  private repaint(sim: SimWorld, phase: string): void {
    this.clear()
    const eids = structQuery(sim.ecs)
    const alpha = phase === 'night' ? 0.42 : 0.22
    for (let i = 0; i < eids.length; i++) {
      const eid = eids[i]!
      if (!hasComponent(sim.ecs, Structure, eid)) continue
      if (Structure.state[eid] !== 1) continue
      const kind = Structure.kind[eid] as StructureKind
      if (kind !== StructureKind.Stove && kind !== StructureKind.Turret) continue
      const tx = TilePos.tx[eid] ?? 0
      const ty = TilePos.ty[eid] ?? 0
      const cx = tx * TILE_SIZE + TILE_SIZE / 2
      const cy = ty * TILE_SIZE + TILE_SIZE / 2
      const radius = kind === StructureKind.Stove ? TILE_SIZE * 2.8 : TILE_SIZE * 2.2
      const color = kind === StructureKind.Stove ? 0xf5b56b : 0xe07a5f
      const g = new Graphics()
      // Concentric rings approximate a soft falloff cheaply without shaders.
      g.circle(0, 0, radius).fill({ color, alpha: alpha * 0.25 })
      g.circle(0, 0, radius * 0.66).fill({ color, alpha: alpha * 0.45 })
      g.circle(0, 0, radius * 0.32).fill({ color, alpha: alpha * 0.7 })
      g.position.set(cx, cy)
      g.blendMode = 'screen'
      this.container.addChild(g)
      this.lightsByEid.set(eid, g)
    }
  }

  private clear(): void {
    for (const g of this.lightsByEid.values()) g.destroy()
    this.lightsByEid.clear()
  }
}

function hashStructures(sim: SimWorld): number {
  let h = 2166136261 >>> 0
  const eids = structQuery(sim.ecs)
  for (let i = 0; i < eids.length; i++) {
    const eid = eids[i]!
    if (!hasComponent(sim.ecs, Structure, eid)) continue
    h ^= eid
    h = Math.imul(h, 16777619)
    h ^= (Structure.kind[eid] ?? 0) | ((Structure.state[eid] ?? 0) << 8)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
