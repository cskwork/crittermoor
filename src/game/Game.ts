import { Renderer } from './Renderer/Renderer'
import { SimWorld, createSimWorld, destroyWorld } from './Sim/world'
import { TickScheduler } from './Sim/TickScheduler'
import { useUiStore } from '@/app/stores/uiStore'
import { useBattleStore } from '@/app/stores/battleStore'
import { generateWorld } from './Sim/Gen/worldGen'
import { createPathClient, type PathClient } from './Sim/Pathing/PathClient'
import { defineQuery } from 'bitecs'
import { Faction as FactionComp, Position, TilePos } from './Sim/components'
import { Faction, Terrain } from '@/shared/constants'
import { makeRunTick } from './Sim/tick'
import { createBattleState, type BattleAction, type BattleCritter, type Side } from './Sim/Battle/BattleState'
import { executeTurn, isBattleOver } from './Sim/Battle/BattleSim'
import { teamFromSpecies } from './Sim/Battle/buildTeam'
import { tryTame } from './Sim/Critters/tame'

const playerQuery = defineQuery([FactionComp, TilePos, Position])
const entityAtTileQuery = defineQuery([TilePos])

export class Game {
  private renderer: Renderer
  private scheduler: TickScheduler | null = null
  private sim: SimWorld | null = null
  private pathClient: PathClient | null = null
  private booted = false
  private pendingActions: [BattleAction | null, BattleAction | null] = [null, null]

  constructor(host: HTMLDivElement) {
    this.renderer = new Renderer(host)
  }

  async boot(): Promise<void> {
    if (this.booted) return
    await this.renderer.init()
    this.booted = true
  }

  newGame(seed: number): void {
    if (!this.booted) throw new Error('Game.boot() must complete before newGame()')
    this.dispose(false)
    const sim = createSimWorld(seed)
    generateWorld(sim)
    this.sim = sim
    this.pathClient = createPathClient()
    this.renderer.attachWorld(sim)
    this.renderer.setClickHandler((tx, ty, button, shift) => this.handleTileClick(tx, ty, button, shift))
    const tick = makeRunTick({
      jobs: {
        requestPath: (eid, fromX, fromY, toX, toY) => this.requestPath(eid, fromX, fromY, toX, toY),
      },
      raid: {
        onRaid: (raidSpeciesIds) => this.triggerRaid(raidSpeciesIds),
      },
    })
    this.scheduler = new TickScheduler(sim, () => this.renderer.draw(sim), tick)
    this.scheduler.start()
    useUiStore.setState({ screen: 'colony' })

    // expose for HUD save/load buttons without a global store dep
    const w = window as unknown as {
      __crittermoorGame: { sim: SimWorld }
      __crittermoorApplyLoad: (loaded: SimWorld) => void
    }
    w.__crittermoorGame = { sim }
    w.__crittermoorApplyLoad = (loaded) => this.applyLoaded(loaded)
    ;(window as unknown as { __crittermoorTestBattle: () => void }).__crittermoorTestBattle = () =>
      this.startTestBattle()

    // Hook battle store action handlers.
    useBattleStore.getState().setHandlers(
      (side, action) => this.recordBattleAction(side, action),
      (winner) => this.endBattle(winner),
    )
  }

  startTestBattle(): void {
    if (!this.sim) return
    const playerTeam = teamFromSpecies([2, 1], 8, this.sim.rng) // Tindercub + Spritmoth
    const enemyTeam = teamFromSpecies([4, 6], 7, this.sim.rng) // Brackboar + Mosskit
    this.startBattle(playerTeam, enemyTeam)
  }

  private triggerRaid(raidSpeciesIds: number[]): void {
    if (!this.sim) return
    const playerTeam = teamFromSpecies([2, 1, 6], 6, this.sim.rng) // starter team
    const enemyTeam = teamFromSpecies(raidSpeciesIds, 5, this.sim.rng)
    if (enemyTeam.length === 0) return
    this.startBattle(playerTeam, enemyTeam)
  }

  startBattle(playerTeam: BattleCritter[], enemyTeam: BattleCritter[]): void {
    if (!this.sim) return
    if (playerTeam.length === 0 || enemyTeam.length === 0) return
    const state = createBattleState(playerTeam, enemyTeam, this.sim.rng)
    this.pendingActions = [null, null]
    useBattleStore.getState().setState(state)
    useUiStore.setState({ screen: 'battle', speed: 0 })
    if (this.scheduler) this.scheduler.stop()
  }

  private recordBattleAction(side: Side, action: BattleAction): void {
    this.pendingActions[side] = action
    if (this.pendingActions[0] && this.pendingActions[1]) {
      const cur = useBattleStore.getState().state
      if (!cur) return
      const next = executeTurn(cur, [this.pendingActions[0]!, this.pendingActions[1]!])
      this.pendingActions = [null, null]
      useBattleStore.getState().setState(next)
    }
  }

  private endBattle(winner: Side | null): void {
    if (!this.sim) return
    const cur = useBattleStore.getState().state
    if (cur) {
      const result = isBattleOver(cur)
      if (!result.over && winner === null) {
        // forfeit / forced end
      }
      this.sim.events.push(`Battle ended — ${winner === 0 ? 'victory' : winner === 1 ? 'defeat' : 'draw'}.`)
    }
    useBattleStore.getState().setState(null)
    useUiStore.setState({ screen: 'colony', speed: 1 })
    if (this.scheduler) this.scheduler.start()
  }

  private applyLoaded(loaded: SimWorld): void {
    this.scheduler?.stop()
    this.pathClient?.dispose()
    if (this.sim) destroyWorld(this.sim)
    this.sim = loaded
    this.pathClient = createPathClient()
    this.renderer.attachWorld(loaded)
    const tick = makeRunTick({
      jobs: { requestPath: (eid, fx, fy, tx2, ty2) => this.requestPath(eid, fx, fy, tx2, ty2) },
      raid: { onRaid: (ids) => this.triggerRaid(ids) },
    })
    this.scheduler = new TickScheduler(loaded, () => this.renderer.draw(loaded), tick)
    this.scheduler.start()
    const w = window as unknown as { __crittermoorGame: { sim: SimWorld } }
    w.__crittermoorGame = { sim: loaded }
  }

  dispose(disposeRenderer = true): void {
    this.scheduler?.stop()
    this.scheduler = null
    this.pathClient?.dispose()
    this.pathClient = null
    if (this.sim) {
      destroyWorld(this.sim)
      this.sim = null
    }
    if (disposeRenderer) {
      this.renderer.setClickHandler(null)
      this.renderer.dispose()
    }
  }

  private handleTileClick(tx: number, ty: number, button: number, shift: boolean): void {
    const sim = this.sim
    const client = this.pathClient
    if (!sim || !client) return
    if (tx < 0 || ty < 0 || tx >= sim.map.width || ty >= sim.map.height) return

    if (button === 2) {
      // Right-click always moves the player wardens.
      const eids = playerQuery(sim.ecs)
      for (let i = 0; i < eids.length; i++) {
        const eid = eids[i]!
        if (FactionComp.id[eid] !== Faction.Player) continue
        this.requestPath(eid, TilePos.tx[eid]!, TilePos.ty[eid]!, tx, ty)
      }
      return
    }

    // Left-click branches on the active tool mode.
    const mode = useUiStore.getState().toolMode
    // Shift+left-click is a quick-tame shortcut regardless of mode.
    if (shift) {
      this.tryTameAt(sim, tx, ty)
      return
    }
    switch (mode) {
      case 'select':
        this.selectAt(sim, tx, ty)
        break
      case 'chop':
        this.designateAt(sim, tx, ty, 'chop')
        break
      case 'mine':
        this.designateAt(sim, tx, ty, 'mine')
        break
      case 'tame':
        this.tryTameAt(sim, tx, ty)
        break
      case 'cancel':
        this.cancelDesignationAt(sim, tx, ty)
        break
    }
  }

  private selectAt(sim: SimWorld, tx: number, ty: number): void {
    const eids = entityAtTileQuery(sim.ecs)
    for (let i = 0; i < eids.length; i++) {
      const eid = eids[i]!
      if (TilePos.tx[eid] === tx && TilePos.ty[eid] === ty) {
        useUiStore.getState().setSelected(eid)
        return
      }
    }
    useUiStore.getState().setSelected(null)
  }

  private designateAt(sim: SimWorld, tx: number, ty: number, kind: 'chop' | 'mine'): void {
    const key = ty * sim.map.width + tx
    const terrain = sim.map.terrain[key]
    if (kind === 'chop' && terrain !== Terrain.Forest) {
      sim.events.push(`Chop needs a forest tile.`)
      return
    }
    if (kind === 'mine' && terrain !== Terrain.Stone && terrain !== Terrain.Mountain) {
      sim.events.push(`Mine needs a stone or mountain tile.`)
      return
    }
    sim.designations.set(key, { kind, tx, ty })
  }

  private cancelDesignationAt(sim: SimWorld, tx: number, ty: number): void {
    const key = ty * sim.map.width + tx
    if (sim.designations.delete(key)) sim.events.push(`Cancelled designation at (${tx},${ty}).`)
  }

  private requestPath(eid: number, fromX: number, fromY: number, toX: number, toY: number): void {
    const sim = this.sim
    const client = this.pathClient
    if (!sim || !client) return
    void client
      .request({
        width: sim.map.width,
        height: sim.map.height,
        cost: sim.map.cost,
        fromX,
        fromY,
        toX,
        toY,
      })
      .then((nodes) => {
        if (nodes && this.sim === sim) {
          sim.paths.set(eid, nodes)
        }
      })
      .catch(() => undefined)
  }

  private tryTameAt(sim: SimWorld, tx: number, ty: number): void {
    // Use the player warden closest to the click as the taming attempt origin.
    const eids = playerQuery(sim.ecs)
    if (eids.length === 0) return
    let bestEid = eids[0]!
    let bestDist = Infinity
    for (let i = 0; i < eids.length; i++) {
      const eid = eids[i]!
      if (FactionComp.id[eid] !== Faction.Player) continue
      const dx = TilePos.tx[eid]! - tx
      const dy = TilePos.ty[eid]! - ty
      const d = dx * dx + dy * dy
      if (d < bestDist) { bestDist = d; bestEid = eid }
    }
    const res = tryTame(sim, bestEid, tx, ty)
    if (res.reason === 'no_target') sim.events.push(`No wild critter at (${tx},${ty}).`)
    else if (res.reason === 'too_far') sim.events.push(`Move a warden closer to tame.`)
    else if (res.reason === 'not_weakened') sim.events.push(`Weaken the critter in battle first.`)
    else if (res.reason === 'roll_failed') sim.events.push(`Tame attempt failed — try again.`)
  }

}
