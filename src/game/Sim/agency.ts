// Per-warden agency: WorkPriority + Schedule + Draft.
//
// These live on the SimWorld as plain side maps (not bitecs components) so
// adding new work kinds or schedule slots doesn't require schema migrations
// for every save. They are persisted in the save codec alongside other
// per-eid state.

export type WorkKind = 'chop' | 'mine' | 'build' | 'tame' | 'haul'

export const WORK_KINDS: readonly WorkKind[] = ['chop', 'mine', 'build', 'tame', 'haul']

// 0 = disabled. 1-4 = priority, lower number runs first when multiple jobs
// are eligible. Default 3 (medium) for every kind so the legacy "auto" feel
// is preserved until the player opens the Priorities panel.
export const DEFAULT_PRIORITY = 3
export const MIN_PRIORITY = 0
export const MAX_PRIORITY = 4

export type WorkPriority = Record<WorkKind, number>

export enum ScheduleSlot {
  Anything = 0,
  Work = 1,
  Joy = 2,
  Sleep = 3,
}

export const HOURS_PER_DAY = 24

export function defaultPriorities(): WorkPriority {
  return { chop: DEFAULT_PRIORITY, mine: DEFAULT_PRIORITY, build: DEFAULT_PRIORITY, tame: DEFAULT_PRIORITY, haul: DEFAULT_PRIORITY }
}

export function defaultSchedule(): Uint8Array {
  // 22:00-05:59 = Sleep, 06:00-19:59 = Work, 20:00-21:59 = Joy.
  const s = new Uint8Array(HOURS_PER_DAY).fill(ScheduleSlot.Anything)
  for (let h = 0; h < HOURS_PER_DAY; h++) {
    if (h >= 22 || h < 6) s[h] = ScheduleSlot.Sleep
    else if (h < 20) s[h] = ScheduleSlot.Work
    else s[h] = ScheduleSlot.Joy
  }
  return s
}

export function clampPriority(p: number): number {
  if (!Number.isFinite(p)) return DEFAULT_PRIORITY
  return Math.max(MIN_PRIORITY, Math.min(MAX_PRIORITY, Math.floor(p)))
}

export function clampSlot(slot: number): ScheduleSlot {
  if (slot < 0 || slot > 3 || !Number.isFinite(slot)) return ScheduleSlot.Anything
  return slot as ScheduleSlot
}

export interface AgencyState {
  priorities: Map<number, WorkPriority>
  schedules: Map<number, Uint8Array>
  drafted: Set<number>
  draftTargets: Map<number, { tx: number; ty: number }>
}

export function createAgency(): AgencyState {
  return {
    priorities: new Map(),
    schedules: new Map(),
    drafted: new Set(),
    draftTargets: new Map(),
  }
}

export function getPriorities(agency: AgencyState, eid: number): WorkPriority {
  let p = agency.priorities.get(eid)
  if (!p) {
    p = defaultPriorities()
    agency.priorities.set(eid, p)
  }
  return p
}

export function getSchedule(agency: AgencyState, eid: number): Uint8Array {
  let s = agency.schedules.get(eid)
  if (!s) {
    s = defaultSchedule()
    agency.schedules.set(eid, s)
  }
  return s
}

export function setPriority(agency: AgencyState, eid: number, kind: WorkKind, value: number): void {
  const cur = getPriorities(agency, eid)
  cur[kind] = clampPriority(value)
}

export function setSlot(agency: AgencyState, eid: number, hour: number, slot: ScheduleSlot): void {
  if (hour < 0 || hour >= HOURS_PER_DAY) return
  const cur = getSchedule(agency, eid)
  cur[hour] = clampSlot(slot)
}

export function setDrafted(agency: AgencyState, eid: number, drafted: boolean): void {
  if (drafted) agency.drafted.add(eid)
  else {
    agency.drafted.delete(eid)
    agency.draftTargets.delete(eid)
  }
}

export function isDrafted(agency: AgencyState, eid: number): boolean {
  return agency.drafted.has(eid)
}

export function setDraftTarget(agency: AgencyState, eid: number, tx: number, ty: number): void {
  if (!agency.drafted.has(eid)) return
  agency.draftTargets.set(eid, { tx, ty })
}

export function currentSlot(agency: AgencyState, eid: number, simTick: number, dayLengthTicks: number): ScheduleSlot {
  const schedule = getSchedule(agency, eid)
  const hourTicks = dayLengthTicks / HOURS_PER_DAY
  const tickInDay = ((simTick % dayLengthTicks) + dayLengthTicks) % dayLengthTicks
  const hour = Math.min(HOURS_PER_DAY - 1, Math.floor(tickInDay / hourTicks))
  return schedule[hour] as ScheduleSlot
}
