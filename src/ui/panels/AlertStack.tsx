import { useEffect, useRef, useState } from 'react'
import { defineQuery, hasComponent } from 'bitecs'
import { Faction as FactionComp, Health, Needs, Pawn, TilePos } from '@/game/Sim/components'
import { Faction } from '@/shared/constants'
import { BREAK_FLAG } from '@/game/Sim/systems/mind'

// Right-side alert stack: surfaces urgent colony states distinct from the rolling
// event log, mirroring RimWorld's alert column (deep-research 2026-06-03).
// Clicking an alert centers the camera on the entity and selects it.

type Severity = 'critical' | 'high' | 'warning'

interface Alert {
  eid: number
  kind: string
  label: string
  severity: Severity
}

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, high: 1, warning: 2 }
const SEVERITY_COLOR: Record<Severity, string> = {
  critical: '#e07a5f',
  high: '#f0c674',
  warning: '#8fb3c9',
}

const MAX_ALERTS = 6
const POLL_MS = 250

const pawnQuery = defineQuery([Pawn, Needs, FactionComp, TilePos])

function collectAlerts(ecs: object): Alert[] {
  const out: Alert[] = []
  const eids = pawnQuery(ecs)
  for (let i = 0; i < eids.length; i++) {
    const eid = eids[i]!
    if (FactionComp.id[eid] !== Faction.Player) continue
    const broken = ((Pawn.flags[eid] ?? 0) & BREAK_FLAG) !== 0
    const mood = Pawn.mood[eid] ?? 0
    const food = Needs.food[eid] ?? 100
    const rest = Needs.rest[eid] ?? 100
    const downed = hasComponent(ecs, Health, eid) && (Health.downed[eid] ?? 0) > 0
    const name = `Warden #${eid}`
    if (downed) out.push({ eid, kind: 'downed', label: `${name} is downed`, severity: 'critical' })
    if (broken) out.push({ eid, kind: 'break', label: `${name} is having a mental break`, severity: 'critical' })
    else if (mood <= -25) out.push({ eid, kind: 'stress', label: `${name} is stressed (mood ${mood})`, severity: 'warning' })
    if (food <= 15) out.push({ eid, kind: 'food', label: `${name} is starving`, severity: 'critical' })
    if (rest <= 12) out.push({ eid, kind: 'rest', label: `${name} is exhausted`, severity: 'high' })
  }
  out.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
  return out.slice(0, MAX_ALERTS)
}

export function AlertStack() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const sigRef = useRef('')

  useEffect(() => {
    let timer = 0
    function poll() {
      const sim = (window as unknown as { __crittermoorGame?: { sim?: { ecs: object } } }).__crittermoorGame?.sim
      if (sim) {
        const next = collectAlerts(sim.ecs)
        const sig = next.map((a) => `${a.eid}:${a.kind}`).join('|')
        if (sig !== sigRef.current) {
          sigRef.current = sig
          setAlerts(next)
        }
      }
      timer = window.setTimeout(poll, POLL_MS)
    }
    poll()
    return () => window.clearTimeout(timer)
  }, [])

  if (alerts.length === 0) return null

  function focus(eid: number): void {
    const w = window as unknown as { __crittermoorFocus?: (eid: number) => void }
    w.__crittermoorFocus?.(eid)
  }

  return (
    <div className="alert-stack" role="region" aria-label="Colony alerts">
      {alerts.map((a) => (
        <button
          key={`${a.eid}:${a.kind}`}
          className="alert"
          style={{ borderLeftColor: SEVERITY_COLOR[a.severity] }}
          onClick={() => focus(a.eid)}
          title="Jump to warden"
        >
          {a.label}
        </button>
      ))}
      <style>{`
        .alert-stack { position:absolute; top:64px; right:8px; display:flex; flex-direction:column; gap:6px; pointer-events:auto; max-width:240px; z-index:5; }
        .alert { text-align:left; padding:6px 10px; font-size:11px; color:var(--text); background:rgba(13,17,21,0.92); border:1px solid #1e2630; border-left-width:4px; border-radius:4px; cursor:pointer; }
        .alert:hover { background:rgba(30,38,48,0.95); }
      `}</style>
    </div>
  )
}
