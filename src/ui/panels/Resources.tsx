import { useEffect, useState } from 'react'

export function Resources() {
  const [r, setR] = useState<{ wood: number; stone: number }>({ wood: 0, stone: 0 })
  useEffect(() => {
    const id = window.setInterval(() => {
      const sim = (window as unknown as { __crittermoorGame?: { sim?: { resources?: { wood: number; stone: number } } } })
        .__crittermoorGame?.sim
      if (sim?.resources) setR({ wood: sim.resources.wood, stone: sim.resources.stone })
    }, 250)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="resources panel" aria-label="Colony resources">
      <span className="r"><strong>Wood</strong> {r.wood}</span>
      <span className="r"><strong>Stone</strong> {r.stone}</span>
      <style>{`
        .resources { position:absolute; top:12px; right:12px; padding:6px 12px; display:flex; gap:14px;
          font-size:13px; align-items:center; pointer-events:auto; }
        .resources strong { color:var(--accent); margin-right:4px; font-weight:500; font-size:11px;
          letter-spacing:0.04em; text-transform:uppercase; }
      `}</style>
    </div>
  )
}
