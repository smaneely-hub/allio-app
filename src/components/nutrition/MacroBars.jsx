const DEFAULT_MEAL_COLORS = ['#7B8CF6', '#F97316', '#14B8A6', '#EC4899', '#F59E0B', '#10B981']
const TRACK_COLOR = '#F1F5F9'

function clampRatio(value) {
  return Math.max(0, Math.min(1, value || 0))
}

function buildContributionSegments(totalValue, entries = [], colorByKey = {}) {
  const safeTotal = Number(totalValue || 0)
  if (!safeTotal || !entries.length) return []

  let cursor = 0
  return entries
    .map((entry) => {
      const value = Math.max(0, Number(entry?.value || 0))
      if (!value) return null
      const ratio = safeTotal > 0 ? value / safeTotal : 0
      const segment = {
        color: colorByKey[entry.key] || '#CBD5E1',
        start: cursor,
        ratio,
      }
      cursor += ratio
      return segment
    })
    .filter(Boolean)
}

function ContributionRing({ consumed, target, segments = [], size = 72, stroke = 8, label }) {
  const safeConsumed = Number(consumed || 0)
  const safeTarget = Number(target || 0)
  const progressRatio = safeTarget > 0 ? clampRatio(safeConsumed / safeTarget) : 0
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const progressLength = circumference * progressRatio
  const center = size / 2
  const over = safeTarget > 0 && safeConsumed > safeTarget

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <circle cx={center} cy={center} r={radius} fill="none" stroke={TRACK_COLOR} strokeWidth={stroke} />
          {segments.length ? segments.map((segment, index) => {
            const dashLength = progressLength * clampRatio(segment.ratio)
            if (dashLength <= 0) return null
            return (
              <circle
                key={`${label}-${index}`}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${dashLength} ${circumference}`}
                strokeDashoffset={-progressLength * clampRatio(segment.start)}
                transform={`rotate(-90 ${center} ${center})`}
              />
            )
          }) : (
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={over ? '#EF4444' : '#7B8CF6'}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${progressLength} ${circumference}`}
              transform={`rotate(-90 ${center} ${center})`}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-semibold text-text-primary">{safeTarget > 0 ? Math.round(progressRatio * 100) : 0}%</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-xs font-medium text-text-primary">{label}</div>
        <div className={`mt-0.5 text-xs ${over ? 'text-red-500' : 'text-text-secondary'}`}>
          {safeConsumed}{label === 'Calories' ? ' kcal' : 'g'}
          {safeTarget > 0 ? <span className="text-text-muted"> / {safeTarget}{label === 'Calories' ? ' kcal' : 'g'}</span> : null}
        </div>
      </div>
    </div>
  )
}

function MealLegend({ legendItems }) {
  if (!legendItems?.length) return null
  return (
    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-divider pt-4">
      {legendItems.map((item) => (
        <div key={item.key} className="flex items-center gap-2 text-xs text-text-secondary">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  )
}

export function MacroBars({ totals, targets, mealContributions = [], title = 'Today’s macros' }) {
  const legendItems = mealContributions.map((meal, index) => ({
    key: meal.key,
    label: meal.label,
    color: meal.color || DEFAULT_MEAL_COLORS[index % DEFAULT_MEAL_COLORS.length],
  }))

  const colorByKey = legendItems.reduce((acc, item) => {
    acc[item.key] = item.color
    return acc
  }, {})

  const caloriesSegments = buildContributionSegments(totals.calories, mealContributions.map((meal) => ({ key: meal.key, value: meal.calories })), colorByKey)
  const proteinSegments = buildContributionSegments(totals.protein_g, mealContributions.map((meal) => ({ key: meal.key, value: meal.protein_g })), colorByKey)
  const carbsSegments = buildContributionSegments(totals.carbs_g, mealContributions.map((meal) => ({ key: meal.key, value: meal.carbs_g })), colorByKey)
  const fatSegments = buildContributionSegments(totals.fat_g, mealContributions.map((meal) => ({ key: meal.key, value: meal.fat_g })), colorByKey)

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm border border-divider">
      <h2 className="font-display text-xl text-text-primary">{title}</h2>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <ContributionRing label="Calories" consumed={totals.calories} target={targets.calories} segments={caloriesSegments} />
        <ContributionRing label="Protein" consumed={totals.protein_g} target={targets.protein_g} segments={proteinSegments} />
        <ContributionRing label="Carbs" consumed={totals.carbs_g} target={targets.carbs_g} segments={carbsSegments} />
        <ContributionRing label="Fat" consumed={totals.fat_g} target={targets.fat_g} segments={fatSegments} />
      </div>

      <MealLegend legendItems={legendItems} />
    </div>
  )
}
