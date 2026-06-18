function MacroRing({ consumed, target, color, size = 64 }) {
  const ratio = target > 0 ? Math.min(consumed / target, 1) : 0
  const radius = 26
  const stroke = 6
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - ratio)

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r={radius} fill="none" stroke="#F1F5F9" strokeWidth={stroke} />
      <circle
        cx="32" cy="32" r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 32 32)"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
    </svg>
  )
}

function MacroItem({ label, consumed, target, color, ringColor }) {
  const safeTarget = Number(target || 0)
  const safeConsumed = Number(consumed || 0)
  const ratio = safeTarget > 0 ? Math.min((safeConsumed / safeTarget) * 100, 100) : 0
  const over = safeTarget > 0 && safeConsumed > safeTarget

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <MacroRing consumed={safeConsumed} target={safeTarget} color={ringColor} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-semibold text-text-primary">{Math.round(ratio)}%</span>
        </div>
      </div>
      <div className="text-center">
        <div className={`text-xs font-medium ${color}`}>{label}</div>
        <div className="mt-0.5 text-xs text-text-secondary">
          <span className={over ? 'text-red-500' : ''}>{safeConsumed}g</span>
          <span className="text-text-muted"> / {safeTarget}g</span>
        </div>
      </div>
    </div>
  )
}

function MacroBar({ label, consumed, target, barColorClass }) {
  const safeTarget = Number(target || 0)
  const safeConsumed = Number(consumed || 0)
  const ratio = safeTarget > 0 ? Math.min((safeConsumed / safeTarget) * 100, 100) : 0
  const over = safeTarget > 0 && safeConsumed > safeTarget

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-text-secondary">{label}</span>
        <span className={`text-text-muted ${over ? 'text-red-500' : ''}`}>
          {safeConsumed}g / {safeTarget}g{over ? ` (+${safeConsumed - safeTarget}g)` : ''}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
        <div className={`h-full rounded-full ${over ? 'bg-red-400' : barColorClass}`} style={{ width: `${ratio}%`, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  )
}

export function MacroBars({ totals, targets }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm border border-divider">
      <h2 className="font-display text-xl text-text-primary">Macros</h2>

      <div className="mt-4 flex items-center justify-around">
        <MacroItem
          label="Protein"
          consumed={totals.protein_g}
          target={targets.protein_g}
          color="text-orange-500"
          ringColor="#F97316"
        />
        <MacroItem
          label="Carbs"
          consumed={totals.carbs_g}
          target={targets.carbs_g}
          color="text-teal-600"
          ringColor="#7EDCB5"
        />
        <MacroItem
          label="Fat"
          consumed={totals.fat_g}
          target={targets.fat_g}
          color="text-primary-500"
          ringColor="#7B8CF6"
        />
      </div>

      <div className="mt-5 space-y-3 border-t border-divider pt-4">
        <MacroBar label="Protein" consumed={totals.protein_g} target={targets.protein_g} barColorClass="bg-orange-400" />
        <MacroBar label="Carbs" consumed={totals.carbs_g} target={targets.carbs_g} barColorClass="bg-teal-400" />
        <MacroBar label="Fat" consumed={totals.fat_g} target={targets.fat_g} barColorClass="bg-primary-400" />
      </div>
    </div>
  )
}
