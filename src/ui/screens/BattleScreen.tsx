import { useEffect, useMemo, useRef, useState } from 'react'
import { useBattleStore } from '@/app/stores/battleStore'
import { speciesById } from '@/game/Sim/Critters/species'
import { TYPE_COLOR, TYPE_NAMES } from '@/game/Sim/Critters/types'
import { getMove } from '@/game/Sim/Battle/moves'
import { isBattleOver, type BattleAction, type BattleCritter } from '@/game/Sim/Battle/BattleState'

export function BattleScreen() {
  const state = useBattleStore((s) => s.state)
  const onAction = useBattleStore((s) => s.onAction)
  const onEnd = useBattleStore((s) => s.onEnd)
  const [selectedMoveId, setSelectedMoveId] = useState<string | null>(null)
  const logRef = useRef<HTMLOListElement>(null)
  const winner = useMemo(() => (state ? isBattleOver(state) : { over: false, winner: null }), [state])

  useEffect(() => {
    setSelectedMoveId(null)
    // Scroll log to bottom on every turn.
    requestAnimationFrame(() => {
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
    })
  }, [state?.turn])

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
      <div className="battle-panel panel">
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
      .battle-root { position:absolute; inset:0; display:grid; place-items:center; background: rgba(10,15,20,0.92); pointer-events:auto; }
      .battle-panel { width: min(720px, 92vw); padding: 18px 20px; display:flex; flex-direction:column; gap:14px; }
      .banner { display:flex; justify-content:space-between; align-items:baseline; color: var(--text-dim); }
      .banner .win { color: var(--accent); font-size: 18px; }
      .banner .lose { color: var(--danger); font-size: 18px; }
      .arena { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
      .critter-card { display:flex; gap:12px; align-items:center; padding:10px; border:1px solid var(--panel-border); border-radius:8px; }
      .critter-card.player { flex-direction: row-reverse; text-align: right; }
      .portrait { width:56px; height:56px; border-radius:50%; flex-shrink:0; }
      .info { display:flex; flex-direction:column; gap:4px; flex:1; }
      .lvl { color: var(--text-dim); font-size:11px; }
      .type-chips { display:flex; gap:4px; }
      .critter-card.player .type-chips { justify-content:flex-end; }
      .chip { padding: 0 6px; border-radius: 4px; font-size: 10px; color:#0d1115; font-weight:600; }
      .hp-bar { display:inline-block; width:100%; height:6px; background: #1e2630; border-radius: 3px; overflow:hidden; }
      .hp-bar.large { height:8px; }
      .hp-bar > span { display:block; height:100%; background: var(--accent); transition: width 200ms ease-out; }
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
