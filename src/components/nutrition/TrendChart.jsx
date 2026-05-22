function buildPath(points, width, height, min, max) {
  if (points.length < 2) return ''
  const range = Math.max(max - min, 1)
  return points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * width
      const y = height - ((p.value - min) / range) * height
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

export function TrendChart({ data = [], color, title, unit = '' }) {
  const points = data.filter((p) => Number.isFinite(p.value))
  const values = points.map((p) => p.value)
  const dataMin = values.length ? Math.min(...values) : 0
  const dataMax = values.length ? Math.max(...values) : 100
  const pad = Math.max((dataMax - dataMin) * 0.15, 5)
  const min = Math.max(0, dataMin - pad)
  const max = dataMax + pad
  const svgW = 320
  const svgH = 56
  const path = buildPath(points, svgW, svgH, min, max)
  const latest = points[points.length - 1]

  const lastCy = latest
    ? (svgH - ((latest.value - min) / Math.max(max - min, 1)) * svgH).toFixed(1)
    : null

  return (
    <div className="rounded-xl border border-divider bg-white p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-text-muted">{title}</span>
        {latest ? (
          <span className="text-sm font-semibold text-text-primary">
            {Math.round(latest.value)}
            <span className="ml-0.5 text-xs font-normal text-text-muted">{unit}</span>
          </span>
        ) : null}
      </div>
      <div className="mt-2">
        {points.length >= 2 ? (
          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="h-12 w-full overflow-visible">
            <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={svgW} cy={lastCy} r="3.5" fill={color} />
          </svg>
        ) : (
          <div className="flex h-12 items-center justify-center text-xs text-text-muted">Not enough data yet</div>
        )}
      </div>
    </div>
  )
}
