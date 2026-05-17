import { Application, Container, Graphics } from 'pixi.js'
import type { SimWorld } from '../Sim/world'
import { TilemapView } from './TilemapView'
import { EntityLayer } from './EntityLayer'
import { Camera } from './Camera'
import { TILE_SIZE } from '@/shared/constants'

export type TileClickHandler = (tx: number, ty: number, button: number, shiftKey: boolean) => void

export class Renderer {
  private app: Application
  private host: HTMLDivElement
  private viewport: Container
  private overlay: Graphics
  private tilemap: TilemapView | null = null
  private entities: EntityLayer | null = null
  private resizeObserver: ResizeObserver
  private camera: Camera | null = null
  private clickHandler: TileClickHandler | null = null
  private initialized = false

  constructor(host: HTMLDivElement) {
    this.host = host
    this.app = new Application()
    this.viewport = new Container()
    this.viewport.label = 'viewport'
    this.overlay = new Graphics()
    this.overlay.label = 'overlay'
    this.resizeObserver = new ResizeObserver(() => this.handleResize())
  }

  async init(): Promise<void> {
    if (this.initialized) return
    await this.app.init({
      background: 0x14191e,
      antialias: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      resizeTo: this.host,
      preference: 'webgl',
    })
    this.host.appendChild(this.app.canvas)
    this.app.stage.addChild(this.viewport)
    this.viewport.addChild(this.overlay)
    this.host.addEventListener('contextmenu', this.preventContext)
    this.host.addEventListener('click', this.onLeftClick)
    this.host.addEventListener('contextmenu', this.onRightClick)
    this.resizeObserver.observe(this.host)
    this.initialized = true
  }

  setClickHandler(handler: TileClickHandler | null): void {
    this.clickHandler = handler
  }

  attachWorld(sim: SimWorld): void {
    while (this.viewport.children.length > 0) {
      const c = this.viewport.children[0]!
      if (c === this.overlay) {
        this.viewport.removeChildAt(0)
        continue
      }
      this.viewport.removeChild(c)
    }
    this.tilemap = new TilemapView(sim)
    this.entities = new EntityLayer(sim)
    this.viewport.addChild(this.tilemap.container)
    this.viewport.addChild(this.entities.container)
    this.viewport.addChild(this.overlay)
    this.camera?.dispose()
    this.camera = new Camera(this.viewport, this.host)
    this.camera.centerOn((sim.map.width * TILE_SIZE) / 2, (sim.map.height * TILE_SIZE) / 2)
  }

  draw(sim: SimWorld): void {
    this.tilemap?.update(sim)
    this.entities?.update(sim)
    this.drawDesignations(sim)
  }

  dispose(): void {
    this.resizeObserver.disconnect()
    this.host.removeEventListener('contextmenu', this.preventContext)
    this.host.removeEventListener('click', this.onLeftClick)
    this.host.removeEventListener('contextmenu', this.onRightClick)
    this.camera?.dispose()
    this.camera = null
    this.tilemap = null
    this.entities = null
    if (this.initialized) {
      this.app.destroy(true, { children: true })
      this.initialized = false
    }
  }

  private preventContext = (e: Event): void => {
    e.preventDefault()
  }

  private onLeftClick = (e: MouseEvent): void => {
    if (e.button !== 0 || e.shiftKey) return
    this.dispatchTile(e, 0)
  }

  private onRightClick = (e: MouseEvent): void => {
    e.preventDefault()
    this.dispatchTile(e, 2)
  }

  private dispatchTile(e: MouseEvent, button: number): void {
    if (!this.camera || !this.clickHandler) return
    const rect = this.host.getBoundingClientRect()
    const w = this.camera.screenToWorld(e.clientX - rect.left, e.clientY - rect.top)
    const tx = Math.floor(w.x / TILE_SIZE)
    const ty = Math.floor(w.y / TILE_SIZE)
    this.clickHandler(tx, ty, button, e.shiftKey)
  }

  private drawDesignations(sim: SimWorld): void {
    const g = this.overlay
    g.clear()
    for (const d of sim.designations.values()) {
      const px = d.tx * TILE_SIZE
      const py = d.ty * TILE_SIZE
      const color = d.kind === 'chop' ? 0xe07a5f : 0xf0c674
      g.rect(px, py, TILE_SIZE, TILE_SIZE).stroke({ color, width: 2 })
    }
  }

  private handleResize(): void {
    if (!this.initialized) return
    this.app.renderer.resize(this.host.clientWidth, this.host.clientHeight)
  }
}
