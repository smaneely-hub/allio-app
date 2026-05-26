import { useMemo, useState } from 'react'

const RANGE_OPTIONS = [
  { label: '1m', days: 30 },
  { label: '3m', days: 90 },
  { label: '6m', days: 180 },
  { label: '1y', days: 365 },
  { label: 'All', days: null },
]

function formatDateLabel(value) {
  const date = new Date(`${value}T00:00:00`)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatLongDateLabel(value) {
  const date = new Date(`${value}T00:00:00`)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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

function getRangeStart(days) {
  if (!days) return null
  const d = new Date()
  d.setDate(d.getDate() - days + 1)
  d.setHours(0, 0, 0, 0)
  return d
}

export function WeightTrendCard({ entries, targetWeightKg, isMetric = false, defaultRangeDays = 90 }) {
  const [rangeDays, setRangeDays] = useState(defaultRangeDays)

  const points = useMemo(() => entries.map((entry) => ({
    ...entry,
    value: Number(entry.value || 0),
  })).filter((entry) => Number.isFinite(entry.value)), [entries])

  const convert = (kg) => isMetric ? kg : kg * 2.20462
  const unit = isMetric ? 'kg' : 'lb'

  const filteredPoints = useMemo(() => {
    const start = getRangeStart(rangeDays)
    if (!start) return points
    return points.filter((entry) => new Date(`${entry.recorded_on}T00:00:00`) >= start)
  }, [points, rangeDays])

  const convertedPoints = filteredPoints.map((entry) => ({ ...entry, displayValue: convert(entry.value) }))
  const targetDisplay = targetWeightKg ? convert(Number(targetWeightKg)) : null
  const values = convertedPoints.map((entry) => entry.displayValue)
  if (targetDisplay != null) values.push(targetDisplay)
  const min = values.length ? Math.min(...values) - 1 : 0
  const max = values.length ? Math.max(...values) + 1 : 10
  const width = 320
  const height = 120
  const path = buildPath(convertedPoints.map((entry) => ({ value: entry.displayValue })), width, height, min, max)
  const latest = convertedPoints[convertedPoints.length - 1] || null
  const first = convertedPoints[0] || null
  const deltaToGoal = latest && targetDisplay != null ? (latest.displayValue - targetDisplay) : null
  const periodChange = latest && first && convertedPoints.length > 1 ? (latest.displayValue - first.displayValue) : null
  const trendDirection = periodChange == null ? null : (periodChange < 0 ? 'down' : periodChange > 0 ? 'up' : 'flat')

  return (
    <div className="rounded-2xl border border-divider bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="font-display text-lg text-text-primary">Weight trend</h4>
          <p className="mt-1 text-sm text-text-secondary">Track your long-term trend with flexible time views and a goal line.</p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl bg-surface p-1">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => setRangeDays(option.days)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${rangeDays === option.days ? 'bg-white text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {latest ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-surface px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-text-muted">Latest</div>
            <div className="mt-1 text-lg font-semibold text-text-primary">{latest.displayValue.toFixed(1)} {unit}</div>
            <div className="text-xs text-text-muted">{formatLongDateLabel(latest.recorded_on)}</div>
          </div>
          <div className="rounded-xl bg-surface px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-text-muted">Period change</div>
            <div className="mt-1 text-lg font-semibold text-text-primary">{periodChange == null ? '—' : `${periodChange > 0 ? '+' : ''}${periodChange.toFixed(1)} ${unit}`}</div>
            <div className="text-xs text-text-muted">{trendDirection === 'down' ? 'Trending down' : trendDirection === 'up' ? 'Trending up' : trendDirection === 'flat' ? 'No net change' : 'Need more logs'}</div>
          </div>
          <div className="rounded-xl bg-surface px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-text-muted">Goal gap</div>
            <div className="mt-1 text-lg font-semibold text-text-primary">{deltaToGoal == null ? '—' : `${deltaToGoal > 0 ? '+' : ''}${deltaToGoal.toFixed(1)} ${unit}`}</div>
            <div className="text-xs text-text-muted">{targetDisplay != null ? `Goal ${targetDisplay.toFixed(1)} ${unit}` : 'No goal set yet'}</div>
          </div>
        </div>
      ) : null}

      {convertedPoints.length ? (
        <div className="mt-4">
          <svg viewBox={`0 0 ${width} ${height}`} className="h-32 w-full overflow-visible">
            {targetDisplay != null ? (
              <>
                <line
                  x1="0"
                  x2={width}
                  y1={(height - ((targetDisplay - min) / Math.max(max - min, 1)) * height).toFixed(1)}
                  y2={(height - ((targetDisplay - min) / Math.max(max - min, 1)) * height).toFixed(1)}
                  stroke="#94a3b8"
                  strokeDasharray="6 4"
                  strokeWidth="2"
                />
                <text x={width - 4} y={(height - ((targetDisplay - min) / Math.max(max - min, 1)) * height - 6).toFixed(1)} textAnchor="end" fontSize="10" fill="#64748b">
                  Goal
                </text>
              </>
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
        <div className="mt-4 rounded-xl bg-surface px-4 py-4 text-sm text-text-muted">No weight logs in this range yet. Try a wider view or add your current weight.</div>
      )}
    </div>
  )
}
