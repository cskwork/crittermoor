import { useEffect, useState } from 'react'
import { useUiStore } from '@/app/stores/uiStore'
import {
  HOURS_PER_DAY,
  MAX_PRIORITY,
  ScheduleSlot,
  WORK_KINDS,
  getPriorities,
  getSchedule,
  isDrafted,
  setDrafted,
  setPriority,
  setSlot,
  type WorkKind,
} from '@/game/Sim/agency'
import type { SimWorld } from '@/game/Sim/world'

interface WardenRow {
  eid: number
  label: string
}

const SLOT_LABEL: Record<ScheduleSlot, string> = {
  [ScheduleSlot.Anything]: '·',
  [ScheduleSlot.Work]: 'W',
  [ScheduleSlot.Joy]: 'J',
  [ScheduleSlot.Sleep]: 'Z',
}

const SLOT_COLOR: Record<ScheduleSlot, string> = {
  [ScheduleSlot.Anything]: 'rgba(255,255,255,0.06)',
  [ScheduleSlot.Work]: 'rgba(168,208,141,0.35)',
  [ScheduleSlot.Joy]: 'rgba(240,198,116,0.32)',
  [ScheduleSlot.Sleep]: 'rgba(108,140,200,0.32)',
}

function readWardens(): WardenRow[] {
  const sim = (window as unknown as { __crittermoorGame?: { sim?: SimWorld } }).__crittermoorGame?.sim
  if (!sim) return []
  const out: WardenRow[] = []
  // Wardens are the player-faction pawns. Read from sim.agency seed by iterating ECS.
  // Avoid pulling a query helper into a render hot-path: walk priorities map (created lazily) plus all known eids.
  const seen = new Set<number>()
  for (const eid of sim.agency.priorities.keys()) {
    out.push({ eid, label: `Warden #${eid}` })
    seen.add(eid)
  }
  // Also surface any player warden that has not yet been touched. We learn about them
  // via the existing selection mechanism: peek the world's render targets indirectly
  // by iterating the structures-of-interest. For an MVP, fall through and let the
  // user opt-in by selecting a warden first.
  return out
}

export function PrioritiesPanel() {
  const show = useUiStore((s) => s.showPriorities)
  const setShowPriorities = useUiStore((s) => s.setShowPriorities)
  const [wardens, setWardens] = useState<WardenRow[]>([])
  const [, forceTick] = useState(0)

  useEffect(() => {
    if (!show) return
    // Seed priorities on open: lazy-init through getPriorities so the table has rows.
    const sim = (window as unknown as { __crittermoorGame?: { sim?: SimWorld } }).__crittermoorGame?.sim
    if (sim) {
      // Iterate ECS player wardens by reading the global cached query — we exposed wardens via Game; here we use a fallback by reading positions and skipping if no Pawn data.
      const win = window as unknown as { __crittermoorPlayerEids?: () => number[] }
      const ids = win.__crittermoorPlayerEids ? win.__crittermoorPlayerEids() : []
      for (const eid of ids) {
        getPriorities(sim.agency, eid)
        getSchedule(sim.agency, eid)
      }
    }
    setWardens(readWardens())
  }, [show])

  if (!show) return null

  function bump(): void {
    forceTick((n) => n + 1)
  }

  function changePriority(eid: number, kind: WorkKind, value: number) {
    const sim = (window as unknown as { __crittermoorGame?: { sim?: SimWorld } }).__crittermoorGame?.sim
    if (!sim) return
    setPriority(sim.agency, eid, kind, value)
    bump()
  }

  function cycleSlot(eid: number, hour: number) {
    const sim = (window as unknown as { __crittermoorGame?: { sim?: SimWorld } }).__crittermoorGame?.sim
    if (!sim) return
    const cur = getSchedule(sim.agency, eid)[hour] as ScheduleSlot
    const next = ((cur + 1) % 4) as ScheduleSlot
    setSlot(sim.agency, eid, hour, next)
    bump()
  }

  function toggleDraft(eid: number) {
    const sim = (window as unknown as { __crittermoorGame?: { sim?: SimWorld } }).__crittermoorGame?.sim
    if (!sim) return
    setDrafted(sim.agency, eid, !isDrafted(sim.agency, eid))
    bump()
  }

  const sim = (window as unknown as { __crittermoorGame?: { sim?: SimWorld } }).__crittermoorGame?.sim

  return (
    <div className="prio-root panel" role="dialog" aria-label="Priorities and schedule">
      <div className="prio-head">
        <h3>Priorities & Schedule</h3>
        <button onClick={() => setShowPriorities(false)} aria-label="Close">×</button>
      </div>
      {wardens.length === 0 && (
        <p className="empty">Open a colony first; the wardens will appear here. (Hint: press <kbd>S</kbd>, then click a warden once.)</p>
      )}
      {wardens.length > 0 && sim && (
        <>
          <table className="prio-table" aria-label="Work priorities">
            <thead>
              <tr>
                <th>Warden</th>
                {WORK_KINDS.map((k) => (
                  <th key={k}>{k}</th>
                ))}
                <th>Draft</th>
              </tr>
            </thead>
            <tbody>
              {wardens.map((w) => {
                const pri = getPriorities(sim.agency, w.eid)
                const drafted = isDrafted(sim.agency, w.eid)
                return (
                  <tr key={w.eid}>
                    <td>{w.label}</td>
                    {WORK_KINDS.map((k) => (
                      <td key={k}>
                        <select
                          value={pri[k]}
                          onChange={(e) => changePriority(w.eid, k, Number(e.target.value))}
                          aria-label={`${w.label} ${k} priority`}
                        >
                          {Array.from({ length: MAX_PRIORITY + 1 }, (_, i) => (
                            <option key={i} value={i}>
                              {i === 0 ? 'off' : i}
                            </option>
                          ))}
                        </select>
                      </td>
                    ))}
                    <td>
                      <button onClick={() => toggleDraft(w.eid)} className={drafted ? 'drafted' : ''}>
                        {drafted ? 'Drafted' : 'Free'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <h4>Schedule (24h)</h4>
          <div className="prio-schedules">
            {wardens.map((w) => {
              const sched = getSchedule(sim.agency, w.eid)
              return (
                <div key={w.eid} className="prio-sched-row">
                  <div className="prio-sched-label">{w.label}</div>
                  <div className="prio-sched-grid">
                    {Array.from({ length: HOURS_PER_DAY }, (_, h) => {
                      const slot = sched[h] as ScheduleSlot
                      return (
                        <button
                          key={h}
                          className="prio-sched-cell"
                          style={{ background: SLOT_COLOR[slot] }}
                          onClick={() => cycleSlot(w.eid, h)}
                          title={`${String(h).padStart(2, '0')}:00 · ${ScheduleSlot[slot]}`}
                        >
                          {SLOT_LABEL[slot]}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
          <p className="legend">
            Tap a cell to cycle Anything · Work · Joy · Sleep. Click <strong>Draft</strong> to take direct control; right-click moves drafted wardens only.
          </p>
        </>
      )}

      <style>{`
        .prio-root { pointer-events:auto; position:absolute; top:80px; right:14px; padding:14px; min-width:420px; max-width:640px; max-height:80vh; overflow:auto; z-index:50; }
        .prio-head { display:flex; justify-content:space-between; align-items:center; gap:10px; }
        .prio-head h3 { margin:0; color:var(--accent); }
        .prio-table { width:100%; border-collapse:collapse; margin-top:10px; }
        .prio-table th, .prio-table td { padding:4px 6px; font-size:12px; text-align:left; }
        .prio-table th { color:var(--text-dim); text-transform:capitalize; border-bottom:1px solid var(--panel-border); }
        .prio-table tr td:first-child { color:var(--text); }
        .prio-table select { background:#0d1115; color:var(--text); border:1px solid var(--panel-border); border-radius:4px; padding:2px 4px; font:inherit; }
        .prio-table button.drafted { border-color:var(--danger, #e07a5f); color:var(--danger, #e07a5f); }
        .prio-schedules { display:flex; flex-direction:column; gap:6px; margin-top:6px; }
        .prio-sched-row { display:flex; align-items:center; gap:6px; }
        .prio-sched-label { min-width:90px; font-size:12px; color:var(--text-dim); }
        .prio-sched-grid { display:grid; grid-template-columns: repeat(24, 1fr); gap:2px; flex:1; }
        .prio-sched-cell { padding:0; min-width:0; width:100%; aspect-ratio:1; font-size:9px; text-align:center; border-radius:3px; border:1px solid var(--panel-border); cursor:pointer; }
        .prio-sched-cell:hover { border-color:var(--accent); }
        .empty { color:var(--text-dim); font-size:12px; }
        .legend { color:var(--text-dim); font-size:11px; margin-top:8px; line-height:1.5; }
        h4 { margin:16px 0 8px; color:var(--accent); font-size:13px; letter-spacing:0.04em; }
      `}</style>
    </div>
  )
}
