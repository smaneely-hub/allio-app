function formatDateLabel(value) {
  const date = new Date(`${value}T00:00:00`)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function buildPath(points, width, height, min, max) {
  if (!points.length) return ''
  const range = Math.max(max - min, 1)
  return points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width
    const y = height - ((point.value - min) / range) * height
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
  }).join(' ')
}

export function WeightTrendCard({ entries, targetWeightKg, isMetric = false }) {
  const points = entries.map((entry) => ({
    ...entry,
    value: Number(entry.value || 0),
  })).filter((entry) => Number.isFinite(entry.value))

  const convert = (kg) => isMetric ? kg : kg * 2.20462
  const unit = isMetric ? 'kg' : 'lb'
  const convertedPoints = points.map((entry) => ({ ...entry, displayValue: convert(entry.value) }))
  const targetDisplay = targetWeightKg ? convert(Number(targetWeightKg)) : null
  const values = convertedPoints.map((entry) => entry.displayValue)
  if (targetDisplay != null) values.push(targetDisplay)
  const min = values.length ? Math.min(...values) - 1 : 0
  const max = values.length ? Math.max(...values) + 1 : 10
  const width = 320
  const height = 120
  const path = buildPath(convertedPoints.map((entry) => ({ value: entry.displayValue })), width, height, min, max)
  const latest = convertedPoints[convertedPoints.length - 1] || null
  const delta = latest && targetDisplay != null ? (latest.displayValue - targetDisplay) : null

  return (
    <div className="rounded-2xl border border-divider bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="font-display text-lg text-text-primary">Weight trend</h4>
          <p className="mt-1 text-sm text-text-secondary">Track progress toward your target weight over time.</p>
        </div>
        {latest ? (
          <div className="text-right">
            <div className="text-lg font-semibold text-text-primary">{latest.displayValue.toFixed(1)} {unit}</div>
            <div className="text-xs text-text-muted">Latest • {formatDateLabel(latest.recorded_on)}</div>
          </div>
        ) : null}
      </div>

      {convertedPoints.length ? (
        <div className="mt-4">
          <svg viewBox={`0 0 ${width} ${height}`} className="h-32 w-full overflow-visible">
            {targetDisplay != null ? (
              <line
                x1="0"
                x2={width}
                y1={(height - ((targetDisplay - min) / Math.max(max - min, 1)) * height).toFixed(1)}
                y2={(height - ((targetDisplay - min) / Math.max(max - min, 1)) * height).toFixed(1)}
                stroke="#94a3b8"
                strokeDasharray="6 4"
                strokeWidth="2"
              />
            ) : null}
            <path d={path} fill="none" stroke="#14b8a6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {convertedPoints.map((point, index) => {
              const x = convertedPoints.length === 1 ? width / 2 : (index / (convertedPoints.length - 1)) * width
              const y = height - ((point.displayValue - min) / Math.max(max - min, 1)) * height
              return <circle key={point.id} cx={x} cy={y} r="4" fill="#0f766e" />
            })}
          </svg>
          <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
            <span>{convertedPoints[0] ? formatDateLabel(convertedPoints[0].recorded_on) : ''}</span>
            <span>{convertedPoints[convertedPoints.length - 1] ? formatDateLabel(convertedPoints[convertedPoints.length - 1].recorded_on) : ''}</span>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl bg-surface px-4 py-4 text-sm text-text-muted">No weight logs yet. Add your current weight to start a progress chart.</div>
      )}

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        {targetDisplay != null ? <div className="text-text-secondary">Target: <strong className="text-text-primary">{targetDisplay.toFixed(1)} {unit}</strong></div> : null}
        {delta != null ? <div className="text-text-secondary">Difference: <strong className="text-text-primary">{delta > 0 ? '+' : ''}{delta.toFixed(1)} {unit}</strong></div> : null}
      </div>
    </div>
  )
}
