import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Game } from '@game/Game';
import { useUiStore } from './stores/uiStore';
import { TitleScreen } from '@ui/screens/TitleScreen';
import { HUD } from '@ui/screens/HUD';
import { BattleScreen } from '@ui/screens/BattleScreen';
import { Keybindings } from './Keybindings';
export function App() {
    const canvasHostRef = useRef(null);
    const gameRef = useRef(null);
    const screen = useUiStore((s) => s.screen);
    const [booting, setBooting] = useState(true);
    useEffect(() => {
        if (!canvasHostRef.current || gameRef.current)
            return;
        const game = new Game(canvasHostRef.current);
        gameRef.current = game;
        game.boot().then(() => setBooting(false));
        return () => {
            game.dispose();
            gameRef.current = null;
        };
    }, []);
    return (_jsxs("div", { className: "app-root", children: [_jsx("div", { ref: canvasHostRef, className: "canvas-host", "aria-label": "game canvas" }), _jsx(Keybindings, {}), booting && _jsx("div", { className: "boot-overlay", children: "Loading Crittermoor\u2026" }), !booting && screen === 'title' && _jsx(TitleScreen, { onStart: (seed) => gameRef.current?.newGame(seed) }), !booting && screen === 'colony' && _jsx(HUD, {}), !booting && screen === 'battle' && _jsx(BattleScreen, {})] }));
}
