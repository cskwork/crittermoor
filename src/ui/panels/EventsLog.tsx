import { useEffect, useRef, useState } from 'react'

export function EventsLog() {
  const [events, setEvents] = useState<string[]>([])
  const ref = useRef<HTMLOListElement>(null)

  useEffect(() => {
    const id = window.setInterval(() => {
      const sim = (window as unknown as { __crittermoorGame?: { sim?: { events?: string[] } } }).__crittermoorGame?.sim
      if (!sim?.events) return
      // Show the most recent 15 events.
      const recent = sim.events.slice(-15)
      setEvents(recent)
    }, 500)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [events])

  return (
    <div className="events panel" aria-label="Recent events" role="log" aria-live="polite" aria-relevant="additions">
      <div className="header">Events</div>
      {events.length === 0 ? (
        <div className="empty">No events yet.</div>
      ) : (
        <ol ref={ref}>
          {events.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ol>
      )}
      <style>{`
        .events { position:absolute; top:72px; right:12px; width:240px; max-height:38vh; padding:8px 10px; display:flex; flex-direction:column; gap:4px; pointer-events:auto; }
        .events .header { color:var(--accent); font-weight:600; font-size:12px; letter-spacing:0.04em; text-transform:uppercase; }
        .events .empty { color:var(--text-dim); font-size:11px; padding:4px 0; }
        .events ol { list-style:none; padding:0; margin:0; overflow-y:auto; max-height:32vh; font-size:11px; color:var(--text); }
        .events li { padding:3px 0; border-bottom:1px dashed rgba(255,255,255,0.04); }
        .events li:last-child { border-bottom:none; }
      `}</style>
    </div>
  )
}
