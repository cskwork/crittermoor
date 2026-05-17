import { DAY_LENGTH_TICKS } from '@/shared/constants';
export function phaseOf(sim) {
    const t = sim.tick % DAY_LENGTH_TICKS;
    const r = t / DAY_LENGTH_TICKS;
    if (r < 1 / 12)
        return 'dawn'; // 06-08
    if (r < 9 / 12)
        return 'day'; // 08-18 (10h)
    if (r < 10 / 12)
        return 'dusk'; // 18-20
    return 'night'; // 20-06
}
export function dayOf(sim) {
    return Math.floor(sim.tick / DAY_LENGTH_TICKS) + 1;
}
export function system_time(_sim) {
    // placeholder for time-based triggers (weather, raids); cycle is derived from sim.tick.
}
