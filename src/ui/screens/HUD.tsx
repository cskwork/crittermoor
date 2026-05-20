import { useEffect, useRef, useState } from 'react'
import { useUiStore, type SpeedSetting } from '@/app/stores/uiStore'
import {
  AUTOSAVE_SLOT,
  NAMED_SLOTS,
  listSlotsOrdered,
  loadGameWithFallback,
  saveGame,
} from '@/game/Sim/Saves/store'
import { SaveCorruptError, type SaveMeta } from '@/game/Sim/Saves/schema'
import { dayOf, phaseOf } from '@/game/Sim/systems/time'
import { Toolbar } from '@/ui/panels/Toolbar'
import { SelectionPanel } from '@/ui/panels/SelectionPanel'
import { EventsLog } from '@/ui/panels/EventsLog'
import { Resources } from '@/ui/panels/Resources'
import { onAutosaveRecovered } from '@/achievements/trigger'
import { sound } from '@/audio/SoundManager'

const SPEEDS: SpeedSetting[] = [0, 1, 2, 4]
const DEFAULT_SLOT = AUTOSAVE_SLOT

const PHASE_ICON: Record<'dawn' | 'day' | 'dusk' | 'night', string> = {
  dawn: '☼',
  day: '☀',
  dusk: '☽',
  night: '✦',
}

interface SlotRow {
  slotId: string
  meta: SaveMeta | null
}

const NAMED_LABELS: Record<string, string> = {
  [AUTOSAVE_SLOT]: 'Autosave',
  slot1: 'Slot 1',
  slot2: 'Slot 2',
  slot3: 'Slot 3',
}

export function HUD() {
  const speed = useUiStore((s) => s.speed)
  const setSpeed = useUiStore((s) => s.setSpeed)
  const [slots, setSlots] = useState<SlotRow[]>([])
  const [mode, setMode] = useState<'load' | 'save' | null>(null)
  const [status, setStatus] = useState<string>('')
  const [clock, setClock] = useState<{ day: number; phase: 'dawn' | 'day' | 'dusk' | 'night' }>({
    day: 1,
    phase: 'day',
  })
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (mode !== null) listSlotsOrdered().then(setSlots).catch(() => undefined)
  }, [mode])

  useEffect(() => {
    function readClock() {
      const sim = (window as unknown as { __crittermoorGame?: { sim?: { tick: number } } }).__crittermoorGame?.sim
      if (sim) setClock({ day: dayOf(sim as never), phase: phaseOf(sim as never) })
    }
    readClock()
    timerRef.current = window.setInterval(readClock, 500)
    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current)
    }
  }, [])

  function onSave(slotId: string) {
    const game = (window as unknown as { __crittermoorGame?: { sim?: unknown } }).__crittermoorGame
    const sim = game?.sim
    if (!sim) {
      setStatus('No active game.')
      return
    }
    sound.play('ui_click')
    saveGame(slotId, sim as never, NAMED_LABELS[slotId] ?? slotId)
      .then((meta) => {
        setStatus(`Saved to ${NAMED_LABELS[slotId] ?? slotId} · day ${meta.day} · tick ${meta.tick}`)
        setMode(null)
      })
      .catch((err: unknown) => setStatus(`Save failed: ${String(err)}`))
  }

  function onLoad(slotId: string) {
    sound.play('ui_click')
    loadGameWithFallback(slotId)
      .then((result) => {
        if (!result) {
          setStatus('Save not found.')
          return
        }
        const handler = (window as unknown as { __crittermoorApplyLoad?: (s: unknown) => void }).__crittermoorApplyLoad
        if (handler) handler(result.sim)
        setMode(null)
        if (result.fromPrevSnapshot) {
          setStatus(`Loaded ${NAMED_LABELS[slotId] ?? slotId} from previous snapshot (current blob was corrupt).`)
        } else {
          setStatus(`Loaded ${NAMED_LABELS[slotId] ?? slotId} · tick ${result.sim.tick}`)
        }
        if (slotId === AUTOSAVE_SLOT) onAutosaveRecovered()
      })
      .catch((err: unknown) => {
        if (err instanceof SaveCorruptError) {
          setStatus(`Save corrupt and no previous snapshot to recover from in slot '${slotId}'.`)
          sound.play('error_blip')
        } else {
          setStatus(`Load failed: ${String(err)}`)
        }
      })
  }

  return (
    <div className="hud">
      <div className="hud-top panel">
        <div className="hud-title">Crittermoor</div>
        <div className="hud-clock" aria-live="polite">
          <span className="phase-icon" aria-hidden>{PHASE_ICON[clock.phase]}</span>
          <span>Day {clock.day}</span>
          <span className="phase-label">{clock.phase}</span>
        </div>
        <div className="speed-group" role="group" aria-label="Game speed">
          {SPEEDS.map((s) => (
            <button
              key={s}
              className={s === speed ? 'active' : ''}
              onClick={() => {
                sound.play('ui_click')
                setSpeed(s)
              }}
              aria-pressed={s === speed}
              title={s === 0 ? 'Pause' : `${s}x speed`}
            >
              {s === 0 ? '||' : `${s}x`}
            </button>
          ))}
        </div>
        <div className="hud-actions">
          <button onClick={() => setMode((m) => (m === 'save' ? null : 'save'))}>Save…</button>
          <button onClick={() => setMode((m) => (m === 'load' ? null : 'load'))}>Load…</button>
          <button onClick={() => useUiStore.getState().togglePriorities()} title="Priorities & Schedule (P)">
            Priorities
          </button>
          <button onClick={() => (window as unknown as { __crittermoorTestBattle?: () => void }).__crittermoorTestBattle?.()}>
            Test Battle
          </button>
        </div>
      </div>

      <div className="hud-help panel" aria-label="Controls help">
        Pick a tool · Left-click to act · Right-click to send wardens · Middle-drag / Shift-drag to pan · Wheel to zoom · Space = pause · 1/2/3 = speed
      </div>

      <Toolbar />
      <Resources />
      <EventsLog />
      <SelectionPanel />

      {status && <div className="hud-status panel">{status}</div>}

      {mode !== null && (
        <div className="load-panel panel" role="dialog" aria-label={mode === 'load' ? 'Load game' : 'Save game'}>
          <h3>{mode === 'load' ? 'Load Game' : 'Save Game'}</h3>
          {slots.length === 0 && <p className="empty">No slots yet.</p>}
          <ul>
            {[AUTOSAVE_SLOT, ...NAMED_SLOTS].map((slotId) => {
              const row = slots.find((s) => s.slotId === slotId) ?? { slotId, meta: null }
              const label = NAMED_LABELS[slotId] ?? slotId
              const meta = row.meta
              const empty = meta === null
              const disableSave = mode === 'save' && slotId === AUTOSAVE_SLOT
              const disableLoad = mode === 'load' && empty
              return (
                <li key={slotId} className={empty ? 'empty-row' : ''}>
                  <button
                    onClick={() => (mode === 'save' ? onSave(slotId) : onLoad(slotId))}
                    disabled={disableSave || disableLoad}
                    title={disableSave ? 'Autosave is managed by the game' : undefined}
                  >
                    <strong>{label}</strong>
                    {meta ? (
                      <>
                        <span>· day {meta.day}</span>
                        <span>· seed {meta.seed}</span>
                        <span>· {new Date(meta.savedAt).toLocaleString()}</span>
                      </>
                    ) : (
                      <span className="placeholder">· empty</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
          <button onClick={() => setMode(null)}>Close</button>
        </div>
      )}

      <style>{`
        .hud { position:absolute; inset:0; pointer-events:none; }
        .hud-top { pointer-events:auto; position:absolute; top:12px; left:50%; transform:translateX(-50%);
          display:flex; gap:18px; align-items:center; padding:8px 14px; }
        .hud-title { color:var(--accent); font-weight:600; letter-spacing:0.04em; }
        .hud-clock { display:flex; gap:8px; align-items:center; color:var(--text); font-size:13px; }
        .hud-clock .phase-icon { font-size:16px; color:var(--accent); }
        .hud-clock .phase-label { color:var(--text-dim); text-transform:capitalize; }
        .speed-group { display:flex; gap:6px; }
        .speed-group button { padding:4px 10px; font-size:13px; min-width:36px; }
        .speed-group button.active { border-color:var(--accent); color:var(--accent); }
        .hud-actions { display:flex; gap:6px; }
        .hud-help { pointer-events:auto; position:absolute; bottom:12px; left:50%; transform:translateX(-50%);
          font-size:12px; color:var(--text-dim); padding:6px 12px; max-width:80%; text-align:center; }
        .hud-status { pointer-events:auto; position:absolute; top:60px; left:50%; transform:translateX(-50%);
          font-size:12px; color:var(--text); padding:6px 12px; }
        .load-panel { pointer-events:auto; position:absolute; top:80px; left:50%; transform:translateX(-50%);
          min-width:380px; max-height:60vh; overflow:auto; padding:16px; }
        .load-panel h3 { margin:0 0 10px; color:var(--accent); }
        .load-panel ul { list-style:none; padding:0; margin:0 0 10px; }
        .load-panel li { margin:6px 0; }
        .load-panel li button { width:100%; text-align:left; padding:8px 10px; display:flex; gap:8px; flex-wrap:wrap; }
        .load-panel li button:disabled { opacity:0.5; cursor:not-allowed; }
        .load-panel li.empty-row .placeholder { color: var(--text-dim); font-style: italic; }
        .empty { color:var(--text-dim); }
      `}</style>
    </div>
  )
}

void DEFAULT_SLOT
