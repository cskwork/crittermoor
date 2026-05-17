import { useEffect, useState } from 'react'

const STORAGE_KEY = 'crittermoor.tutorial.seen'

interface Step {
  title: string
  body: string
}

const STEPS: Step[] = [
  {
    title: 'Welcome to Crittermoor',
    body: 'You start with three wardens on a fresh moor. Left-click a forest or stone tile to designate work; your wardens will walk over and chop or mine.',
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
    title: 'Save your colony',
    body: 'Save is in the top bar; your save lives in your browser. Close the tab and come back whenever.',
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
    <div className="tutorial-overlay" role="dialog" aria-label="Tutorial">
      <div className="tutorial-card panel">
        <div className="tutorial-progress" aria-hidden>
          {STEPS.map((_, i) => (
            <span key={i} className={i === step ? 'dot active' : 'dot'} />
          ))}
        </div>
        <h3>{current.title}</h3>
        <p>{current.body}</p>
        <div className="actions">
          <button onClick={dismiss}>Skip</button>
          <button
            onClick={() => (last ? dismiss() : setStep(step + 1))}
            autoFocus
          >
            {last ? 'Start' : 'Next'}
          </button>
        </div>
      </div>
      <style>{`
        .tutorial-overlay { position:absolute; inset:0; display:grid; place-items:end center; pointer-events:none; padding:24px; }
        .tutorial-card { pointer-events:auto; max-width: 420px; padding:18px 20px; margin-bottom: 60px; }
        .tutorial-card h3 { margin:8px 0 6px; color: var(--accent); }
        .tutorial-card p { margin: 0 0 14px; color: var(--text); line-height: 1.45; }
        .tutorial-progress { display:flex; gap:4px; justify-content:center; margin-bottom:6px; }
        .tutorial-progress .dot { width:6px; height:6px; border-radius:50%; background: var(--text-dim); opacity: 0.4; }
        .tutorial-progress .dot.active { opacity: 1; background: var(--accent); }
        .tutorial-card .actions { display:flex; gap:8px; justify-content:flex-end; }
      `}</style>
    </div>
  )
}
