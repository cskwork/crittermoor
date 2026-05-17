import { useEffect, useState } from 'react'
import { useUiStore, type SpeedSetting } from '@/app/stores/uiStore'
import { listSaves, saveGame, loadGame } from '@/game/Sim/Saves/store'
import type { SaveMeta } from '@/game/Sim/Saves/schema'

const SPEEDS: SpeedSetting[] = [0, 1, 2, 4]
const DEFAULT_SLOT = 'autosave'

export function HUD() {
  const speed = useUiStore((s) => s.speed)
  const setSpeed = useUiStore((s) => s.setSpeed)
  const [saves, setSaves] = useState<SaveMeta[]>([])
  const [showLoad, setShowLoad] = useState(false)
  const [status, setStatus] = useState<string>('')

  useEffect(() => {
    if (showLoad) listSaves().then(setSaves).catch(() => undefined)
  }, [showLoad])

  function onSave() {
    const game = (window as unknown as { __crittermoorGame?: { sim?: unknown } }).__crittermoorGame
    const sim = game?.sim
    if (!sim) {
      setStatus('No active game.')
      return
    }
    saveGame(DEFAULT_SLOT, sim as never)
      .then((meta) => setStatus(`Saved · day ${meta.day} · tick ${meta.tick}`))
      .catch((err: unknown) => setStatus(`Save failed: ${String(err)}`))
  }

  function onLoad(slotId: string) {
    loadGame(slotId)
      .then((sim) => {
        if (!sim) {
          setStatus('Save not found.')
          return
        }
        const handler = (window as unknown as { __crittermoorApplyLoad?: (s: unknown) => void }).__crittermoorApplyLoad
        if (handler) handler(sim)
        setShowLoad(false)
        setStatus(`Loaded · tick ${sim.tick}`)
      })
      .catch((err: unknown) => setStatus(`Load failed: ${String(err)}`))
  }

  return (
    <div className="hud">
      <div className="hud-top panel">
        <div className="hud-title">Crittermoor</div>
        <div className="speed-group" role="group" aria-label="Game speed">
          {SPEEDS.map((s) => (
            <button
              key={s}
              className={s === speed ? 'active' : ''}
              onClick={() => setSpeed(s)}
              aria-pressed={s === speed}
              title={s === 0 ? 'Pause' : `${s}x speed`}
            >
              {s === 0 ? '||' : `${s}x`}
            </button>
          ))}
        </div>
        <div className="hud-actions">
          <button onClick={onSave}>Save</button>
          <button onClick={() => setShowLoad((v) => !v)}>Load</button>
        </div>
      </div>

      <div className="hud-help panel" aria-label="Controls help">
        Left-click forest/stone to designate · Right-click to send wardens · Middle-drag / Shift-drag to pan · Wheel to zoom · Space = pause · 1/2/3 = speed
      </div>

      {status && <div className="hud-status panel">{status}</div>}

      {showLoad && (
        <div className="load-panel panel" role="dialog" aria-label="Load game">
          <h3>Load Game</h3>
          {saves.length === 0 && <p className="empty">No saves yet.</p>}
          <ul>
            {saves.map((s) => (
              <li key={s.slotId}>
                <button onClick={() => onLoad(s.slotId)}>
                  <strong>{s.name}</strong>
                  <span>· day {s.day}</span>
                  <span>· seed {s.seed}</span>
                  <span>· {new Date(s.savedAt).toLocaleString()}</span>
                </button>
              </li>
            ))}
          </ul>
          <button onClick={() => setShowLoad(false)}>Close</button>
        </div>
      )}

      <style>{`
        .hud { position:absolute; inset:0; pointer-events:none; }
        .hud-top { pointer-events:auto; position:absolute; top:12px; left:50%; transform:translateX(-50%);
          display:flex; gap:18px; align-items:center; padding:8px 14px; }
        .hud-title { color:var(--accent); font-weight:600; letter-spacing:0.04em; }
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
        .empty { color:var(--text-dim); }
      `}</style>
    </div>
  )
}
