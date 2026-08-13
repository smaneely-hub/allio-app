import { mergeIngredients, normalizeUnit } from '../utils/unitConversion.js'

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
  'cherry tomatoes': 'tomato',
  scallion: 'green onions',
  scallions: 'green onions',
  'green onion': 'green onions',
  cucumber: 'cucumbers',
  cucumbers: 'cucumbers',
  'persian cucumber': 'cucumbers',
  'persian cucumbers': 'cucumbers',
  'english cucumber': 'cucumbers',
  'english cucumbers': 'cucumbers',
  'baby cucumber': 'cucumbers',
  'baby cucumbers': 'cucumbers',
  jalapeno: 'jalapeño',
  jalapeños: 'jalapeño',
  'pickled jalapeños': 'jalapeño',
  cilantro: 'cilantro',
  chives: 'chives',
  celery: 'celery',
  'celery stalk': 'celery',
  'celery stalks': 'celery',
  cumin: 'cumin',
  'ground cumin': 'cumin',
  paprika: 'paprika',
  'smoked paprika': 'paprika',
  yogurt: 'yogurt',
  'greek yogurt': 'yogurt',
  'plain greek yogurt': 'yogurt',
  sourcream: 'sour cream',
  'sour cream': 'sour cream',
  parmesan: 'parmesan',
  'pecorino romano': 'pecorino romano',
  'chicken breast': 'chicken breasts',
  'chicken thigh': 'chicken thighs',
  'ground turkey': 'ground meat',
  'ground beef': 'ground meat',
}

const COMPOUND_EQUIVALENTS = [
  { pattern: /cream cheese/i, canonical: 'cream cheese' },
  { pattern: /sour cream/i, canonical: 'sour cream' },
  { pattern: /plain greek yogurt|greek yogurt/i, canonical: 'yogurt' },
  { pattern: /pickled jalapeñ?os?|jalapeñ?os?/i, canonical: 'jalapeño' },
  { pattern: /ground cumin|cumin/i, canonical: 'cumin' },
  { pattern: /smoked paprika|paprika/i, canonical: 'paprika' },
  { pattern: /parmesan/i, canonical: 'parmesan' },
  { pattern: /pecorino romano/i, canonical: 'pecorino romano' },
]

const DESCRIPTOR_WORDS = new Set([
  'fresh', 'ripe', 'packed', 'loosely', 'large', 'small', 'medium', 'extra-large', 'extra',
  'boneless', 'skinless', 'lean', 'low-fat', 'room', 'temperature', 'divided', 'additional',
  'grated', 'chopped', 'minced', 'diced', 'sliced', 'shredded', 'crushed', 'peeled', 'seeded',
  'pitted', 'scooped', 'out', 'cut', 'into', 'sticks', 'rounds', 'wedges', 'pieces', 'halved',
  'thinly', 'roughly', 'finely', 'for', 'serving', 'to', 'serve', 'plus', 'more', 'about',
])

const NOUN_HINTS = [
  /\b(avocados?|cilantro|cucumbers?|celery|lemons?|limes?|onions?|garlic|potatoes?|carrots?|broccoli|spinach|lettuce|peppers?|mushrooms?|parsley|basil|ginger|berries|grapes|mangoes?|peaches?|pears?|cabbage|zucchini|squash|asparagus|green beans?|corn|peas?|leeks?|shallots?|beets?|radishes?|arugula|kale|chard|cauliflower)\b/g,
  /\b(eggs?|yolks?|whites?|chicken breasts?|chicken thighs?|ground meat|beef|pork|salmon|tuna|shrimp|tofu|tempeh|turkey|bacon|sausage|ham|steak)\b/g,
  /\b(spaghetti|pasta|rice|noodles?|flour|sugar|oil|vinegar|stock|broth|beans?|lentils?|chickpeas?|oats?|cereal|honey|syrup|salt|pepper|cumin|paprika|cilantro|parmesan|pecorino|cheddar|mozzarella|yogurt|cream cheese|sour cream|cream)\b/g,
]

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
  return Number.isNaN(parsed) ? NaN : parsed
}

function formatQuantity(value) {
  if (!Number.isFinite(value)) return ''
  const rounded = Math.round(value * 100) / 100
  const fractionMap = new Map([
    [0.25, '1/4'],
    [0.33, '1/3'],
    [0.5, '1/2'],
    [0.67, '2/3'],
    [0.75, '3/4'],
  ])
  const whole = Math.trunc(rounded)
  const remainder = Math.round((rounded - whole) * 100) / 100
  if (fractionMap.has(rounded)) return fractionMap.get(rounded)
  if (whole > 0 && fractionMap.has(remainder)) return `${whole} ${fractionMap.get(remainder)}`
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

function cleanupIngredientDisplayName(name = '') {
  return String(name)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/,\s*(packed|loosely packed|room temperature|divided|plus more.*|plus additional.*|for serving|to serve)\b.*$/gi, '')
    .replace(/,\s*(diced|halved|chopped|minced|grated|sliced|shredded|crushed|thinly sliced|roughly chopped|finely chopped|cut into sticks|cut into rounds|cut into wedges|cut into pieces|peeled|seeded|pitted|scooped out)\b.*$/gi, '')
    .replace(/\b(and|or)\s+(thinly sliced|roughly chopped|finely chopped|cut into sticks|cut into rounds|cut into wedges|cut into pieces|peeled|seeded|pitted|scooped out)\b.*$/gi, '')
    .replace(/\binto\s+(rounds|sticks|wedges|pieces)\b.*$/gi, '')
    .replace(/^grated\s+/i, '')
    .replace(/^(fresh|ripe|packed)\s+/i, '')
    .replace(/\s+/g, ' ')
    .replace(/[;,]+$/g, '')
    .trim()
}

function canonicalizeIngredientBase(name = '') {
  const cleaned = cleanupIngredientDisplayName(name)
  const lowered = cleaned.toLowerCase()

  for (const rule of COMPOUND_EQUIVALENTS) {
    if (rule.pattern.test(lowered)) return rule.canonical
  }

  for (const pattern of NOUN_HINTS) {
    const matches = [...lowered.matchAll(pattern)].map((match) => match[1] || match[0]).filter(Boolean)
    if (matches.length > 0) {
      const selected = matches[matches.length - 1].trim()
      return synonymMap[selected] || selected
    }
  }

  const tokens = lowered
    .split(/\s+/)
    .map((token) => token.replace(/^[^a-z]+|[^a-z]+$/g, ''))
    .filter(Boolean)
    .filter((token) => !DESCRIPTOR_WORDS.has(token))

  const fallback = tokens.slice(-2).join(' ') || lowered
  return synonymMap[fallback] || synonymMap[tokens.at(-1)] || fallback
}

function shouldHideUnit(unit = '', quantity = null) {
  const normalized = String(unit || '').trim().toLowerCase()
  if (!normalized) return true
  if (normalized === 'piece' || normalized === 'pieces') return true
  if ((normalized === 'medium' || normalized === 'large' || normalized === 'small') && Number.isFinite(quantity)) return true
  return false
}

/** Normalize ingredient names for matching and grouping. */
export function normalizeIngredientName(name = '') {
  return canonicalizeIngredientBase(name)
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
    quantity = fractionToNumber(rawIngredient.quantity ?? rawIngredient.amount ?? 1)
    if (!Number.isFinite(quantity)) quantity = 1
    unit = rawIngredient.unit || 'piece'
    name = String(rawIngredient.item || rawIngredient.name).trim()
  } else {
    const match = source.match(/^((?:\d+(?:\.\d+)?)|(?:\d+\/\d+)|(?:\d+\s+\d+\/\d+))\s+([A-Za-z]+)?\s+(.+)$/)
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

  const cleanedName = cleanupIngredientDisplayName(String(name || '')
    .replace(/^[-•*]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim())

  const normalizedName = normalizeIngredientName(cleanedName)
  const displayName = synonymMap[normalizedName] ? synonymMap[normalizedName] : cleanedName
  if (!cleanedName || cleanedName.length < 2) return null
  if (/^(ingredient|ingredients|item|items|see recipe|to serve|optional)$/i.test(cleanedName)) return null
  if (/^[^A-Za-z]+$/.test(cleanedName)) return null

  return {
    source,
    name: displayName,
    normalizedName,
    quantity,
    quantityText: formatQuantity(quantity),
    unit,
    category: categorizeIngredient(cleanedName),
  }
}

/** Build grouped shopping items from meals while skipping pantry staples. */
function unwrapMealIngredients(meal = {}) {
  // Prefer structured groups — quantity is preserved as a separate numeric field,
  // avoiding the string-parsing path that drops quantity for unit-less items like "2 eggs".
  if (Array.isArray(meal.ingredientGroups) && meal.ingredientGroups.length > 0) {
    const items = meal.ingredientGroups.flatMap((group) => Array.isArray(group?.ingredients) ? group.ingredients : [])
    if (items.length > 0) return items
  }
  if (Array.isArray(meal.ingredients) && meal.ingredients.length > 0) return meal.ingredients
  return []
}

function getMealServingsScale(meal = {}) {
  const plannedServings = Math.max(1, Number(meal?.servings || 1) || 1)
  const recipeServings = Math.max(
    1,
    Number(meal?.recipe_servings || String(meal?.yield || '').match(/\d+/)?.[0] || meal?.servings || 1) || 1,
  )
  return plannedServings / recipeServings
}

export function buildGroupedShoppingItems(meals = [], staplesOnHand = '') {
  const staples = String(staplesOnHand)
    .toLowerCase()
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  const allIngredients = []

  for (const meal of meals) {
    if (meal?.is_leftover) continue

    const usageKey = `${meal?.day || 'tonight'}_${meal?.meal || 'dinner'}`
    const servingsScale = getMealServingsScale(meal)

    for (const rawIngredient of unwrapMealIngredients(meal)) {
      const parsed = parseIngredient(rawIngredient)
      if (!parsed) continue
      if (staples.some((staple) => parsed.normalizedName.includes(staple))) continue

      const normalizedUnit = normalizeUnit(parsed.unit)
      allIngredients.push({
        name: parsed.name,
        normalizedName: parsed.normalizedName,
        quantity: parsed.quantity * servingsScale,
        unit: shouldHideUnit(normalizedUnit, parsed.quantity) ? '' : normalizedUnit,
        category: parsed.category,
        usageKey,
      })
    }
  }

  return mergeIngredients(allIngredients).sort((a, b) => {
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
