import type { Container } from 'pixi.js'

export interface CameraOptions {
  minZoom?: number
  maxZoom?: number
  zoomStep?: number
}

export class Camera {
  zoom = 1
  private dragging = false
  private dragStartX = 0
  private dragStartY = 0
  private viewportStartX = 0
  private viewportStartY = 0
  // Touch gesture state: single-finger pans, two fingers pinch-zoom. Coords are host-relative.
  private touches = new Map<number, { x: number; y: number }>()
  private touchPanning = false
  private pinchLastDist = 0
  private pinchLastMidX = 0
  private pinchLastMidY = 0
  private readonly minZoom: number
  private readonly maxZoom: number
  private readonly zoomStep: number

  constructor(private viewport: Container, private host: HTMLElement, opts: CameraOptions = {}) {
    this.minZoom = opts.minZoom ?? 0.5
    this.maxZoom = opts.maxZoom ?? 3
    this.zoomStep = opts.zoomStep ?? 1.15
    this.bind()
  }

  dispose(): void {
    this.host.removeEventListener('pointerdown', this.onDown)
    this.host.removeEventListener('pointermove', this.onMove)
    this.host.removeEventListener('pointerup', this.onUp)
    this.host.removeEventListener('pointercancel', this.onUp)
    this.host.removeEventListener('wheel', this.onWheel)
    this.touches.clear()
  }

  centerOn(x: number, y: number): void {
    this.viewport.position.set(
      this.host.clientWidth / 2 - x * this.zoom,
      this.host.clientHeight / 2 - y * this.zoom,
    )
    this.viewport.scale.set(this.zoom)
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - this.viewport.position.x) / this.zoom,
      y: (sy - this.viewport.position.y) / this.zoom,
    }
  }

  private bind(): void {
    this.host.addEventListener('pointerdown', this.onDown)
    this.host.addEventListener('pointermove', this.onMove)
    this.host.addEventListener('pointerup', this.onUp)
    this.host.addEventListener('pointercancel', this.onUp)
    this.host.addEventListener('wheel', this.onWheel, { passive: false })
  }

  private onDown = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') {
      this.onTouchDown(e)
      return
    }
    // Mouse/pen: middle, right, or shift+left drags. Plain left-click stays for tile selection.
    if (e.button !== 1 && e.button !== 2 && !(e.button === 0 && e.shiftKey)) return
    this.dragging = true
    this.dragStartX = e.clientX
    this.dragStartY = e.clientY
    this.viewportStartX = this.viewport.position.x
    this.viewportStartY = this.viewport.position.y
    this.host.setPointerCapture(e.pointerId)
  }

  private onMove = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') {
      this.onTouchMove(e)
      return
    }
    if (!this.dragging) return
    this.viewport.position.set(
      this.viewportStartX + (e.clientX - this.dragStartX),
      this.viewportStartY + (e.clientY - this.dragStartY),
    )
  }

  private onUp = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') {
      this.onTouchUp(e)
      return
    }
    if (!this.dragging) return
    this.dragging = false
    if (this.host.hasPointerCapture(e.pointerId)) this.host.releasePointerCapture(e.pointerId)
  }

  private relative(e: PointerEvent): { x: number; y: number } {
    const rect = this.host.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  private onTouchDown(e: PointerEvent): void {
    this.touches.set(e.pointerId, this.relative(e))
    this.host.setPointerCapture(e.pointerId)
    if (this.touches.size === 1) {
      this.beginTouchPan(e.clientX, e.clientY)
    } else if (this.touches.size === 2) {
      this.touchPanning = false
      this.pinchLastDist = 0 // first pinch move initializes the baseline
    }
  }

  private onTouchMove(e: PointerEvent): void {
    if (!this.touches.has(e.pointerId)) return
    this.touches.set(e.pointerId, this.relative(e))
    if (this.touches.size === 1 && this.touchPanning) {
      this.viewport.position.set(
        this.viewportStartX + (e.clientX - this.dragStartX),
        this.viewportStartY + (e.clientY - this.dragStartY),
      )
    } else if (this.touches.size >= 2) {
      this.updatePinch()
    }
  }

  private onTouchUp(e: PointerEvent): void {
    if (!this.touches.has(e.pointerId)) return
    this.touches.delete(e.pointerId)
    if (this.host.hasPointerCapture(e.pointerId)) this.host.releasePointerCapture(e.pointerId)
    if (this.touches.size < 2) this.pinchLastDist = 0
    if (this.touches.size === 1) {
      // One finger left after a pinch: resume panning from its current position.
      const rect = this.host.getBoundingClientRect()
      const [p] = [...this.touches.values()]
      this.beginTouchPan(p!.x + rect.left, p!.y + rect.top)
    } else if (this.touches.size === 0) {
      this.touchPanning = false
    }
  }

  private beginTouchPan(clientX: number, clientY: number): void {
    this.touchPanning = true
    this.dragStartX = clientX
    this.dragStartY = clientY
    this.viewportStartX = this.viewport.position.x
    this.viewportStartY = this.viewport.position.y
  }

  private updatePinch(): void {
    const [a, b] = [...this.touches.values()]
    if (!a || !b) return
    const dist = Math.hypot(a.x - b.x, a.y - b.y)
    const midX = (a.x + b.x) / 2
    const midY = (a.y + b.y) / 2
    if (this.pinchLastDist === 0) {
      this.pinchLastDist = dist
      this.pinchLastMidX = midX
      this.pinchLastMidY = midY
      return
    }
    const factor = dist / this.pinchLastDist
    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * factor))
    // Anchor the world point under the midpoint, then translate by the midpoint delta (two-finger pan).
    const wx = (midX - this.viewport.position.x) / this.zoom
    const wy = (midY - this.viewport.position.y) / this.zoom
    this.zoom = newZoom
    this.viewport.scale.set(this.zoom)
    this.viewport.position.set(
      midX - wx * this.zoom + (midX - this.pinchLastMidX),
      midY - wy * this.zoom + (midY - this.pinchLastMidY),
    )
    this.pinchLastDist = dist
    this.pinchLastMidX = midX
    this.pinchLastMidY = midY
  }

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? this.zoomStep : 1 / this.zoomStep
    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * factor))
    if (newZoom === this.zoom) return
    const rect = this.host.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const wx = (px - this.viewport.position.x) / this.zoom
    const wy = (py - this.viewport.position.y) / this.zoom
    this.zoom = newZoom
    this.viewport.scale.set(this.zoom)
    this.viewport.position.set(px - wx * this.zoom, py - wy * this.zoom)
  }
}
