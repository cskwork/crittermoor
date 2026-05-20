import { useEffect, useState } from 'react'

const STORAGE_KEY = 'crittermoor.tutorial.seen.v2'

interface Step {
  title: string
  body: string
}

const STEPS: Step[] = [
  {
    title: 'Welcome to Crittermoor',
    body: 'You start with three wardens on a fresh moor. Left-click a forest or stone tile to designate work; your wardens will walk over and chop or mine. Resources drop as items on the tile.',
  },
  {
    title: 'Move your wardens',
    body: 'Right-click any tile to send all wardens there. The pathfinder routes around obstacles.',
  },
  {
    title: 'Control time',
    body: 'Use the speed buttons at the top (or Space / 1 / 2 / 3) to pause and accelerate the day.',
  },
  {
    title: 'Mark stockpile zones',
    body: 'Press Z (Stockpile tool) and click tiles to mark them as storage. Idle wardens haul loose items into the nearest stockpile and that\'s how Wood and Stone become usable resources.',
  },
  {
    title: 'Build & defend',
    body: 'Press B for Build, pick a structure, then click a tile to place a blueprint. Walls block enemies, doors pass wardens but stop wild critters, and turrets auto-fire on raids.',
  },
  {
    title: 'Tame and battle',
    body: 'Weaken a wild critter in battle, then Shift+left-click to tame. Tamed critters follow their bonded warden. Battles open automatically when a raid arrives.',
  },
  {
    title: 'Priorities & schedule',
    body: 'Press P to open the Priorities panel. Set per-warden priorities (chop / mine / build / tame / haul) and a 24-hour schedule (Sleep / Work / Joy / Anything). Draft a warden to override autonomous behavior with right-click orders.',
  },
  {
    title: 'Save when you like',
    body: 'Autosave fires every 60 sim-seconds to the "autosave" slot, plus 3 named slots from the Save dialog. Saves carry a checksum and fall back to a previous snapshot if corrupted.',
  },
]

export function Tutorial() {
  const [seen, setSeen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (seen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [seen])

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // ignore
    }
    setSeen(true)
  }

  if (seen) return null
  const current = STEPS[step]!
  const last = step === STEPS.length - 1

  return (
    <div className="tutorial-root" role="dialog" aria-label={`Tutorial step ${step + 1} of ${STEPS.length}`}>
      <div className="tutorial-card panel">
        <div className="t-step">Step {step + 1} of {STEPS.length}</div>
        <h2>{current.title}</h2>
        <p>{current.body}</p>
        <div className="t-actions">
          <button onClick={() => dismiss()}>Skip</button>
          <button
            className="primary"
            autoFocus
            onClick={() => {
              if (last) dismiss()
              else setStep((s) => s + 1)
            }}
          >
            {last ? 'Got it' : 'Next'}
          </button>
        </div>
      </div>
      <style>{`
        .tutorial-root { position:absolute; inset:0; display:grid; place-items:center; pointer-events:auto;
          background: radial-gradient(ellipse at center, rgba(10,18,28,0.78) 0%, rgba(0,0,0,0.7) 100%); z-index: 70; }
        .tutorial-card { min-width:420px; max-width:560px; padding:24px 28px; display:flex; flex-direction:column; gap:12px; }
        .t-step { color:var(--text-dim); font-size:11px; letter-spacing:0.16em; text-transform:uppercase; }
        .tutorial-card h2 { margin:0; color:var(--accent); }
        .tutorial-card p { margin:0; line-height:1.55; color:var(--text); font-size:13px; }
        .t-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:8px; }
        .t-actions .primary { border-color:var(--accent); color:var(--accent); font-weight:600; }
      `}</style>
    </div>
  )
}
