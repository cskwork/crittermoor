import { Assets, Texture } from 'pixi.js'
import { Terrain } from '@/shared/constants'

const terrainModules = import.meta.glob<string>('/src/assets/sprites/terrain/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
})

const KEY_TO_TERRAIN: Record<string, Terrain> = {
  grass: Terrain.Grass,
  dirt: Terrain.Dirt,
  sand: Terrain.Sand,
  stone: Terrain.Stone,
  mountain: Terrain.Mountain,
  water_shallow: Terrain.WaterShallow,
  water_deep: Terrain.WaterDeep,
  forest: Terrain.Forest,
}

const urlByTerrain = new Map<Terrain, string>()
for (const [path, url] of Object.entries(terrainModules)) {
  const m = path.match(/\/([^/]+)\.svg$/)
  if (!m || !m[1]) continue
  const t = KEY_TO_TERRAIN[m[1]]
  if (t !== undefined) urlByTerrain.set(t, url)
}

const textures = new Map<Terrain, Texture>()
let preloadPromise: Promise<void> | null = null

export function preloadTerrainTextures(): Promise<void> {
  if (preloadPromise) return preloadPromise
  preloadPromise = (async () => {
    const entries = Array.from(urlByTerrain.entries())
    await Promise.all(
      entries.map(async ([terrain, url]) => {
        try {
          const tex = (await Assets.load(url)) as Texture
          textures.set(terrain, tex)
        } catch (err) {
          console.warn(`[terrain] failed to load terrain ${terrain}:`, err)
        }
      }),
    )
  })()
  return preloadPromise
}

export function getTerrainTexture(terrain: Terrain): Texture | null {
  return textures.get(terrain) ?? null
}
