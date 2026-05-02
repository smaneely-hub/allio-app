const FRACTIONS = [
  [1 / 8, '1/8'],
  [1 / 6, '1/6'],
  [1 / 5, '1/5'],
  [1 / 4, '1/4'],
  [1 / 3, '1/3'],
  [3 / 8, '3/8'],
  [2 / 5, '2/5'],
  [1 / 2, '1/2'],
  [3 / 5, '3/5'],
  [5 / 8, '5/8'],
  [2 / 3, '2/3'],
  [3 / 4, '3/4'],
  [4 / 5, '4/5'],
  [5 / 6, '5/6'],
  [7 / 8, '7/8'],
]

function decimalToFraction(value) {
  const whole = Math.floor(value)
  const remainder = value - whole
  if (remainder < 0.01) return String(whole)

  let best = FRACTIONS[0]
  let bestDiff = Math.abs(remainder - best[0])
  for (const candidate of FRACTIONS.slice(1)) {
    const diff = Math.abs(remainder - candidate[0])
    if (diff < bestDiff) {
      best = candidate
      bestDiff = diff
    }
  }

  if (bestDiff > 0.04) {
    return Number(value.toFixed(2)).toString()
  }

  return whole > 0 ? `${whole} ${best[1]}` : best[1]
}

export function formatIngredientAmount(amount) {
  if (amount == null) return ''
  const text = String(amount).trim()
  if (!text) return ''
  if (text.includes('/')) return text

  const directNumeric = Number(text)
  if (Number.isFinite(directNumeric)) {
    return decimalToFraction(directNumeric)
  }

  const leadingDecimal = text.match(/^([0-9]*\.?[0-9]+)(\s+.*)?$/)
  if (leadingDecimal) {
    const numeric = Number(leadingDecimal[1])
    if (Number.isFinite(numeric)) {
      const suffix = leadingDecimal[2] || ''
      return `${decimalToFraction(numeric)}${suffix}`.trim()
    }
  }

  return text
}
