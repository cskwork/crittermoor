import { MAX_CATCHUP_TICKS, MS_PER_TICK_1X } from '@/shared/constants';
import { useUiStore } from '@/app/stores/uiStore';
export class TickScheduler {
    sim;
    draw;
    tick;
    running = false;
    accum = 0;
    lastTime = 0;
    rafId = 0;
    constructor(sim, draw, tick) {
        this.sim = sim;
        this.draw = draw;
        this.tick = tick;
    }
    start() {
        if (this.running)
            return;
        this.running = true;
        this.lastTime = performance.now();
        this.tickLoop();
    }
    stop() {
        this.running = false;
        cancelAnimationFrame(this.rafId);
    }
    tickLoop = () => {
        if (!this.running)
            return;
        const now = performance.now();
        const dt = now - this.lastTime;
        this.lastTime = now;
        const speed = useUiStore.getState().speed;
        if (speed > 0) {
            this.accum += dt * speed;
            let ticks = 0;
            while (this.accum >= MS_PER_TICK_1X && ticks < MAX_CATCHUP_TICKS) {
                this.tick(this.sim);
                this.accum -= MS_PER_TICK_1X;
                ticks++;
            }
            if (ticks >= MAX_CATCHUP_TICKS)
                this.accum = 0;
        }
        else {
            this.accum = 0;
        }
        this.draw();
        this.rafId = requestAnimationFrame(this.tickLoop);
    };
}
