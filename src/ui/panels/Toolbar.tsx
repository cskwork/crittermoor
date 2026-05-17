import { useUiStore, type ToolMode } from '@/app/stores/uiStore'
import { STRUCTURE_LIST } from '@/game/Sim/Structures/defs'

interface ToolDef {
  id: ToolMode
  label: string
  icon: string
  hotkey?: string
  hint: string
}

const TOOLS: ToolDef[] = [
  { id: 'select', label: 'Select', icon: '◎', hotkey: 'S', hint: 'Click an entity to inspect' },
  { id: 'chop', label: 'Chop', icon: '🌲', hotkey: 'C', hint: 'Click a forest tile' },
  { id: 'mine', label: 'Mine', icon: '⛏', hotkey: 'M', hint: 'Click a stone tile' },
  { id: 'build', label: 'Build', icon: '⌂', hotkey: 'B', hint: 'Pick a structure, then click a tile' },
  { id: 'tame', label: 'Tame', icon: '✦', hotkey: 'T', hint: 'Click a weakened wild critter' },
  { id: 'cancel', label: 'Cancel', icon: '✕', hotkey: 'X', hint: 'Click a designation or blueprint' },
]

export function Toolbar() {
  const toolMode = useUiStore((s) => s.toolMode)
  const setToolMode = useUiStore((s) => s.setToolMode)
  const buildKind = useUiStore((s) => s.buildKind)
  const setBuildKind = useUiStore((s) => s.setBuildKind)
  const active = TOOLS.find((t) => t.id === toolMode)

  return (
    <div className="toolbar" role="toolbar" aria-label="Tool mode">
      <div className="toolbar-rail panel">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={t.id === toolMode ? 'tool active' : 'tool'}
            onClick={() => {
              setToolMode(t.id)
              if (t.id === 'build' && buildKind === 0) setBuildKind(STRUCTURE_LIST[0]!.kind)
            }}
            aria-pressed={t.id === toolMode}
            title={`${t.label} (${t.hotkey})`}
          >
            <span className="tool-icon" aria-hidden>{t.icon}</span>
            <span className="tool-label">{t.label}</span>
            {t.hotkey && <span className="tool-hotkey" aria-hidden>{t.hotkey}</span>}
          </button>
        ))}
      </div>

      {toolMode === 'build' && (
        <div className="build-list panel">
          <div className="build-header">Structures</div>
          {STRUCTURE_LIST.map((def) => (
            <button
              key={def.key}
              className={def.kind === buildKind ? 'struct active' : 'struct'}
              onClick={() => setBuildKind(def.kind)}
              aria-pressed={def.kind === buildKind}
              title={def.description}
            >
              <span className="struct-name">{def.name}</span>
              <span className="struct-cost">
                {def.cost.wood > 0 && <span>W{def.cost.wood}</span>}
                {def.cost.stone > 0 && <span>S{def.cost.stone}</span>}
              </span>
            </button>
          ))}
        </div>
      )}

      {active && <div className="tool-hint panel">{active.hint}</div>}

      <style>{`
        .toolbar { pointer-events:none; position:absolute; top:72px; left:12px; display:flex; flex-direction:column; gap:6px; }
        .toolbar-rail { pointer-events:auto; padding:6px; display:flex; flex-direction:column; gap:4px; min-width:108px; }
        .tool { display:flex; align-items:center; gap:8px; padding:6px 10px; font-size:13px; text-align:left; position:relative; }
        .tool .tool-icon { font-size:16px; width:18px; text-align:center; }
        .tool .tool-label { flex:1; }
        .tool .tool-hotkey { font-size:10px; color:var(--text-dim); }
        .tool.active { border-color:var(--accent); color:var(--accent); background: rgba(168,208,141,0.08); }

        .build-list { pointer-events:auto; padding:6px; display:flex; flex-direction:column; gap:4px; min-width:144px; }
        .build-header { color:var(--accent); font-size:11px; letter-spacing:0.06em; text-transform:uppercase; padding:2px 4px; }
        .struct { display:flex; justify-content:space-between; align-items:center; gap:6px; padding:5px 9px; font-size:12px; }
        .struct.active { border-color:var(--accent); color:var(--accent); background: rgba(168,208,141,0.08); }
        .struct-name { font-weight:500; }
        .struct-cost { font-size:11px; color:var(--text-dim); display:flex; gap:4px; }

        .tool-hint { pointer-events:auto; padding:6px 10px; font-size:11px; color:var(--text-dim); max-width:240px; }
      `}</style>
    </div>
  )
}
