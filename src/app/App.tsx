import { useEffect, useRef, useState } from 'react'
import { Game } from '@game/Game'
import { useUiStore } from './stores/uiStore'
import { TitleScreen } from '@ui/screens/TitleScreen'
import { HUD } from '@ui/screens/HUD'
import { BattleScreen } from '@ui/screens/BattleScreen'
import { Tutorial } from '@ui/screens/Tutorial'
import { Keybindings } from './Keybindings'
import { AchievementToast } from '@ui/AchievementToast'
import { PrioritiesPanel } from '@ui/panels/PrioritiesPanel'
import { PerfOverlay } from '@ui/panels/PerfOverlay'

export function App() {
  const canvasHostRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Game | null>(null)
  const screen = useUiStore((s) => s.screen)
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    if (!canvasHostRef.current || gameRef.current) return
    const game = new Game(canvasHostRef.current)
    gameRef.current = game
    game.boot().then(() => setBooting(false))
    return () => {
      game.dispose()
      gameRef.current = null
    }
  }, [])

  return (
    <div className="app-root">
      <div ref={canvasHostRef} className="canvas-host" aria-label="game canvas" />
      <Keybindings />
      {booting && <div className="boot-overlay">Loading Crittermoor…</div>}
      {!booting && screen === 'title' && <TitleScreen onStart={(seed) => gameRef.current?.newGame(seed)} />}
      {!booting && screen === 'colony' && (
        <>
          <HUD />
          <Tutorial />
          <PrioritiesPanel />
        </>
      )}
      {!booting && screen === 'battle' && <BattleScreen />}
      <AchievementToast />
      <PerfOverlay />
    </div>
  )
}
