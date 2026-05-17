import { useEffect } from 'react'
import { useUiStore, type SpeedSetting, type ToolMode } from './stores/uiStore'

const TOOL_HOTKEYS: Record<string, ToolMode> = {
  KeyS: 'select',
  KeyC: 'chop',
  KeyM: 'mine',
  KeyT: 'tame',
  KeyX: 'cancel',
}

export function Keybindings() {
  useEffect(() => {
    function shouldIgnore(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return true
      if (target.isContentEditable) return true
      // Space on focused button activates it; let the button handle it instead.
      if (target.closest('button')) return true
      return false
    }
    function onKey(e: KeyboardEvent) {
      if (shouldIgnore(e.target)) return
      if (e.code === 'Space') {
        e.preventDefault()
        const cur = useUiStore.getState().speed
        useUiStore.setState({ speed: cur === 0 ? 1 : 0 })
        return
      }
      if (e.code === 'Escape') {
        useUiStore.setState({ selectedEid: null, toolMode: 'select' })
        return
      }
      const speeds: Record<string, SpeedSetting> = { Digit1: 1, Digit2: 2, Digit3: 4 }
      if (speeds[e.code] !== undefined) {
        useUiStore.setState({ speed: speeds[e.code]! })
        return
      }
      const tool = TOOL_HOTKEYS[e.code]
      if (tool) useUiStore.setState({ toolMode: tool })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return null
}
