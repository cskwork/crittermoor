import { defineComponent, Types } from 'bitecs'

export const Position = defineComponent({ x: Types.f32, y: Types.f32 })
export const PositionPrev = defineComponent({ x: Types.f32, y: Types.f32 })
export const TilePos = defineComponent({ tx: Types.i16, ty: Types.i16 })
export const Velocity = defineComponent({ vx: Types.f32, vy: Types.f32 })
export const Renderable = defineComponent({ spriteId: Types.ui16, layer: Types.ui8, tint: Types.ui32 })

export const Pawn = defineComponent({ flags: Types.ui8, mood: Types.i8, behavior: Types.ui8 })
export const Needs = defineComponent({ food: Types.ui8, rest: Types.ui8, joy: Types.ui8, warmth: Types.ui8 })
export const Skills = defineComponent({
  construct: Types.ui8,
  mine: Types.ui8,
  cook: Types.ui8,
  plant: Types.ui8,
  tame: Types.ui8,
  combat: Types.ui8,
  medicine: Types.ui8,
  craft: Types.ui8,
})

export const Critter = defineComponent({ speciesId: Types.ui16, level: Types.ui8, xp: Types.ui32, bond: Types.ui8 })
export const Health = defineComponent({ hp: Types.i16, maxHp: Types.i16, downed: Types.ui8 })
export const CombatStats = defineComponent({
  atk: Types.ui8,
  def: Types.ui8,
  satk: Types.ui8,
  sdef: Types.ui8,
  spd: Types.ui8,
})

export const Job = defineComponent({ kind: Types.ui8, targetEid: Types.ui32, state: Types.ui8, progress: Types.ui16 })
export const Faction = defineComponent({ id: Types.ui8 })
export const Bond = defineComponent({ partnerEid: Types.ui32, level: Types.ui8 })
export const Wild = defineComponent({ aggression: Types.ui8, packId: Types.ui16 })

// Path is stored externally keyed by eid (arrays don't fit cleanly in bitecs components)
export const HasPath = defineComponent({ cursor: Types.ui16 })
