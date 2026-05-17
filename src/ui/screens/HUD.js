import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useUiStore } from '@/app/stores/uiStore';
import { listSaves, saveGame, loadGame } from '@/game/Sim/Saves/store';
const SPEEDS = [0, 1, 2, 4];
const DEFAULT_SLOT = 'autosave';
export function HUD() {
    const speed = useUiStore((s) => s.speed);
    const setSpeed = useUiStore((s) => s.setSpeed);
    const [saves, setSaves] = useState([]);
    const [showLoad, setShowLoad] = useState(false);
    const [status, setStatus] = useState('');
    useEffect(() => {
        if (showLoad)
            listSaves().then(setSaves).catch(() => undefined);
    }, [showLoad]);
    function onSave() {
        const game = window.__crittermoorGame;
        const sim = game?.sim;
        if (!sim) {
            setStatus('No active game.');
            return;
        }
        saveGame(DEFAULT_SLOT, sim)
            .then((meta) => setStatus(`Saved · day ${meta.day} · tick ${meta.tick}`))
            .catch((err) => setStatus(`Save failed: ${String(err)}`));
    }
    function onLoad(slotId) {
        loadGame(slotId)
            .then((sim) => {
            if (!sim) {
                setStatus('Save not found.');
                return;
            }
            const handler = window.__crittermoorApplyLoad;
            if (handler)
                handler(sim);
            setShowLoad(false);
            setStatus(`Loaded · tick ${sim.tick}`);
        })
            .catch((err) => setStatus(`Load failed: ${String(err)}`));
    }
    return (_jsxs("div", { className: "hud", children: [_jsxs("div", { className: "hud-top panel", children: [_jsx("div", { className: "hud-title", children: "Crittermoor" }), _jsx("div", { className: "speed-group", role: "group", "aria-label": "Game speed", children: SPEEDS.map((s) => (_jsx("button", { className: s === speed ? 'active' : '', onClick: () => setSpeed(s), "aria-pressed": s === speed, title: s === 0 ? 'Pause' : `${s}x speed`, children: s === 0 ? '||' : `${s}x` }, s))) }), _jsxs("div", { className: "hud-actions", children: [_jsx("button", { onClick: onSave, children: "Save" }), _jsx("button", { onClick: () => setShowLoad((v) => !v), children: "Load" })] })] }), _jsx("div", { className: "hud-help panel", "aria-label": "Controls help", children: "Left-click forest/stone to designate \u00B7 Right-click to send wardens \u00B7 Middle-drag / Shift-drag to pan \u00B7 Wheel to zoom \u00B7 Space = pause \u00B7 1/2/3 = speed" }), status && _jsx("div", { className: "hud-status panel", children: status }), showLoad && (_jsxs("div", { className: "load-panel panel", role: "dialog", "aria-label": "Load game", children: [_jsx("h3", { children: "Load Game" }), saves.length === 0 && _jsx("p", { className: "empty", children: "No saves yet." }), _jsx("ul", { children: saves.map((s) => (_jsx("li", { children: _jsxs("button", { onClick: () => onLoad(s.slotId), children: [_jsx("strong", { children: s.name }), _jsxs("span", { children: ["\u00B7 day ", s.day] }), _jsxs("span", { children: ["\u00B7 seed ", s.seed] }), _jsxs("span", { children: ["\u00B7 ", new Date(s.savedAt).toLocaleString()] })] }) }, s.slotId))) }), _jsx("button", { onClick: () => setShowLoad(false), children: "Close" })] })), _jsx("style", { children: `
        .hud { position:absolute; inset:0; pointer-events:none; }
        .hud-top { pointer-events:auto; position:absolute; top:12px; left:50%; transform:translateX(-50%);
          display:flex; gap:18px; align-items:center; padding:8px 14px; }
        .hud-title { color:var(--accent); font-weight:600; letter-spacing:0.04em; }
        .speed-group { display:flex; gap:6px; }
        .speed-group button { padding:4px 10px; font-size:13px; min-width:36px; }
        .speed-group button.active { border-color:var(--accent); color:var(--accent); }
        .hud-actions { display:flex; gap:6px; }
        .hud-help { pointer-events:auto; position:absolute; bottom:12px; left:50%; transform:translateX(-50%);
          font-size:12px; color:var(--text-dim); padding:6px 12px; max-width:80%; text-align:center; }
        .hud-status { pointer-events:auto; position:absolute; top:60px; left:50%; transform:translateX(-50%);
          font-size:12px; color:var(--text); padding:6px 12px; }
        .load-panel { pointer-events:auto; position:absolute; top:80px; left:50%; transform:translateX(-50%);
          min-width:380px; max-height:60vh; overflow:auto; padding:16px; }
        .load-panel h3 { margin:0 0 10px; color:var(--accent); }
        .load-panel ul { list-style:none; padding:0; margin:0 0 10px; }
        .load-panel li { margin:6px 0; }
        .load-panel li button { width:100%; text-align:left; padding:8px 10px; display:flex; gap:8px; flex-wrap:wrap; }
        .empty { color:var(--text-dim); }
      ` })] }));
}
