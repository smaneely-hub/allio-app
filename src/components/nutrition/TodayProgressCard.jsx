export function TodayProgressCard({ totalCalories, targets }) {
  const consumed = Number(totalCalories || 0)
  const target = Number(targets?.calories || 0)
  const delta = target - consumed

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm border border-divider">
      <div className="text-sm text-text-secondary">Today</div>
      <div className="mt-1 text-xs text-text-muted">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
      <div className="mt-4 font-display text-3xl text-text-primary">{consumed.toLocaleString()} / {target.toLocaleString()} kcal</div>
      <div className="mt-2 text-sm text-text-secondary">{delta >= 0 ? `${delta.toLocaleString()} kcal left` : `${Math.abs(delta).toLocaleString()} over`}</div>
      <div className="mt-3 text-xs text-text-muted">Target source: {targets?.source || 'default'}</div>
    </div>
  )
}
