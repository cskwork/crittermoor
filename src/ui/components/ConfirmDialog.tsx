import { useEffect, useRef } from 'react'

interface Props {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

// Minimal modal-style confirmation. Used for destructive save actions
// (overwriting a slot). Focus traps to the primary action on mount and
// closes on Escape / backdrop click.
export function ConfirmDialog({ title, message, confirmLabel = 'OK', cancelLabel = 'Cancel', danger, onConfirm, onCancel }: Props) {
  const primaryRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    primaryRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.code === 'Escape') onCancel()
      if (e.code === 'Enter') onConfirm()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel, onConfirm])

  return (
    <div className="confirm-backdrop" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onClick={onCancel}>
      <div className="confirm-card panel" onClick={(e) => e.stopPropagation()}>
        <h3 id="confirm-title">{title}</h3>
        <p>{message}</p>
        <div className="actions">
          <button onClick={onCancel}>{cancelLabel}</button>
          <button ref={primaryRef} className={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
      <style>{`
        .confirm-backdrop { position:absolute; inset:0; display:grid; place-items:center; background: rgba(8,10,14,0.55); z-index: 120; pointer-events:auto; }
        .confirm-card { min-width:320px; max-width:440px; padding:20px 22px; display:flex; flex-direction:column; gap:10px; }
        .confirm-card h3 { margin:0; color: var(--accent); }
        .confirm-card p { margin:0; color: var(--text); font-size: var(--fs-md); line-height:1.5; }
        .confirm-card .actions { display:flex; gap:8px; justify-content:flex-end; margin-top:6px; }
      `}</style>
    </div>
  )
}
