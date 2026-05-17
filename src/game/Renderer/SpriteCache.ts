import { Assets, Texture } from 'pixi.js'

// Vite-resolved URLs for all critter SVGs.
const critterModules = import.meta.glob<string>('/src/assets/sprites/critter/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
})

export interface SpriteCache {
  textureBySpeciesKey(key: string): Texture | null
  preloadAll(): Promise<void>
}

export function createSpriteCache(): SpriteCache {
  const urlByKey = new Map<string, string>()
  for (const [path, url] of Object.entries(critterModules)) {
    const m = path.match(/\/([^/]+)\.svg$/)
    if (m && m[1]) urlByKey.set(m[1], url)
  }
  const textures = new Map<string, Texture>()
  return {
    textureBySpeciesKey(key: string): Texture | null {
      return textures.get(key) ?? null
    },
    async preloadAll(): Promise<void> {
      const entries = Array.from(urlByKey.entries())
      await Promise.all(
        entries.map(async ([key, url]) => {
          try {
            const tex = (await Assets.load(url)) as Texture
            textures.set(key, tex)
          } catch (err) {
            console.warn(`[sprite] failed to load ${key}:`, err)
          }
        }),
      )
    },
  }
}
