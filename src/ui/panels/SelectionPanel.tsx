import { useEffect, useState } from 'react'
import { hasComponent } from 'bitecs'
import { useUiStore } from '@/app/stores/uiStore'
import {
  Bond,
  CombatStats,
  Critter,
  Faction as FactionComp,
  Health,
  Mind,
  Needs,
  Pawn,
  Skills,
  TilePos,
  Wild,
} from '@/game/Sim/components'
import { Faction } from '@/shared/constants'
import { speciesById } from '@/game/Sim/Critters/species'
import { TYPE_COLOR, TYPE_NAMES } from '@/game/Sim/Critters/types'
import { Behavior } from '@/game/Sim/systems/behavior'
import { traitLabel } from '@/game/Sim/systems/mind'
import { traitById, type TraitId } from '@/game/Sim/Critters/traits'
import { getMove } from '@/game/Sim/Battle/moves'
import type { SimWorld } from '@/game/Sim/world'

interface EntityView {
  eid: number
  kind: 'warden' | 'critter' | 'unknown'
  name: string
  faction: number
  pos: { tx: number; ty: number }
  hp?: { hp: number; maxHp: number }
  needs?: { food: number; rest: number; joy: number; warmth: number }
  mind?: { trait: number; mood: number }
  behavior?: Behavior
  skills?: { construct: number; mine: number; cook: number; plant: number; tame: number; combat: number; medicine: number; craft: number }
  critter?: { speciesId: number; level: number; xp: number; bond: number; wild: boolean }
  bond?: { partnerEid: number; level: number }
  traitId?: TraitId
  combat?: { atk: number; def: number; satk: number; sdef: number; spd: number }
  moves?: readonly string[]
}

const FACTION_NAME: Record<number, string> = {
  [Faction.Player]: 'Player',
  [Faction.Wild]: 'Wild',
  [Faction.Bandit]: 'Bandit',
  [Faction.Neutral]: 'Neutral',
}

export function SelectionPanel() {
  const selectedEid = useUiStore((s) => s.selectedEid)
  const setSelected = useUiStore((s) => s.setSelected)
  const [view, setView] = useState<EntityView | null>(null)

  useEffect(() => {
    if (selectedEid === null) {
      setView(null)
      return
    }
    let raf = 0
    function tick() {
      const sim = (window as unknown as { __crittermoorGame?: { sim?: unknown } }).__crittermoorGame?.sim as
        | { ecs: object }
        | undefined
      if (!sim) return
      const eid = selectedEid as number
      const ecs = sim.ecs
      if (!hasComponent(ecs, TilePos, eid) || !hasComponent(ecs, FactionComp, eid)) {
        setView(null)
        return
      }
      const isCritter = hasComponent(ecs, Critter, eid)
      const speciesId = isCritter ? Critter.speciesId[eid] ?? 0 : 0
      const species = isCritter ? speciesById(speciesId) : null
      const kind: EntityView['kind'] = isCritter ? 'critter' : hasComponent(ecs, Pawn, eid) ? 'warden' : 'unknown'
      const name = isCritter ? species?.name ?? '???' : kind === 'warden' ? `Warden #${eid}` : `Entity #${eid}`
      const next: EntityView = {
        eid,
        kind,
        name,
        faction: FactionComp.id[eid] ?? 0,
        pos: { tx: TilePos.tx[eid] ?? 0, ty: TilePos.ty[eid] ?? 0 },
      }
      if (hasComponent(ecs, Health, eid)) {
        next.hp = { hp: Health.hp[eid] ?? 0, maxHp: Health.maxHp[eid] ?? 0 }
      }
      if (hasComponent(ecs, Needs, eid)) {
        next.needs = {
          food: Needs.food[eid] ?? 0,
          rest: Needs.rest[eid] ?? 0,
          joy: Needs.joy[eid] ?? 0,
          warmth: Needs.warmth[eid] ?? 0,
        }
      }
      if (hasComponent(ecs, Pawn, eid)) next.behavior = Pawn.behavior[eid] as Behavior
      if (hasComponent(ecs, Mind, eid)) {
        next.mind = { trait: Mind.trait[eid] ?? 0, mood: Pawn.mood[eid] ?? 0 }
      }
      if (hasComponent(ecs, Skills, eid)) {
        next.skills = {
          construct: Skills.construct[eid] ?? 0,
          mine: Skills.mine[eid] ?? 0,
          cook: Skills.cook[eid] ?? 0,
          plant: Skills.plant[eid] ?? 0,
          tame: Skills.tame[eid] ?? 0,
          combat: Skills.combat[eid] ?? 0,
          medicine: Skills.medicine[eid] ?? 0,
          craft: Skills.craft[eid] ?? 0,
        }
      }
      if (isCritter) {
        next.critter = {
          speciesId,
          level: Critter.level[eid] ?? 0,
          xp: Critter.xp[eid] ?? 0,
          bond: Critter.bond[eid] ?? 0,
          wild: hasComponent(ecs, Wild, eid),
        }
        const simFull = sim as unknown as SimWorld
        const trait = simFull.traits?.get(eid)
        if (trait) next.traitId = trait
        next.moves = species?.movePool
        if (hasComponent(ecs, CombatStats, eid)) {
          next.combat = {
            atk: CombatStats.atk[eid] ?? 0,
            def: CombatStats.def[eid] ?? 0,
            satk: CombatStats.satk[eid] ?? 0,
            sdef: CombatStats.sdef[eid] ?? 0,
            spd: CombatStats.spd[eid] ?? 0,
          }
        }
      }
      if (hasComponent(ecs, Bond, eid)) {
        next.bond = { partnerEid: Bond.partnerEid[eid] ?? 0, level: Bond.level[eid] ?? 0 }
      }
      setView(next)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [selectedEid])

  if (selectedEid === null || !view) return null

  return (
    <div className="selection-panel panel" role="dialog" aria-label={`Inspector: ${view.name}`}>
      <div className="header">
        <span className="name">{view.name}</span>
        <span className="meta">
          {view.kind} · {FACTION_NAME[view.faction] ?? view.faction} · ({view.pos.tx},{view.pos.ty})
        </span>
        <button className="close" onClick={() => setSelected(null)} aria-label="Close inspector">✕</button>
      </div>

      {view.hp && (
        <div className="row">
          <span className="label">HP</span>
          <Bar value={view.hp.hp} max={view.hp.maxHp} color="#e07a5f" />
          <span className="num">{view.hp.hp}/{view.hp.maxHp}</span>
        </div>
      )}

      {view.needs && (
        <div className="grid">
          <Need label="Food" v={view.needs.food} />
          <Need label="Rest" v={view.needs.rest} />
          <Need label="Joy" v={view.needs.joy} />
          <Need label="Warmth" v={view.needs.warmth} />
        </div>
      )}

      {view.mind && (
        <div className="mind-row">
          <span className="label">Mood</span>
          <Bar value={view.mind.mood + 100} max={200} color={moodColor(view.mind.mood)} />
          <span className="num">{view.mind.mood}</span>
          <span className="trait-chip" title="Personality trait">{traitLabel(view.mind.trait)}</span>
        </div>
      )}

      {view.behavior !== undefined && (
        <div className="behavior">Behavior: <strong>{Behavior[view.behavior]}</strong></div>
      )}

      {view.critter && (() => {
        const species = speciesById(view.critter.speciesId)
        return (
          <div className="critter-row">
            <div className="types">
              {(species?.types ?? []).map((t) => (
                <span key={t} className="chip" style={{ background: `#${TYPE_COLOR[t].toString(16).padStart(6, '0')}` }}>
                  {TYPE_NAMES[t]}
                </span>
              ))}
            </div>
            <span>Lv {view.critter.level}</span>
            <span>XP {view.critter.xp}</span>
            <span>Bond {view.critter.bond}</span>
            {view.critter.wild && <span className="wild">wild</span>}
          </div>
        )
      })()}

      {view.bond && view.bond.partnerEid > 0 && (
        <div className="bond">Bonded to #{view.bond.partnerEid} · level {view.bond.level}</div>
      )}

      {view.traitId && view.traitId !== 'none' && (
        <div className="trait">
          <span className="trait-label">Trait</span>
          <strong>{traitById(view.traitId).label}</strong>
          <span className="trait-desc">{traitById(view.traitId).description}</span>
        </div>
      )}

      {view.combat && (
        <div className="combat-stats">
          <span className="cs"><span className="cs-l">ATK</span>{view.combat.atk}</span>
          <span className="cs"><span className="cs-l">DEF</span>{view.combat.def}</span>
          <span className="cs"><span className="cs-l">sATK</span>{view.combat.satk}</span>
          <span className="cs"><span className="cs-l">sDEF</span>{view.combat.sdef}</span>
          <span className="cs"><span className="cs-l">SPD</span>{view.combat.spd}</span>
        </div>
      )}

      {view.moves && view.moves.length > 0 && (
        <div className="moves-row">
          <span className="moves-label">Moves</span>
          {view.moves.map((mid) => {
            const m = getMove(mid)
            if (!m) return null
            const color = TYPE_COLOR[m.type].toString(16).padStart(6, '0')
            return (
              <span key={mid} className="move-chip" style={{ borderColor: `#${color}` }} title={`${m.name} · ${TYPE_NAMES[m.type]} · pwr ${m.power} · acc ${m.accuracy}%`}>
                {m.name}
              </span>
            )
          })}
        </div>
      )}

      {view.skills && (
        <details className="skills-details">
          <summary>Skills</summary>
          <div className="skill-grid">
            {Object.entries(view.skills).map(([name, v]) => (
              <div key={name} className="skill">
                <span className="skill-name">{name}</span>
                <span className="skill-val">{v}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      <style>{`
        .selection-panel { position:absolute; bottom:46px; left:50%; transform:translateX(-50%); min-width:360px; max-width:520px; padding:12px 14px; display:flex; flex-direction:column; gap:8px; pointer-events:auto; }
        .header { display:flex; align-items:baseline; gap:8px; }
        .header .name { font-weight:600; color:var(--accent); }
        .header .meta { color:var(--text-dim); font-size:11px; flex:1; }
        .header .close { padding:2px 8px; font-size:12px; }
        .row { display:flex; align-items:center; gap:8px; font-size:12px; }
        .row .label { width:42px; color:var(--text-dim); }
        .row .num { color:var(--text-dim); font-size:11px; }
        .grid { display:grid; grid-template-columns: repeat(4, 1fr); gap:6px; }
        .behavior { font-size:12px; color:var(--text-dim); }
        .mind-row { display:flex; align-items:center; gap:8px; font-size:12px; }
        .mind-row .label { width:42px; color:var(--text-dim); }
        .mind-row .num { color:var(--text-dim); font-size:11px; width:30px; text-align:right; }
        .trait-chip { padding:1px 7px; background:#0d1115; border-radius:10px; font-size:10px; color:var(--accent); }
        .critter-row { display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text-dim); }
        .types { display:flex; gap:4px; }
        .chip { padding:0 6px; border-radius:4px; color:#0d1115; font-weight:600; font-size:10px; }
        .wild { color:var(--danger); font-weight:600; }
        .bond { font-size:11px; color:var(--text-dim); }
        .skills-details { font-size:11px; color:var(--text-dim); }
        .skills-details summary { cursor:pointer; }
        .skill-grid { display:grid; grid-template-columns: repeat(4, 1fr); gap:6px; margin-top:6px; }
        .skill { display:flex; justify-content:space-between; padding:2px 6px; background:#0d1115; border-radius:4px; }
        .skill-val { color:var(--accent); }
        .trait { display:flex; gap:6px; align-items:baseline; font-size:11px; }
        .trait-label { color:var(--text-dim); }
        .trait-desc { color:var(--text-dim); }
        .combat-stats { display:flex; gap:8px; font-size:11px; color:var(--text); }
        .combat-stats .cs { background:#0d1115; padding:2px 6px; border-radius:4px; display:flex; gap:4px; align-items:baseline; }
        .combat-stats .cs-l { color:var(--text-dim); font-size:10px; }
        .moves-row { display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
        .moves-label { color:var(--text-dim); font-size:11px; }
        .move-chip { padding:2px 6px; border:1px solid; border-radius:6px; font-size:11px; }
      `}</style>
    </div>
  )
}

function moodColor(mood: number): string {
  if (mood <= -50) return '#e07a5f' // distressed
  if (mood <= -25) return '#f0c674' // stressed
  return '#a8d08d' // content
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="bar"><span style={{ width: `${pct}%`, background: color }} /><style>{`.bar{flex:1;height:6px;background:#1e2630;border-radius:3px;overflow:hidden}.bar>span{display:block;height:100%}`}</style></div>
  )
}

function Need({ label, v }: { label: string; v: number }) {
  return (
    <div className="need">
      <span>{label}</span>
      <Bar value={v} max={100} color={v < 30 ? '#e07a5f' : '#a8d08d'} />
      <span className="num">{v}</span>
      <style>{`.need{display:flex;flex-direction:column;gap:2px;font-size:11px;color:var(--text-dim)}.need .num{text-align:right;color:var(--text)}`}</style>
    </div>
  )
}
