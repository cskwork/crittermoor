import type { Rng } from '@/shared/rng'
import type { CritterType } from '../Critters/types'
import type { StatusKind } from './moves'

export interface BattleCritter {
  speciesId: number
  level: number
  types: [CritterType, CritterType | null]
  hp: number
  maxHp: number
  atk: number
  def: number
  satk: number
  sdef: number
  spd: number
  moves: readonly string[]
  status: StatusKind | null
  statusTurns: number
}

export type Side = 0 | 1

export interface BattleSide {
  team: BattleCritter[]
  activeSlot: number
  switchesUsed: number
}

export interface BattleState {
  sides: [BattleSide, BattleSide]
  rngState: number
  turn: number
  log: string[]
}

export type BattleAction =
  | { kind: 'move'; moveId: string }
  | { kind: 'switch'; toSlot: number }

export function createBattleState(team0: BattleCritter[], team1: BattleCritter[], rng: Rng): BattleState {
  return {
    sides: [
      { team: team0.map(cloneCritter), activeSlot: 0, switchesUsed: 0 },
      { team: team1.map(cloneCritter), activeSlot: 0, switchesUsed: 0 },
    ],
    rngState: rng.state,
    turn: 0,
    log: [],
  }
}

export function activeOf(state: BattleState, side: Side): BattleCritter {
  const s = state.sides[side]
  return s.team[s.activeSlot]!
}

export function isBattleOver(state: BattleState): { over: boolean; winner: Side | null } {
  const a = state.sides[0].team.every((c) => c.hp <= 0)
  const b = state.sides[1].team.every((c) => c.hp <= 0)
  if (a && b) return { over: true, winner: null }
  if (a) return { over: true, winner: 1 }
  if (b) return { over: true, winner: 0 }
  return { over: false, winner: null }
}

function cloneCritter(c: BattleCritter): BattleCritter {
  return { ...c, types: [c.types[0], c.types[1]] }
}
