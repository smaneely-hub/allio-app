const UNIT_WORDS = new Set([
  'lb', 'lbs', 'pound', 'pounds', 'oz', 'ounce', 'ounces', 'g', 'kg', 'mg',
  'cup', 'cups', 'tbsp', 'tablespoon', 'tablespoons', 'tsp', 'teaspoon', 'teaspoons',
  'clove', 'cloves', 'can', 'cans', 'package', 'packages', 'pkg', 'pkgs',
  'block', 'blocks', 'bunch', 'bunches', 'piece', 'pieces', 'head', 'heads',
  'bag', 'bags', 'loaf', 'loaves', 'jar', 'jars', 'sprig', 'sprigs', 'stalk', 'stalks',
  'slice', 'slices', 'bottle', 'bottles'
])

const CATEGORY_ORDER = ['produce', 'dairy', 'meat', 'pantry', 'frozen', 'bakery', 'other']

const CATEGORY_LABELS = {
  produce: 'Produce',
  dairy: 'Dairy',
  meat: 'Meat',
  pantry: 'Pantry',
  frozen: 'Frozen',
  bakery: 'Bakery',
  other: 'Other',
}

const synonymMap = {
  tomatoes: 'tomato',
  scallion: 'green onions',
  scallions: 'green onions',
  'green onion': 'green onions',
  'chicken breast': 'chicken breasts',
  'chicken thigh': 'chicken thighs',
  'ground turkey': 'ground meat',
  'ground beef': 'ground meat',
}

function fractionToNumber(value = '') {
  const text = String(value).trim()
  if (!text) return 1
  if (text.includes(' ')) {
    return text.split(/\s+/).reduce((sum, part) => sum + fractionToNumber(part), 0)
  }
  if (text.includes('/')) {
    const [num, den] = text.split('/').map(Number)
    if (!Number.isNaN(num) && !Number.isNaN(den) && den) return num / den
  }
  const parsed = Number(text)
  return Number.isNaN(parsed) ? 1 : parsed
}

/** Normalize ingredient names for matching and grouping. */
export function normalizeIngredientName(name = '') {
  const base = String(name)
    .toLowerCase()
    .trim()
    .replace(/^(fresh|large|small|medium|extra[- ]large|boneless|skinless|lean|low[- ]fat)\s+/g, '')
    .replace(/\s+/g, ' ')

  return synonymMap[base] || base
}

/** Map an ingredient name to a shopping aisle category. */
export function categorizeIngredient(name = '') {
  const value = normalizeIngredientName(name)

  if (/(apple|banana|orange|lemon|lime|tomato|onion|garlic|potato|carrot|broccoli|spinach|lettuce|cucumber|pepper|celery|mushroom|avocado|cilantro|parsley|basil|ginger|berry|grape|melon|mango|peach|pear|cabbage|zucchini|squash|asparagus|green bean|corn|pea|leek|shallot|beet|radish|arugula|kale|chard|fruit|herb|cauliflower)/.test(value)) return 'produce'
  if (/(milk|cheese|yogurt|butter|cream|sour cream|cottage cheese|parmesan|mozzarella|cheddar|feta|ricotta|half and half|egg)/.test(value)) return 'dairy'
  if (/(chicken|beef|pork|fish|salmon|tuna|shrimp|tofu|tempeh|turkey|lamb|bacon|sausage|ham|steak|ground meat|ground chicken|ground pork)/.test(value)) return 'meat'
  if (/(bread|bagel|muffin|croissant|bun|roll|tortilla|pita|naan)/.test(value)) return 'bakery'
  if (/(frozen|ice cream|hash brown)/.test(value)) return 'frozen'
  if (/(pasta|rice|noodle|flour|sugar|oil|vinegar|sauce|stock|broth|can|bean|lentil|chickpea|oat|cereal|honey|syrup|spice|seasoning|salt|pepper|mustard|ketchup|mayo|mayonnaise|soy sauce|breadcrumb|quinoa|couscous|tortilla chips|cracker)/.test(value)) return 'pantry'
  return 'other'
}

/** Parse raw ingredient data into a normalized shopping item. */
export function parseIngredient(rawIngredient) {
  const source = typeof rawIngredient === 'string'
    ? rawIngredient.trim()
    : String(rawIngredient?.item || rawIngredient?.name || '').trim()

  if (!source) return null

  let quantity = 1
  let unit = 'piece'
  let name = source

  if (rawIngredient && typeof rawIngredient === 'object' && (rawIngredient.item || rawIngredient.name)) {
    quantity = Number(rawIngredient.quantity) || 1
    unit = rawIngredient.unit || 'piece'
    name = String(rawIngredient.item || rawIngredient.name).trim()
  } else {
    const match = source.match(/^(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)\s+([A-Za-z]+)?\s+(.+)$/)
    if (match) {
      quantity = fractionToNumber(match[1])
      const maybeUnit = (match[2] || '').toLowerCase()
      if (maybeUnit && UNIT_WORDS.has(maybeUnit)) {
        unit = match[2]
        name = match[3].trim()
      } else {
        unit = 'piece'
        name = `${match[2] ? `${match[2]} ` : ''}${match[3]}`.trim()
      }
    }
  }

  return {
    source,
    name,
    normalizedName: normalizeIngredientName(name),
    quantity,
    unit,
    category: categorizeIngredient(name),
  }
}

/** Build grouped shopping items from meals while skipping pantry staples. */
export function buildGroupedShoppingItems(meals = [], staplesOnHand = '') {
  const staples = String(staplesOnHand)
    .toLowerCase()
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  const bucket = new Map()

  for (const meal of meals) {
    if (meal?.is_leftover) continue

    const usageKey = `${meal?.day || 'tonight'}_${meal?.meal || 'dinner'}`

    for (const rawIngredient of meal?.ingredients || []) {
      const parsed = parseIngredient(rawIngredient)
      if (!parsed) continue
      if (staples.some((staple) => parsed.normalizedName.includes(staple))) continue

      const key = `${parsed.normalizedName}::${String(parsed.unit).toLowerCase()}`
      const existing = bucket.get(key)

      if (existing) {
        existing.quantity += parsed.quantity
        if (!existing.used_in.includes(usageKey)) existing.used_in.push(usageKey)
      } else {
        bucket.set(key, {
          name: parsed.name,
          quantity: parsed.quantity,
          unit: parsed.unit,
          category: parsed.category,
          checked: false,
          used_in: [usageKey],
        })
      }
    }
  }

  return Array.from(bucket.values()).sort((a, b) => {
    if (a.category !== b.category) {
      return CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
    }
    return a.name.localeCompare(b.name)
  })
}

/** Sort shopping items by category, checked state, and name. */
export function sortShoppingItems(items = []) {
  return [...items].sort((a, b) => {
    const categoryCompare = CATEGORY_ORDER.indexOf(a.category || 'other') - CATEGORY_ORDER.indexOf(b.category || 'other')
    if (categoryCompare !== 0) return categoryCompare
    const checkedCompare = Number(Boolean(a.checked)) - Number(Boolean(b.checked))
    if (checkedCompare !== 0) return checkedCompare
    return String(a.name || '').localeCompare(String(b.name || ''))
  })
}

/** Group shopping items by their assigned category. */
export function groupItemsByCategory(items = []) {
  return sortShoppingItems(items).reduce((acc, item) => {
    const category = item.category || 'other'
    if (!acc[category]) acc[category] = []
    acc[category].push(item)
    return acc
  }, {})
}

export { CATEGORY_ORDER, CATEGORY_LABELS }
