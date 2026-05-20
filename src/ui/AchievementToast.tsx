import { useEffect } from 'react'
import { useAchievementStore } from '@/achievements/store'
import { achievementById } from '@/achievements/registry'

const TOAST_DURATION_MS = 4000

export function AchievementToast() {
  const toasts = useAchievementStore((s) => s.toasts)
  const dismiss = useAchievementStore((s) => s.dismissToast)

  useEffect(() => {
    if (toasts.length === 0) return
    const timers = toasts.map((t) => window.setTimeout(() => dismiss(t.shownAt), TOAST_DURATION_MS))
    return () => {
      for (const id of timers) clearTimeout(id)
    }
  }, [toasts, dismiss])

  if (toasts.length === 0) return null

  return (
    <div className="ach-toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => {
        const def = achievementById(t.id)
        if (!def) return null
        return (
          <div key={t.shownAt} className="ach-toast panel">
            <span className="ach-badge" aria-hidden>★</span>
            <div className="ach-text">
              <strong>Achievement: {def.title}</strong>
              <span>{def.description}</span>
            </div>
          </div>
        )
      })}
      <style>{`
        .ach-toast-stack { position:absolute; bottom:80px; right:14px; display:flex; flex-direction:column; gap:6px; z-index:60;
          pointer-events:none; }
        .ach-toast { display:flex; gap:10px; align-items:center; padding:10px 14px; min-width:220px;
          border-color: var(--accent); background: linear-gradient(180deg, rgba(168,208,141,0.16), rgba(20,30,18,0.92));
          animation: achSlideIn 240ms ease-out; }
        .ach-toast .ach-badge { font-size:22px; color: var(--accent); flex-shrink:0; }
        .ach-text { display:flex; flex-direction:column; gap:2px; font-size:12px; }
        .ach-text strong { color: var(--accent); }
        .ach-text span { color: var(--text-dim); }
        @keyframes achSlideIn { from { transform: translateX(40px); opacity: 0; } to { transform: none; opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .ach-toast { animation: none; } }
      `}</style>
    </div>
  )
}
