import { MAX_CATCHUP_TICKS, MS_PER_TICK_1X } from '@/shared/constants'
import { useUiStore } from '@/app/stores/uiStore'
import type { SimWorld } from './world'

export type DrawFn = () => void
export type TickFn = (sim: SimWorld) => void

export class TickScheduler {
  private running = false
  private accum = 0
  private lastTime = 0
  private rafId = 0

  constructor(private sim: SimWorld, private draw: DrawFn, private tick: TickFn) {}

  start(): void {
    if (this.running) return
    this.running = true
    this.lastTime = performance.now()
    this.tickLoop()
  }

  stop(): void {
    this.running = false
    cancelAnimationFrame(this.rafId)
  }

  private tickLoop = (): void => {
    if (!this.running) return
    const now = performance.now()
    const dt = now - this.lastTime
    this.lastTime = now
    const speed = useUiStore.getState().speed
    if (speed > 0) {
      this.accum += dt * speed
      let ticks = 0
      while (this.accum >= MS_PER_TICK_1X && ticks < MAX_CATCHUP_TICKS) {
        this.tick(this.sim)
        this.accum -= MS_PER_TICK_1X
        ticks++
      }
      if (ticks >= MAX_CATCHUP_TICKS) this.accum = 0
    } else {
      this.accum = 0
    }
    this.draw()
    this.rafId = requestAnimationFrame(this.tickLoop)
  }
}
