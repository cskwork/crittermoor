import { useState } from 'react'

interface Props {
  onStart: (seed: number) => void
}

export function TitleScreen({ onStart }: Props) {
  const [seedText, setSeedText] = useState(() => String(Math.floor(Math.random() * 1e9)))

  function start() {
    const n = Number(seedText)
    const seed = Number.isFinite(n) && n > 0 ? n : hashSeed(seedText)
    onStart(seed)
  }

  return (
    <div className="title-root">
      <div className="title-card panel">
        <h1>Crittermoor</h1>
        <p className="tagline">Settle the wild moors. Tame the critters. Survive the storm.</p>
        <label>
          Seed
          <input
            type="text"
            value={seedText}
            onChange={(e) => setSeedText(e.target.value)}
            aria-label="World seed"
          />
        </label>
        <div className="actions">
          <button onClick={start}>New Game</button>
        </div>
        <p className="version">v0.1.0 — pre-alpha</p>
      </div>
      <style>{`
        .title-root { position:absolute; inset:0; display:grid; place-items:center; pointer-events:none; }
        .title-card { pointer-events:auto; min-width:320px; text-align:center; padding:24px 28px; }
        .title-card h1 { margin:0; font-size:42px; letter-spacing:0.02em; color:var(--accent); }
        .title-card .tagline { color:var(--text-dim); margin:6px 0 18px; }
        .title-card label { display:flex; flex-direction:column; gap:6px; text-align:left; color:var(--text-dim); font-size:13px; margin:8px 0 16px; }
        .title-card input { background:#0d1115; color:var(--text); border:1px solid var(--panel-border); border-radius:6px; padding:8px 10px; font:inherit; }
        .title-card .actions { display:flex; justify-content:center; gap:10px; }
        .title-card .version { margin:14px 0 0; font-size:11px; color:var(--text-dim); }
      `}</style>
    </div>
  )
}

function hashSeed(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
