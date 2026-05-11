// US volume: values are multipliers relative to tsp
const US_VOLUME = { tsp: 1, tbsp: 3, 'fl oz': 6, cup: 48, pint: 96, quart: 192, gallon: 768 }
// Metric volume: values relative to ml
const METRIC_VOLUME = { ml: 1, l: 1000 }
// US weight: values relative to oz
const US_WEIGHT = { oz: 1, lb: 16 }
// Metric weight: values relative to g
const METRIC_WEIGHT = { g: 1, kg: 1000 }

const FAMILIES = [
  { name: 'us_volume', table: US_VOLUME },
  { name: 'metric_volume', table: METRIC_VOLUME },
  { name: 'us_weight', table: US_WEIGHT },
  { name: 'metric_weight', table: METRIC_WEIGHT },
]

const UNIT_ALIASES = {
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  Tbsp: 'tbsp',
  TBSP: 'tbsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  Tsp: 'tsp',
  TSP: 'tsp',
  cup: 'cup',
  cups: 'cup',
  Cup: 'cup',
  ounce: 'oz',
  ounces: 'oz',
  pound: 'lb',
  pounds: 'lb',
  lbs: 'lb',
  gram: 'g',
  grams: 'g',
  kilogram: 'kg',
  kilograms: 'kg',
  liter: 'l',
  liters: 'l',
  litre: 'l',
  litres: 'l',
  L: 'l',
  milliliter: 'ml',
  milliliters: 'ml',
  mL: 'ml',
  pint: 'pint',
  pints: 'pint',
  pt: 'pint',
  quart: 'quart',
  quarts: 'quart',
  qt: 'quart',
  gallon: 'gallon',
  gallons: 'gallon',
  gal: 'gallon',
  'fluid ounce': 'fl oz',
  'fluid ounces': 'fl oz',
  piece: 'whole',
  pieces: 'whole',
}

/** Normalize a unit string to its canonical form. Empty/missing → 'whole'. */
export function normalizeUnit(unit) {
  if (!unit) return 'whole'
  const trimmed = String(unit).trim()
  if (!trimmed) return 'whole'
  return UNIT_ALIASES[trimmed] ?? trimmed.toLowerCase()
}

function getFamily(normUnit) {
  for (const family of FAMILIES) {
    if (normUnit in family.table) return family
  }
  return { name: normUnit === 'whole' ? 'whole' : `other_${normUnit}`, table: null }
}

function toBase(quantity, normUnit, table) {
  return quantity * (table[normUnit] ?? 1)
}

function getStoredUnitPreference() {
  if (typeof window === 'undefined' || !window.localStorage) return 'imperial'
  return window.localStorage.getItem('allio-unit-preference') === 'metric' ? 'metric' : 'imperial'
}

function getDisplayUnitsForFamily(familyName, preferredSystem) {
  if (familyName === 'us_volume') {
    return preferredSystem === 'metric' ? ['ml', 'l'] : ['tsp', 'tbsp', 'cup', 'pint', 'quart', 'gallon']
  }
  if (familyName === 'metric_volume') {
    return preferredSystem === 'metric' ? ['ml', 'l'] : ['tsp', 'tbsp', 'cup', 'pint', 'quart', 'gallon']
  }
  if (familyName === 'us_weight') {
    return preferredSystem === 'metric' ? ['g', 'kg'] : ['oz', 'lb']
  }
  if (familyName === 'metric_weight') {
    return preferredSystem === 'metric' ? ['g', 'kg'] : ['oz', 'lb']
  }
  return []
}

function convertBetweenFamilies(baseQty, familyName, preferredSystem) {
  if (familyName === 'us_volume' && preferredSystem === 'metric') return { familyName: 'metric_volume', baseQty: baseQty / 0.202884 }
  if (familyName === 'metric_volume' && preferredSystem !== 'metric') return { familyName: 'us_volume', baseQty: baseQty * 0.202884 }
  if (familyName === 'us_weight' && preferredSystem === 'metric') return { familyName: 'metric_weight', baseQty: baseQty / 0.035274 }
  if (familyName === 'metric_weight' && preferredSystem !== 'metric') return { familyName: 'us_weight', baseQty: baseQty * 0.035274 }
  return { familyName, baseQty }
}

function bestDisplay(baseQty, familyName, preferredSystem = getStoredUnitPreference()) {
  const converted = convertBetweenFamilies(baseQty, familyName, preferredSystem)
  const family = FAMILIES.find((entry) => entry.name === converted.familyName)
  const table = family?.table || {}
  const preferredUnits = getDisplayUnitsForFamily(converted.familyName, preferredSystem)
  const entries = preferredUnits.map((unit) => [unit, table[unit]]).filter(([, mult]) => Number.isFinite(mult))

  let bestUnit = null
  let bestMult = 0

  for (const [unit, mult] of entries) {
    const value = converted.baseQty / mult
    if (value >= 1 && mult > bestMult) {
      bestUnit = unit
      bestMult = mult
    }
  }

  if (!bestUnit) {
    if (converted.familyName.endsWith('volume')) {
      if (preferredSystem === 'metric') {
        bestUnit = converted.baseQty >= 1000 ? 'l' : 'ml'
      } else if (converted.baseQty >= 48) {
        bestUnit = 'cup'
      } else if (converted.baseQty >= 3) {
        bestUnit = 'tbsp'
      } else {
        bestUnit = 'tsp'
      }
    } else if (converted.familyName.endsWith('weight')) {
      if (preferredSystem === 'metric') {
        bestUnit = converted.baseQty >= 1000 ? 'kg' : 'g'
      } else {
        bestUnit = converted.baseQty >= 16 ? 'lb' : 'oz'
      }
    } else {
      const [unit] = entries[0] || []
      bestUnit = unit || null
    }
    bestMult = table[bestUnit] || 1
  }

  return { unit: bestUnit, quantity: converted.baseQty / bestMult }
}

function parseFraction(value) {
  const text = String(value ?? '').trim()
  if (!text) return 1
  if (text.includes(' ')) {
    return text.split(/\s+/).reduce((sum, part) => sum + parseFraction(part), 0)
  }
  if (text.includes('/')) {
    const [num, den] = text.split('/').map(Number)
    if (!Number.isNaN(num) && !Number.isNaN(den) && den !== 0) return num / den
  }
  const n = Number(text)
  return Number.isNaN(n) ? NaN : n
}

/**
 * Parse a raw ingredient string or structured object.
 * Returns { quantity: number, unit: string, name: string } or null.
 * unit is a normalized canonical string ('whole' when no unit).
 */
export function parseIngredient(raw) {
  if (!raw) return null

  let quantity = 1
  let unit = 'whole'
  let name = ''

  if (typeof raw === 'object') {
    name = String(raw.item || raw.name || '').trim()
    if (!name) return null
    quantity = parseFraction(raw.amount ?? raw.quantity ?? 1)
    if (!Number.isFinite(quantity) || quantity <= 0) quantity = 1
    unit = normalizeUnit(raw.unit)
  } else {
    const text = String(raw).trim()
    if (!text) return null

    // Try: "<quantity> <unit> <name>" or "<quantity> <name>"
    const match = text.match(
      /^([\d]+(?:[./]\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(.+)$/,
    )
    if (match) {
      const parsedQty = parseFraction(match[1])
      const candidateUnit = normalizeUnit(match[2])
      const family = getFamily(candidateUnit)
      if (family.table || candidateUnit === 'whole') {
        quantity = parsedQty || 1
        unit = candidateUnit
        name = match[3].trim()
      } else {
        quantity = parsedQty || 1
        unit = 'whole'
        name = `${match[2]} ${match[3]}`.trim()
      }
    } else {
      name = text
    }
  }

  if (!name) return null
  return { quantity, unit, name }
}

/**
 * Merge a list of ingredient entries into consolidated line items.
 *
 * Each entry: { name, normalizedName, quantity, unit, category, usageKey }
 * Returns: [{ name, normalizedName, quantity, unit, category, checked, used_in }]
 *
 * Ingredients with the same normalizedName and the same unit sub-family
 * (US volume, metric volume, US weight, metric weight) are converted to a
 * common base and summed. Incompatible families produce separate line items.
 */
export function mergeIngredients(ingredients) {
  const nameGroups = new Map()
  for (const ing of ingredients) {
    const key = ing.normalizedName || String(ing.name).toLowerCase().trim()
    if (!nameGroups.has(key)) nameGroups.set(key, [])
    nameGroups.get(key).push(ing)
  }

  const result = []

  for (const [normalizedName, group] of nameGroups) {
    // Sub-group by unit family (incompatible families stay as separate line items)
    const familyBuckets = new Map()
    for (const item of group) {
      const normUnit = normalizeUnit(item.unit)
      const family = getFamily(normUnit)
      const familyKey = family.name
      if (!familyBuckets.has(familyKey)) {
        familyBuckets.set(familyKey, { family, items: [] })
      }
      familyBuckets.get(familyKey).items.push({ ...item, normUnit })
    }

    for (const { family, items } of familyBuckets.values()) {
      const usedIn = []
      let baseTotal = 0

      for (const item of items) {
        if (item.usageKey && !usedIn.includes(item.usageKey)) usedIn.push(item.usageKey)
        baseTotal += family.table
          ? toBase(item.quantity, item.normUnit, family.table)
          : item.quantity
      }

      let displayUnit
      let displayQty

      if (family.table) {
        const best = bestDisplay(baseTotal, family.name)
        displayUnit = best.unit
        displayQty = best.quantity
      } else {
        // 'whole' or unrecognized — no conversion; display unit is empty for 'whole'
        displayUnit = items[0].normUnit === 'whole' ? '' : items[0].normUnit
        displayQty = baseTotal
      }

      // Prefer the item whose display name exactly matches the normalized name
      const preferred = items.find((item) => String(item.name).toLowerCase().trim() === normalizedName)
      const displayName = preferred ? preferred.name : items[0].name

      result.push({
        name: displayName,
        normalizedName,
        quantity: Math.round(displayQty * 100) / 100,
        unit: displayUnit,
        category: items[0].category,
        checked: false,
        used_in: usedIn,
      })
    }
  }

  return result
}
