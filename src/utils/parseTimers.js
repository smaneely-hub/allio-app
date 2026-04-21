function parseFraction(value) {
  const trimmed = value.trim()
  if (/^\d+\/\d+$/.test(trimmed)) {
    const [num, den] = trimmed.split('/').map(Number)
    return den ? num / den : 0
  }
  if (/^\d+\s+\d+\/\d+$/.test(trimmed)) {
    const [whole, fraction] = trimmed.split(/\s+/)
    return Number(whole) + parseFraction(fraction)
  }
  return Number(trimmed)
}

function unitToSeconds(unit, value) {
  const normalized = unit.toLowerCase()
  if (/^(seconds?|secs?|s)$/.test(normalized)) return Math.round(value)
  if (/^(minutes?|mins?|m)$/.test(normalized)) return Math.round(value * 60)
  if (/^(hours?|hrs?|h)$/.test(normalized)) return Math.round(value * 3600)
  return null
}

function normalizeLabel(label) {
  return label.replace(/\s+/g, ' ').trim()
}

export function formatDuration(seconds) {
  const total = Math.max(0, Math.round(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

export function parseTimers(text) {
  const source = text || ''
  const pattern = /(\b\d+\s+\d+\/\d+|\b\d+\/\d+|\b\d+)(?:\s*(?:-|–|—|to)\s*(\d+\s+\d+\/\d+|\d+\/\d+|\d+))?\s*(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h)\b/gi
  const segments = []
  let lastIndex = 0
  let match

  while ((match = pattern.exec(source)) !== null) {
    const [full, startValueRaw, endValueRaw, unit] = match
    const startIndex = match.index
    if (startIndex > lastIndex) {
      segments.push({ type: 'text', value: source.slice(lastIndex, startIndex) })
    }

    const startValue = parseFraction(startValueRaw)
    const endValue = endValueRaw ? parseFraction(endValueRaw) : null
    const chosenValue = endValue ?? startValue
    const seconds = unitToSeconds(unit, chosenValue)
    const range = endValue
      ? {
          minSeconds: unitToSeconds(unit, startValue),
          maxSeconds: unitToSeconds(unit, endValue),
        }
      : null

    if (seconds != null) {
      segments.push({
        type: 'timer',
        value: full,
        seconds,
        label: normalizeLabel(full),
        range,
      })
    } else {
      segments.push({ type: 'text', value: full })
    }

    lastIndex = startIndex + full.length
  }

  if (lastIndex < source.length) {
    segments.push({ type: 'text', value: source.slice(lastIndex) })
  }

  return segments.length > 0 ? segments : [{ type: 'text', value: source }]
}
