import { describe, expect, it } from 'vitest'
import { aStar } from '@/game/Sim/Pathing/AStar'

function gridFromAscii(rows: string[]): { width: number; height: number; cost: Uint16Array } {
  const height = rows.length
  const width = rows[0]!.length
  const cost = new Uint16Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ch = rows[y]![x]
      cost[y * width + x] = ch === '#' ? 0 : 10
    }
  }
  return { width, height, cost }
}

describe('A* pathfinding', () => {
  it('finds the trivial 0-step path', () => {
    const { width, height, cost } = gridFromAscii(['...', '...'])
    const r = aStar({ width, height, cost, fromX: 0, fromY: 0, toX: 0, toY: 0 })
    expect(r.ok).toBe(true)
    expect(r.nodes.length).toBe(2)
  })

  it('finds a straight path on empty terrain', () => {
    const { width, height, cost } = gridFromAscii(['......', '......', '......'])
    const r = aStar({ width, height, cost, fromX: 0, fromY: 0, toX: 5, toY: 0 })
    expect(r.ok).toBe(true)
    expect(r.nodes.length / 2).toBe(6)
  })

  it('routes around a wall', () => {
    const { width, height, cost } = gridFromAscii([
      '......',
      '.####.',
      '.####.',
      '......',
    ])
    const r = aStar({ width, height, cost, fromX: 0, fromY: 1, toX: 5, toY: 1 })
    expect(r.ok).toBe(true)
    // Must detour around the 4-wide wall; straight distance would be 6 nodes
    expect(r.nodes.length / 2).toBeGreaterThan(6)
  })

  it('returns ok=false when unreachable', () => {
    const { width, height, cost } = gridFromAscii([
      '...#...',
      '...#...',
      '...#...',
    ])
    const r = aStar({ width, height, cost, fromX: 0, fromY: 0, toX: 6, toY: 0 })
    expect(r.ok).toBe(false)
    expect(r.nodes.length).toBe(0)
  })

  it('treats an isolated cell as unreachable (corner-cut prevented)', () => {
    // (0,0) is fenced: right and down are walls, so diagonals cannot slip out either.
    const { width, height, cost } = gridFromAscii([
      '.#.',
      '#..',
      '...',
    ])
    const r = aStar({ width, height, cost, fromX: 0, fromY: 0, toX: 2, toY: 2 })
    expect(r.ok).toBe(false)
  })
})
