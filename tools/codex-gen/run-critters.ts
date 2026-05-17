// Codex driver: reads assets/_prompts/critters.yaml and asks the codex CLI to write SVG files.
// Run: `tsx tools/codex-gen/run-critters.ts` (requires `codex` CLI on PATH and `tsx`).
// Outputs go to generated/critters/<batch>/ with a manifest.json (provenance).
//
// This is a SCAFFOLD: a human (or Claude in a future session) reviews outputs and promotes
// accepted SVGs into src/assets/sprites/critter/. Promoted assets are rasterized by `asset-pack.ts`.

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createHash } from 'node:crypto'

const ROOT = resolve(import.meta.dirname, '../..')
const PROMPT_FILE = resolve(ROOT, 'assets/_prompts/critters.yaml')
const BATCH_DIR = resolve(ROOT, `generated/critters/${stamp()}`)

function stamp(): string {
  const d = new Date()
  return d.toISOString().replace(/[:.]/g, '-')
}

interface CritterPrompt {
  key: string
  description: string
  palette: string[]
}

function matchGroup(text: string, re: RegExp): string {
  const m = text.match(re)
  return m && m[1] ? m[1] : ''
}

function parsePrompts(): { style: string; critters: CritterPrompt[] } {
  // Tiny YAML reader for our limited schema; swap to `yaml` once asset volume grows.
  const text = readFileSync(PROMPT_FILE, 'utf8')
  const style = matchGroup(text, /style:\s*\|\s*([\s\S]*?)\n\S/).trim()
  const critters: CritterPrompt[] = []
  for (const block of text.split(/\n\s*- key:\s*/).slice(1)) {
    const key = block.split('\n')[0]!.trim()
    const description = matchGroup(block, /description:\s*\|\s*([\s\S]*?)\n\s+palette:/).trim()
    const palette = matchGroup(block, /palette:\s*\[([^\]]+)\]/)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    critters.push({ key, description, palette })
  }
  return { style, critters }
}

interface Manifest {
  batch: string
  promptHash: string
  generatedAt: string
  files: Array<{ key: string; kind: 'idle' | 'portrait'; path: string }>
}

function main(): void {
  const { style, critters } = parsePrompts()
  mkdirSync(BATCH_DIR, { recursive: true })
  const manifest: Manifest = {
    batch: BATCH_DIR.split('/').pop()!,
    promptHash: createHash('sha256').update(readFileSync(PROMPT_FILE)).digest('hex').slice(0, 16),
    generatedAt: new Date().toISOString(),
    files: [],
  }

  for (const c of critters) {
    for (const kind of ['idle', 'portrait'] as const) {
      const size = kind === 'idle' ? 32 : 64
      const out = resolve(BATCH_DIR, `${c.key}_${kind}.svg`)
      mkdirSync(dirname(out), { recursive: true })
      const prompt = `Produce ONLY a valid raw SVG document (no commentary, no markdown fences).\n` +
        `Size: ${size}x${size}, viewBox 0 0 ${size} ${size}, transparent background.\n` +
        `Subject: ${c.description}\n` +
        `Use palette ideas: ${c.palette.join(', ')}.\n` +
        `Style: ${style}\n` +
        `Write the file to ${out} via a single write tool call.`
      console.info(`[codex] generating ${c.key} ${kind} → ${out}`)
      try {
        execFileSync('codex', ['exec', '-s', 'workspace-write', '-C', ROOT, prompt], {
          stdio: 'inherit',
        })
        manifest.files.push({ key: c.key, kind, path: out })
      } catch (err) {
        console.warn(`[codex] failed for ${c.key} ${kind}:`, err)
      }
    }
  }

  writeFileSync(resolve(BATCH_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2))
  console.info(`Batch written to ${BATCH_DIR}`)
}

main()
