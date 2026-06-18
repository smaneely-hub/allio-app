function CalorieRing({ consumed, target, size = 148 }) {
  const ratio = target > 0 ? Math.min(consumed / target, 1) : 0
  const over = target > 0 && consumed > target
  const radius = 54
  const trackStroke = 10
  const progressStroke = 10
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - ratio)
  const progressColor = over ? '#EF4444' : '#7B8CF6'

  return (
    <svg width={size} height={size} viewBox="0 0 128 128" aria-hidden="true">
      <circle cx="64" cy="64" r={radius} fill="none" stroke="#F1F5F9" strokeWidth={trackStroke} />
      <circle
        cx="64" cy="64" r={radius}
        fill="none"
        stroke={progressColor}
        strokeWidth={progressStroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 64 64)"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
    </svg>
  )
}

export function TodayProgressCard({ totalCalories, targets }) {
  const consumed = Number(totalCalories || 0)
  const target = Number(targets?.calories || 0)
  const delta = target - consumed
  const over = delta < 0
  const pct = target > 0 ? Math.round(Math.min((consumed / target) * 100, 100)) : 0

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm border border-divider">
      <div className="flex items-center gap-5">
        <div className="relative shrink-0">
          <CalorieRing consumed={consumed} target={target} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-xl leading-none text-text-primary">{pct}%</span>
            <span className="mt-0.5 text-[10px] text-text-muted">of goal</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-xs text-text-muted">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          <div className="mt-1 font-display text-2xl text-text-primary">
            {consumed.toLocaleString()} <span className="text-base font-body font-normal text-text-secondary">kcal</span>
          </div>
          {target > 0 ? (
            <div className={`mt-1 text-sm font-medium ${over ? 'text-red-500' : 'text-text-secondary'}`}>
              {over
                ? `${Math.abs(delta).toLocaleString()} kcal over`
                : `${delta.toLocaleString()} kcal remaining`}
            </div>
          ) : null}
          <div className="mt-1.5 text-xs text-text-muted">
            Target: <span className="text-text-secondary">{target > 0 ? `${target.toLocaleString()} kcal` : '—'}</span>
            {targets?.source && targets.source !== 'default' ? <span className="ml-1.5 text-text-muted">({targets.source})</span> : null}
          </div>
        </div>
      </div>
    </div>
  )
}
