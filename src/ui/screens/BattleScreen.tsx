export function BattleScreen() {
  return (
    <div className="battle">
      <div className="panel">Battle scene placeholder — G008.</div>
      <style>{`
        .battle { position:absolute; inset:0; display:grid; place-items:center; pointer-events:none; }
        .battle .panel { pointer-events:auto; }
      `}</style>
    </div>
  )
}
