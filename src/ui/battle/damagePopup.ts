// Pure formatter for damage popup text + color. Live battle juice UI consumes
// this; tests assert it without rendering the React tree.

export interface DamagePopup {
  text: string
  color: 'red' | 'yellow' | 'gray'
}

export function formatDamagePopup(input: { dmg: number; crit: boolean }): DamagePopup {
  if (input.dmg <= 0) return { text: 'miss', color: 'gray' }
  const prefix = `-${input.dmg}`
  if (input.crit) return { text: `${prefix} CRIT!`, color: 'yellow' }
  return { text: prefix, color: 'red' }
}

// Parses the last few BattleSim log lines to extract per-target damage events
// emitted on the most recent turn. Public so unit tests can lock the format.
//
// Log line shape (BattleSim.ts):
//   `side<S> used <Name>: <N> dmg (crit)? (xE)`
// We extract: side, dmg, crit.
const LINE_RE = /^side(\d) used [^:]+: (\d+) dmg(?: \(crit\))?/

export interface ParsedDmgEvent {
  side: 0 | 1
  dmg: number
  crit: boolean
}

export function parseDamageLines(lines: readonly string[]): ParsedDmgEvent[] {
  const out: ParsedDmgEvent[] = []
  for (const line of lines) {
    const m = LINE_RE.exec(line)
    if (!m) continue
    const side = Number(m[1]) === 0 ? 0 : 1
    const dmg = Number(m[2])
    const crit = line.includes('(crit)')
    out.push({ side, dmg, crit })
  }
  return out
}
