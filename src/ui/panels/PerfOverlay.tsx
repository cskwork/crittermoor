import { useEffect, useState } from 'react'
import type { SimWorld } from '@/game/Sim/world'

interface PerfSample {
  fps: number
  entityCount: number
  pawnCount: number
  itemCount: number
  structureCount: number
  tick: number
}

function countEntities(sim: SimWorld | undefined): Pick<PerfSample, 'entityCount' | 'pawnCount' | 'itemCount' | 'structureCount'> {
  if (!sim) return { entityCount: 0, pawnCount: 0, itemCount: 0, structureCount: 0 }
  const ecsRaw = sim.ecs as unknown as { _entities?: Set<number>; entityArray?: number[] }
  const setEntities = ecsRaw._entities
  const arrEntities = ecsRaw.entityArray
  const total = setEntities?.size ?? arrEntities?.length ?? 0
  // Component-aware counts via SimWorld side-maps where available.
  const pawnCount = sim.agency?.priorities.size ?? 0
  const itemCount = sim.stockpiles?.size ?? 0
  const structureCount = sim.blueprints?.size ?? 0
  return { entityCount: total, pawnCount, itemCount, structureCount }
}

export function PerfOverlay() {
  const [sample, setSample] = useState<PerfSample>({
    fps: 0,
    entityCount: 0,
    pawnCount: 0,
    itemCount: 0,
    structureCount: 0,
    tick: 0,
  })

  useEffect(() => {
    if (!import.meta.env.DEV) return
    let raf = 0
    let last = performance.now()
    let frames = 0
    function step() {
      frames++
      const now = performance.now()
      if (now - last >= 500) {
        const fps = Math.round((frames * 1000) / (now - last))
        frames = 0
        last = now
        const sim = (window as unknown as { __crittermoorGame?: { sim?: SimWorld } }).__crittermoorGame?.sim
        const counts = countEntities(sim)
        setSample({ fps, ...counts, tick: sim?.tick ?? 0 })
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [])

  if (!import.meta.env.DEV) return null

  return (
    <div className="perf-overlay panel" aria-label="Performance overlay (DEV)">
      <div>FPS: <strong>{sample.fps}</strong></div>
      <div>Tick: {sample.tick}</div>
      <div>Entities: {sample.entityCount}</div>
      <div>Pawns (tracked): {sample.pawnCount}</div>
      <div>Stockpile tiles: {sample.itemCount}</div>
      <div>Blueprints: {sample.structureCount}</div>
      <style>{`
        .perf-overlay { position:absolute; bottom:14px; right:14px; pointer-events:auto; padding:8px 12px;
          font-size:11px; color:var(--text-dim); line-height:1.5; opacity:0.85; z-index:55; }
        .perf-overlay strong { color: var(--accent); }
      `}</style>
    </div>
  )
}
