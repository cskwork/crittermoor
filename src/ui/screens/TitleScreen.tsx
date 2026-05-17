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

  function randomize() {
    setSeedText(String(Math.floor(Math.random() * 1e9)))
  }

  return (
    <div className="title-root">
      <div className="title-bg" aria-hidden>
        <svg viewBox="0 0 800 480" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1a2535" />
              <stop offset="0.6" stopColor="#23364e" />
              <stop offset="1" stopColor="#3a4a3f" />
            </linearGradient>
          </defs>
          <rect width="800" height="480" fill="url(#sky)" />
          <g fill="#1f2a1c" opacity="0.85">
            <polygon points="0,420 120,340 240,420" />
            <polygon points="180,420 320,300 460,420" />
            <polygon points="400,420 540,310 680,420" />
            <polygon points="600,420 720,330 800,400 800,480 0,480" />
          </g>
          <g fill="#a8d08d" opacity="0.7">
            {Array.from({ length: 40 }).map((_, i) => (
              <circle key={i} cx={(i * 53) % 800} cy={(i * 37) % 60 + 60} r={i % 5 === 0 ? 1.6 : 1} />
            ))}
          </g>
          <circle cx="640" cy="120" r="48" fill="#f0c674" opacity="0.85" />
          <circle cx="640" cy="120" r="64" fill="#f0c674" opacity="0.18" />
        </svg>
      </div>

      <div className="title-card panel">
        <div className="hero">
          <span className="badge" aria-hidden>✧ Crittermoor</span>
          <h1>Crittermoor</h1>
          <p className="tagline">Settle the wild moors. Tame the critters. Survive the storm.</p>
        </div>
        <div className="form">
          <label>
            <span>World seed</span>
            <div className="seed-row">
              <input
                type="text"
                value={seedText}
                onChange={(e) => setSeedText(e.target.value)}
                aria-label="World seed"
              />
              <button type="button" onClick={randomize} title="New random seed">⟳</button>
            </div>
          </label>
          <button className="primary" onClick={start} autoFocus>
            New Game
          </button>
        </div>
        <ul className="hints">
          <li>Pick a tool from the left toolbar then left-click a tile.</li>
          <li>Right-click sends all wardens to a destination.</li>
          <li>Shift+left-click attempts to tame a weakened wild critter.</li>
          <li>Space pauses · 1 / 2 / 3 sets speed · S/C/M/T/X switch tools.</li>
        </ul>
        <p className="version">v0.2.0 — alpha</p>
      </div>

      <style>{`
        .title-root { position:absolute; inset:0; display:grid; place-items:center; overflow:hidden; }
        .title-bg { position:absolute; inset:0; pointer-events:none; }
        .title-bg svg { width:100%; height:100%; display:block; }

        .title-card { pointer-events:auto; min-width:420px; max-width:560px; padding:28px 32px; text-align:left;
          backdrop-filter: blur(8px); display:flex; flex-direction:column; gap:18px; }
        .hero { text-align:center; }
        .hero .badge { display:inline-block; color:var(--text-dim); font-size:11px; letter-spacing:0.16em; text-transform:uppercase; margin-bottom:4px; }
        .hero h1 { margin:0; font-size:56px; line-height:1; letter-spacing:0.01em; color:var(--accent);
          background: linear-gradient(180deg, var(--accent) 0%, #5f8c5a 100%);
          -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
        .hero .tagline { margin:8px 0 0; color:var(--text-dim); font-size:13px; }

        .form { display:flex; flex-direction:column; gap:10px; }
        .form label { display:flex; flex-direction:column; gap:6px; color:var(--text-dim); font-size:12px; }
        .seed-row { display:flex; gap:6px; }
        .seed-row input { flex:1; background:#0d1115; color:var(--text); border:1px solid var(--panel-border); border-radius:6px; padding:9px 11px; font:inherit; }
        .seed-row button { padding:8px 12px; }
        .form .primary { padding:11px 14px; font-size:14px; border-color:var(--accent); color:var(--accent); font-weight:600; }
        .form .primary:hover { background: rgba(168,208,141,0.1); }

        .hints { list-style:none; padding:0; margin:0; color:var(--text-dim); font-size:11px; line-height:1.6; border-top:1px solid var(--panel-border); padding-top:12px; }
        .hints li::before { content:'›  '; color:var(--accent); }

        .version { margin:0; font-size:10px; color:var(--text-dim); text-align:right; letter-spacing:0.08em; }
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
