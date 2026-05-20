import { useEffect, useMemo, useRef, useState } from 'react'
import { useBattleStore } from '@/app/stores/battleStore'
import { speciesById } from '@/game/Sim/Critters/species'
import { TYPE_COLOR, TYPE_NAMES } from '@/game/Sim/Critters/types'
import { getMove } from '@/game/Sim/Battle/moves'
import { isBattleOver, type BattleAction, type BattleCritter } from '@/game/Sim/Battle/BattleState'
import { formatDamagePopup, parseDamageLines } from '@/ui/battle/damagePopup'
import { sound } from '@/audio/SoundManager'

interface FloatingPopup {
  key: number
  side: 0 | 1
  text: string
  color: 'red' | 'yellow' | 'gray'
}

let popupKeyCounter = 0

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function BattleScreen() {
  const state = useBattleStore((s) => s.state)
  const onAction = useBattleStore((s) => s.onAction)
  const onEnd = useBattleStore((s) => s.onEnd)
  const [selectedMoveId, setSelectedMoveId] = useState<string | null>(null)
  const [popups, setPopups] = useState<FloatingPopup[]>([])
  const [shakeUntil, setShakeUntil] = useState(0)
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 })
  const lastSeenTurnRef = useRef(-1)
  const lastSeenLogLenRef = useRef(0)
  const wonRef = useRef<0 | 1 | null | undefined>(undefined)
  const logRef = useRef<HTMLOListElement>(null)
  const winner = useMemo(() => (state ? isBattleOver(state) : { over: false, winner: null }), [state])

  useEffect(() => {
    setSelectedMoveId(null)
    requestAnimationFrame(() => {
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
    })
    if (!state) {
      lastSeenTurnRef.current = -1
      lastSeenLogLenRef.current = 0
      wonRef.current = undefined
      return
    }
    if (state.turn === lastSeenTurnRef.current) return
    const newLines = state.log.slice(lastSeenLogLenRef.current)
    lastSeenLogLenRef.current = state.log.length
    lastSeenTurnRef.current = state.turn
    const events = parseDamageLines(newLines)
    if (events.length > 0) {
      const reduced = prefersReducedMotion()
      const next: FloatingPopup[] = events.map((e) => {
        const fmt = formatDamagePopup({ dmg: e.dmg, crit: e.crit })
        return { key: ++popupKeyCounter, side: (1 - e.side) as 0 | 1, text: fmt.text, color: fmt.color }
      })
      setPopups((prev) => [...prev, ...next])
      const anyHit = events.some((e) => e.dmg > 0)
      if (anyHit) sound.play('battle_hit')
      const anyCrit = events.some((e) => e.crit)
      if (anyCrit) sound.play('battle_crit')
      // Schedule popup cleanup (600ms each).
      next.forEach((p) => {
        window.setTimeout(() => setPopups((curr) => curr.filter((x) => x.key !== p.key)), 600)
      })
      // Shake on crit, JS only — gated by reduced-motion.
      if (anyCrit && !reduced) {
        const until = performance.now() + 4 * 16 // 4 frames
        setShakeUntil(until)
      }
    }
  }, [state])

  // Drive the shake via rAF when active.
  useEffect(() => {
    if (shakeUntil <= 0) return
    let raf = 0
    const step = () => {
      const now = performance.now()
      if (now >= shakeUntil) {
        setShakeOffset({ x: 0, y: 0 })
        return
      }
      const mag = 6
      setShakeOffset({ x: (Math.random() * 2 - 1) * mag, y: (Math.random() * 2 - 1) * mag })
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [shakeUntil])

  // Victory / defeat sound, fired once per resolution.
  useEffect(() => {
    if (!winner.over) {
      wonRef.current = undefined
      return
    }
    if (wonRef.current === winner.winner) return
    wonRef.current = winner.winner
    if (winner.winner === 0) sound.play('battle_victory')
    else if (winner.winner === 1) sound.play('battle_defeat')
  }, [winner.over, winner.winner])

  if (!state) return null
  const player = state.sides[0]
  const enemy = state.sides[1]
  const activePlayer = player.team[player.activeSlot]!
  const activeEnemy = enemy.team[enemy.activeSlot]!

  function chooseMove(moveId: string) {
    if (!onAction || !state) return
    if (winner.over) return
    setSelectedMoveId(moveId)
    // Naive enemy AI: pick first remaining move.
    const enemyMove = activeEnemy.moves[0] ?? 'bite'
    const playerAction: BattleAction = { kind: 'move', moveId }
    const enemyAction: BattleAction = { kind: 'move', moveId: enemyMove }
    onAction(0, playerAction)
    onAction(1, enemyAction)
  }

  function switchTo(slot: number) {
    if (!onAction || !state) return
    if (winner.over) return
    const enemyMove = activeEnemy.moves[0] ?? 'bite'
    onAction(0, { kind: 'switch', toSlot: slot })
    onAction(1, { kind: 'move', moveId: enemyMove })
  }

  return (
    <div className="battle-root">
      <div
        className="battle-shake-wrap"
        style={{ transform: shakeOffset.x || shakeOffset.y ? `translate(${shakeOffset.x}px, ${shakeOffset.y}px)` : undefined }}
      >
      <div className="battle-panel panel">
        <div className="popup-layer" aria-hidden>
          {popups.map((p) => (
            <span key={p.key} className={`dmg-popup side-${p.side} color-${p.color}`}>{p.text}</span>
          ))}
        </div>
        <div className="banner">
          <span>Battle · turn {state.turn + 1}</span>
          {winner.over && (
            <strong className={winner.winner === 0 ? 'win' : 'lose'}>
              {winner.winner === 0 ? 'Victory!' : winner.winner === 1 ? 'Defeat…' : 'Draw'}
            </strong>
          )}
        </div>

        <div className="arena">
          <CritterCard side="enemy" critter={activeEnemy} />
          <CritterCard side="player" critter={activePlayer} />
        </div>

        <div className="actions">
          <div className="moves" aria-label="Moves">
            {activePlayer.moves.map((moveId) => {
              const move = getMove(moveId)
              if (!move) return null
              const typeColor = TYPE_COLOR[move.type]
              return (
                <button
                  key={moveId}
                  onClick={() => chooseMove(moveId)}
                  disabled={winner.over || activePlayer.hp <= 0}
                  className={selectedMoveId === moveId ? 'selected' : ''}
                  style={{ borderColor: `#${typeColor.toString(16).padStart(6, '0')}` }}
                >
                  <span className="move-name">{move.name}</span>
                  <span className="move-meta">{TYPE_NAMES[move.type]} · {move.power || '—'} · {move.accuracy}%</span>
                </button>
              )
            })}
          </div>
          <div className="party" aria-label="Switch to teammate">
            {player.team.map((c, i) => (
              <button
                key={i}
                onClick={() => switchTo(i)}
                disabled={winner.over || c.hp <= 0 || i === player.activeSlot}
                title={`${nameOf(c)} ${c.hp}/${c.maxHp}`}
              >
                {nameShort(c)}
                <span className="hp-bar"><span style={{ width: `${(c.hp / c.maxHp) * 100}%` }} /></span>
              </button>
            ))}
          </div>
        </div>

        <ol ref={logRef} className="log" aria-live="polite">
          {state.log.slice(-30).map((line, i) => (
            <li key={`${state.turn}-${i}`}>{line}</li>
          ))}
        </ol>

        {winner.over && (
          <div className="end-actions">
            <button autoFocus onClick={() => onEnd && onEnd(winner.winner)}>Return to colony</button>
          </div>
        )}
      </div>
      </div>
      <BattleStyles />
    </div>
  )
}

function CritterCard({ critter, side }: { critter: BattleCritter; side: 'player' | 'enemy' }) {
  const species = speciesById(critter.speciesId)
  const tintColor = species ? TYPE_COLOR[critter.types[0]] : 0x808080
  return (
    <div className={`critter-card ${side}`}>
      <div className="portrait" style={{ background: `#${tintColor.toString(16).padStart(6, '0')}` }} />
      <div className="info">
        <strong>{species?.name ?? 'Wild'}</strong>
        <span className="lvl">Lv {critter.level}</span>
        <div className="type-chips">
          {critter.types.map((t) =>
            t === null ? null : (
              <span key={t} className="chip" style={{ background: `#${TYPE_COLOR[t].toString(16).padStart(6, '0')}` }}>
                {TYPE_NAMES[t]}
              </span>
            ),
          )}
        </div>
        <div className="hp-bar large"><span style={{ width: `${(critter.hp / critter.maxHp) * 100}%` }} /></div>
        <div className="hp-num">{critter.hp} / {critter.maxHp}{critter.status ? ` · ${critter.status}` : ''}</div>
      </div>
    </div>
  )
}

function nameOf(c: BattleCritter): string {
  return speciesById(c.speciesId)?.name ?? '???'
}

function nameShort(c: BattleCritter): string {
  return nameOf(c).slice(0, 4)
}

function BattleStyles() {
  return (
    <style>{`
      .battle-root { position:absolute; inset:0; display:grid; place-items:center;
        background: radial-gradient(ellipse at center, rgba(20,30,40,0.88) 0%, rgba(8,12,16,0.96) 90%);
        pointer-events:auto; animation: battleFadeIn 240ms ease-out; }
      @keyframes battleFadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
      .battle-panel { width: min(760px, 94vw); padding: 22px 26px; display:flex; flex-direction:column; gap:16px;
        box-shadow: 0 12px 48px rgba(0,0,0,0.5); border-color: rgba(168,208,141,0.25); }
      .banner { display:flex; justify-content:space-between; align-items:baseline; color: var(--text-dim);
        text-transform:uppercase; letter-spacing:0.08em; font-size:12px; }
      .banner .win { color: var(--accent); font-size: 20px; animation: pulse 1.4s ease-in-out infinite; }
      .banner .lose { color: var(--danger); font-size: 20px; animation: pulse 1.4s ease-in-out infinite; }
      @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }
      .arena { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
      .critter-card { display:flex; gap:12px; align-items:center; padding:12px; border:1px solid var(--panel-border); border-radius:10px;
        background: linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%); }
      .critter-card.enemy { border-color: rgba(224,122,95,0.3); }
      .critter-card.player { flex-direction: row-reverse; text-align: right; border-color: rgba(168,208,141,0.3); }
      .portrait { width:64px; height:64px; border-radius:14px; flex-shrink:0;
        box-shadow: 0 0 18px rgba(255,255,255,0.06), inset 0 0 12px rgba(0,0,0,0.25); }
      .info { display:flex; flex-direction:column; gap:4px; flex:1; }
      .lvl { color: var(--text-dim); font-size:11px; }
      .type-chips { display:flex; gap:4px; }
      .critter-card.player .type-chips { justify-content:flex-end; }
      .chip { padding: 0 6px; border-radius: 4px; font-size: 10px; color:#0d1115; font-weight:600; }
      .hp-bar { display:inline-block; width:100%; height:6px; background: #1e2630; border-radius: 3px; overflow:hidden; }
      .hp-bar.large { height:8px; }
      .hp-bar > span { display:block; height:100%; background: var(--accent); transition: width 300ms cubic-bezier(0.33, 1, 0.68, 1); }
      .battle-shake-wrap { display:contents; }
      .popup-layer { position:absolute; inset:0; pointer-events:none; overflow:hidden; }
      .dmg-popup { position:absolute; font-weight:700; font-size:18px; text-shadow: 0 0 6px rgba(0,0,0,0.6);
        animation: dmgFloat 600ms ease-out forwards; }
      .dmg-popup.color-red { color: var(--danger, #e07a5f); }
      .dmg-popup.color-yellow { color: #f0c674; font-size: 22px; }
      .dmg-popup.color-gray { color: var(--text-dim); }
      .dmg-popup.side-0 { top: 30%; left: 30%; }
      .dmg-popup.side-1 { top: 30%; right: 30%; }
      @keyframes dmgFloat { from { transform: translateY(0); opacity: 1; } to { transform: translateY(-32px); opacity: 0; } }
      @media (prefers-reduced-motion: reduce) {
        .dmg-popup { animation: none; }
      }
      .hp-num { font-size:11px; color: var(--text-dim); }
      .actions { display:grid; grid-template-columns: 1fr 1fr; gap:14px; }
      .moves { display:grid; grid-template-columns: 1fr 1fr; gap:8px; }
      .moves button { display:flex; flex-direction:column; align-items:flex-start; gap:2px; padding:8px 10px; border-width:2px; }
      .moves button.selected { background: rgba(168,208,141,0.12); }
      .move-name { font-weight:600; font-size:13px; }
      .move-meta { font-size:10px; color:var(--text-dim); }
      .party { display:flex; flex-direction:column; gap:6px; }
      .party button { display:flex; justify-content:space-between; align-items:center; gap:8px; padding:6px 10px; font-size:12px; }
      .party button .hp-bar { width: 60px; }
      .log { list-style:none; padding:8px 12px; margin:0; background:#0d1115; border-radius:6px; max-height:120px; overflow-y:auto; font-size:12px; color: var(--text-dim); }
      .log li { margin: 1px 0; }
      .end-actions { display:flex; justify-content:flex-end; }
    `}</style>
  )
}
