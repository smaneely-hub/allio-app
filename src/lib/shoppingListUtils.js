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
    .replace(/,\s*(diced|halved|chopped|minced|grated|sliced|shredded|crushed)\b/gi, '')
    .replace(/^grated\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
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
    quantity = fractionToNumber(rawIngredient.quantity ?? rawIngredient.amount ?? 1)
    if (!Number.isFinite(quantity)) quantity = 1
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

  const cleanedName = cleanupIngredientDisplayName(String(name || '')
    .replace(/^[-•*]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim())

  const normalizedName = normalizeIngredientName(cleanedName)
  if (!cleanedName || cleanedName.length < 2) return null
  if (/^(ingredient|ingredients|item|items|see recipe|to serve|optional)$/i.test(cleanedName)) return null
  if (/^[^A-Za-z]+$/.test(cleanedName)) return null

  return {
    source,
    name: cleanedName,
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

      allIngredients.push({
        name: parsed.name,
        normalizedName: parsed.normalizedName,
        quantity: parsed.quantity * servingsScale,
        unit: normalizeUnit(parsed.unit),
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
