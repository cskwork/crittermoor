import { Assets, Texture } from 'pixi.js'

const critterModules = import.meta.glob<string>('/src/assets/sprites/critter/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
})

const wardenModules = import.meta.glob<string>('/src/assets/sprites/warden/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
})

const structureModules = import.meta.glob<string>('/src/assets/sprites/structure/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
})

const WARDEN_TINT_TO_KEY: Record<number, string> = {
  0xe8ece8: 'warden_pale',
  0xa8d08d: 'warden_green',
  0xe07a5f: 'warden_red',
}

export interface SpriteCache {
  textureBySpeciesKey(key: string): Texture | null
  textureForWardenTint(tint: number): Texture | null
  textureForStructureKey(key: string): Texture | null
  preloadAll(): Promise<void>
}

export function createSpriteCache(): SpriteCache {
  const urlByKey = new Map<string, string>()
  for (const [path, url] of Object.entries(critterModules)) {
    const m = path.match(/\/([^/]+)\.svg$/)
    if (m && m[1]) urlByKey.set(m[1], url)
  }
  for (const [path, url] of Object.entries(wardenModules)) {
    const m = path.match(/\/([^/]+)\.svg$/)
    if (m && m[1]) urlByKey.set(m[1], url)
  }
  const structureKeys = new Set<string>()
  for (const [path, url] of Object.entries(structureModules)) {
    const m = path.match(/\/([^/]+)\.svg$/)
    if (m && m[1]) {
      urlByKey.set(`structure_${m[1]}`, url)
      structureKeys.add(m[1])
    }
  }
  void structureKeys
  const textures = new Map<string, Texture>()
  return {
    textureBySpeciesKey(key: string): Texture | null {
      return textures.get(key) ?? null
    },
    textureForWardenTint(tint: number): Texture | null {
      const key = WARDEN_TINT_TO_KEY[tint] ?? 'warden_pale'
      return textures.get(key) ?? textures.get('warden_pale') ?? null
    },
    textureForStructureKey(key: string): Texture | null {
      return textures.get(`structure_${key}`) ?? null
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
