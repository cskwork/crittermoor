import { Container, Graphics } from 'pixi.js'
import { TILE_SIZE } from '@/shared/constants'

export type VfxKind = 'chop' | 'mine' | 'build' | 'raid' | 'tame' | 'autosave'

interface Particle {
  g: Graphics
  vx: number
  vy: number
  life: number
  maxLife: number
  gravity: number
  rotSpeed: number
  scaleFrom: number
  scaleTo: number
}

const MAX_LIVE = 200

// VfxLayer is a thin display-only system. The simulation layer never sees it;
// gameplay code calls `spawn(kind, tx, ty)` to request a burst, and the layer
// owns particle decay + cleanup. Heavy effects are throttled when
// `prefers-reduced-motion` is set.
export class VfxLayer {
  readonly container: Container
  private particles: Particle[] = []
  private lastUpdateMs = performance.now()

  constructor() {
    this.container = new Container()
    this.container.label = 'vfx'
  }

  spawn(kind: VfxKind, tx: number, ty: number): void {
    if (this.reduced()) return
    const cx = tx * TILE_SIZE + TILE_SIZE / 2
    const cy = ty * TILE_SIZE + TILE_SIZE / 2
    switch (kind) {
      case 'chop': this.burst(cx, cy, 8, { color: 0x6da26a, life: 360, speed: 1.4, gravity: 0.04, shape: 'leaf' }); break
      case 'mine': this.burst(cx, cy, 10, { color: 0xb6bcc1, life: 320, speed: 1.6, gravity: 0.05, shape: 'shard' }); break
      case 'build': this.burst(cx, cy, 16, { color: 0xf0c674, life: 480, speed: 2.2, gravity: 0.02, shape: 'spark' }); break
      case 'raid': this.ring(cx, cy, 24, { color: 0xe07a5f, life: 600, speed: 2.6, shape: 'spark' }); break
      case 'tame': this.heart(cx, cy); break
      case 'autosave': this.ring(cx, cy, 14, { color: 0xa8d08d, life: 420, speed: 1.2, shape: 'spark' }); break
    }
    if (this.particles.length > MAX_LIVE) this.particles = this.particles.slice(-MAX_LIVE)
  }

  // Camera/host want a pixel offset so VFX renders in world space.
  draw(): void {
    const now = performance.now()
    const dt = Math.min(120, now - this.lastUpdateMs) // clamp big gaps (tab switch)
    this.lastUpdateMs = now
    const alive: Particle[] = []
    for (const p of this.particles) {
      p.life -= dt
      if (p.life <= 0) {
        p.g.destroy()
        continue
      }
      const t = 1 - p.life / p.maxLife
      p.g.position.x += p.vx
      p.g.position.y += p.vy
      p.vy += p.gravity
      p.g.rotation += p.rotSpeed
      p.g.scale.set(p.scaleFrom + (p.scaleTo - p.scaleFrom) * t)
      p.g.alpha = 1 - t
      alive.push(p)
    }
    this.particles = alive
  }

  dispose(): void {
    for (const p of this.particles) p.g.destroy()
    this.particles = []
    this.container.destroy({ children: true })
  }

  private burst(
    cx: number,
    cy: number,
    n: number,
    opts: { color: number; life: number; speed: number; gravity: number; shape: 'leaf' | 'shard' | 'spark' },
  ): void {
    for (let i = 0; i < n; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = opts.speed * (0.5 + Math.random())
      this.pushParticle(cx, cy, Math.cos(angle) * speed, Math.sin(angle) * speed * 0.8 - 0.6, opts.life, opts.gravity, opts.color, opts.shape)
    }
  }

  private ring(
    cx: number,
    cy: number,
    n: number,
    opts: { color: number; life: number; speed: number; shape: 'leaf' | 'shard' | 'spark' },
  ): void {
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2
      this.pushParticle(cx, cy, Math.cos(angle) * opts.speed, Math.sin(angle) * opts.speed, opts.life, 0, opts.color, opts.shape)
    }
  }

  private heart(cx: number, cy: number): void {
    // 3 small hearts drifting up.
    for (let i = 0; i < 3; i++) {
      const g = new Graphics()
      g.poly([0, -4, 4, -6, 6, -2, 0, 4, -6, -2, -4, -6]).fill(0xe07a5f).stroke({ width: 1, color: 0x6c2f23, alpha: 0.5 })
      g.position.set(cx + (i - 1) * 6, cy)
      g.rotation = (i - 1) * 0.2
      this.container.addChild(g)
      this.particles.push({
        g,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -1.2 - Math.random() * 0.4,
        life: 700,
        maxLife: 700,
        gravity: -0.005,
        rotSpeed: (Math.random() - 0.5) * 0.04,
        scaleFrom: 1.0,
        scaleTo: 0.6,
      })
    }
  }

  private pushParticle(
    cx: number,
    cy: number,
    vx: number,
    vy: number,
    life: number,
    gravity: number,
    color: number,
    shape: 'leaf' | 'shard' | 'spark',
  ): void {
    const g = new Graphics()
    if (shape === 'leaf') g.ellipse(0, 0, 3, 1.6).fill(color)
    else if (shape === 'shard') g.poly([-2, 0, 0, -3, 2, 0]).fill(color)
    else g.circle(0, 0, 1.6).fill(color)
    g.position.set(cx, cy)
    this.container.addChild(g)
    this.particles.push({
      g,
      vx,
      vy,
      life,
      maxLife: life,
      gravity,
      rotSpeed: (Math.random() - 0.5) * 0.18,
      scaleFrom: 0.9 + Math.random() * 0.3,
      scaleTo: 0.4,
    })
  }

  private reduced(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }
}
