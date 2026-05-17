import { useEffect } from 'react';
import { useUiStore } from './stores/uiStore';
export function Keybindings() {
    useEffect(() => {
        function onKey(e) {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
                return;
            if (e.code === 'Space') {
                e.preventDefault();
                const cur = useUiStore.getState().speed;
                useUiStore.setState({ speed: cur === 0 ? 1 : 0 });
                return;
            }
            const speeds = { Digit1: 1, Digit2: 2, Digit3: 4 };
            if (speeds[e.code] !== undefined) {
                useUiStore.setState({ speed: speeds[e.code] });
            }
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);
    return null;
}
