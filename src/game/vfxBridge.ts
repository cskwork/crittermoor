// Bridge from sim-layer code to the renderer's VFX layer.
//
// Sim systems must stay pure (no direct pixi reach), so they call the global
// hook that Game.ts wires up to renderer.spawnVfx. In headless tests the hook
// is undefined and this no-ops.

export type VfxKind = 'chop' | 'mine' | 'build' | 'raid' | 'tame' | 'autosave'

export function spawnVfx(kind: VfxKind, tx: number, ty: number): void {
  if (typeof window === 'undefined') return
  const hook = (window as unknown as { __crittermoorVfx?: (k: VfxKind, x: number, y: number) => void }).__crittermoorVfx
  hook?.(kind, tx, ty)
}
