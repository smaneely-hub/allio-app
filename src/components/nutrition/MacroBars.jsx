function MacroBar({ label, consumed, target, colorClass }) {
  const safeTarget = Number(target || 0)
  const safeConsumed = Number(consumed || 0)
  const ratio = safeTarget > 0 ? Math.min((safeConsumed / safeTarget) * 100, 100) : 0
  const over = safeTarget > 0 && safeConsumed > safeTarget ? safeConsumed - safeTarget : 0

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-text-primary font-medium">{label}</span>
        <span className="text-text-secondary">{safeConsumed}g / {safeTarget}g{over ? ` (+${over}g)` : ''}</span>
      </div>
      <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${ratio}%` }} />
      </div>
    </div>
  )
}

export function MacroBars({ totals, targets }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm border border-divider space-y-4">
      <h2 className="font-display text-xl text-text-primary">Macros</h2>
      <MacroBar label="Protein" consumed={totals.protein_g} target={targets.protein_g} colorClass="bg-orange-400" />
      <MacroBar label="Carbs" consumed={totals.carbs_g} target={targets.carbs_g} colorClass="bg-teal-400" />
      <MacroBar label="Fat" consumed={totals.fat_g} target={targets.fat_g} colorClass="bg-primary-400" />
    </div>
  )
}
