// Items dropped on tiles from chop/mine. Wardens haul them to stockpiles.

export enum ItemKind {
  Wood = 1,
  Stone = 2,
  RawFood = 3,
  CookedMeal = 4,
}

export interface ItemDef {
  kind: ItemKind
  name: string
  short: string
  color: number
  // Whether items of this kind are routed into the colony resource pool when
  // dropped into a stockpile. Wood and Stone count; cooked meals don't (they
  // feed pawns directly via the eat behavior, not as a tally).
  poolsAsResource: 'wood' | 'stone' | null
  // Max stack count. New stack picks up where the last left off.
  maxStack: number
}

export const ITEM_DEFS: Record<ItemKind, ItemDef> = {
  [ItemKind.Wood]: { kind: ItemKind.Wood, name: 'Wood', short: 'W', color: 0x9a6f47, poolsAsResource: 'wood', maxStack: 50 },
  [ItemKind.Stone]: { kind: ItemKind.Stone, name: 'Stone', short: 'S', color: 0x9aa6ab, poolsAsResource: 'stone', maxStack: 50 },
  [ItemKind.RawFood]: { kind: ItemKind.RawFood, name: 'Raw food', short: 'R', color: 0xd2b46a, poolsAsResource: null, maxStack: 30 },
  [ItemKind.CookedMeal]: { kind: ItemKind.CookedMeal, name: 'Meal', short: 'M', color: 0xe07a5f, poolsAsResource: null, maxStack: 20 },
}
