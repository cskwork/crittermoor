import { type ReactNode, useEffect, useRef, useState } from 'react'

interface TooltipProps {
  text: string
  children: ReactNode
  delayMs?: number
}

// Tooltip primitive: shows `text` after `delayMs` of hover, positioned just
// below the trigger. Hides on mouse leave or blur. Honors prefers-reduced-motion
// via the global CSS rule that strips transitions.
export function Tooltip({ text, children, delayMs = 400 }: TooltipProps) {
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
    }
  }, [])

  function show() {
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      const rect = wrapperRef.current?.getBoundingClientRect()
      if (rect) {
        setCoords({ x: rect.left + rect.width / 2, y: rect.bottom + 6 })
        setVisible(true)
      }
    }, delayMs)
  }

  function hide() {
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    setVisible(false)
  }

  return (
    <span
      ref={wrapperRef}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      style={{ display: 'inline-block' }}
    >
      {children}
      {coords && (
        <span
          role="tooltip"
          className={`crit-tooltip ${visible ? 'visible' : ''}`}
          style={{ left: coords.x, top: coords.y, transform: 'translateX(-50%)' }}
        >
          {text}
        </span>
      )}
    </span>
  )
}
