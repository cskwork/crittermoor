import { describe, expect, it } from 'vitest';
import { createRng, hashStringSeed } from '@/shared/rng';
describe('Mulberry32 RNG', () => {
    it('is deterministic given the same seed', () => {
        const a = createRng(12345);
        const b = createRng(12345);
        const seqA = Array.from({ length: 16 }, () => a.next());
        const seqB = Array.from({ length: 16 }, () => b.next());
        expect(seqA).toEqual(seqB);
    });
    it('serializes via state field', () => {
        const a = createRng(99);
        for (let i = 0; i < 50; i++)
            a.next();
        const snap = a.state;
        const next5 = Array.from({ length: 5 }, () => a.next());
        const b = createRng(0);
        b.state = snap;
        expect(Array.from({ length: 5 }, () => b.next())).toEqual(next5);
    });
    it('produces values in [0,1)', () => {
        const r = createRng(7);
        for (let i = 0; i < 200; i++) {
            const v = r.next();
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThan(1);
        }
    });
    it('hashStringSeed is stable', () => {
        expect(hashStringSeed('crittermoor')).toBe(hashStringSeed('crittermoor'));
        expect(hashStringSeed('a')).not.toBe(hashStringSeed('b'));
    });
});
