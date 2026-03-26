const adjectivePattern = /\b(fresh|large|small|medium|boneless|skinless)\b/g

const synonymMap = {
  'chicken breast': 'chicken breasts',
  'chicken breastes': 'chicken breasts',
  'scallion': 'green onions',
  'scallions': 'green onions',
  'bell pepper': 'bell peppers',
  'tomatoe': 'tomatoes',
}

const categoryKeywords = {
  produce: ['lettuce', 'spinach', 'broccoli', 'carrot', 'pepper', 'onion', 'garlic', 'tomato', 'avocado', 'potato', 'lemon', 'lime'],
  protein: ['chicken', 'beef', 'turkey', 'tofu', 'salmon', 'egg', 'shrimp', 'beans'],
  dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream'],
  'grains/pantry': ['rice', 'pasta', 'flour', 'oats', 'bread crumbs', 'tortilla', 'quinoa', 'beans'],
  frozen: ['frozen'],
  bakery: ['bread', 'bagel', 'roll', 'bun'],
  condiments: ['oil', 'vinegar', 'mustard', 'ketchup', 'mayo', 'sauce', 'soy'],
}

export function normalizeIngredient(name = '') {
  const cleaned = name
    .toLowerCase()
    .replace(adjectivePattern, '')
    .replace(/\s+/g, ' ')
    .trim()

  return synonymMap[cleaned] || cleaned
}

function parseStaples(staples = '') {
  return staples
    .split(',')
    .map((item) => normalizeIngredient(item))
    .filter(Boolean)
}

function inferCategory(itemName, providedCategory) {
  if (providedCategory) return providedCategory
  const normalized = normalizeIngredient(itemName)

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return category
    }
  }

  return 'other'
}

export function aggregateShoppingList(planData, staples = '') {
  const meals = planData?.meals || []
  const staplesSet = new Set(parseStaples(staples))
  const grouped = new Map()

  meals
    .filter((meal) => !meal.is_leftover)
    .forEach((meal) => {
      ;(meal.ingredients || []).forEach((ingredient) => {
        const normalizedName = normalizeIngredient(ingredient.item)
        if (!normalizedName || staplesSet.has(normalizedName)) return

        const unit = ingredient.unit || ''
        const key = `${normalizedName}::${unit}`
        const current = grouped.get(key) || {
          id: key,
          name: normalizedName,
          quantity: 0,
          unit,
          category: inferCategory(normalizedName, ingredient.category),
          meals: [],
          checked: false,
        }

        current.quantity += Number(ingredient.quantity || 0)
        current.meals = Array.from(new Set([...current.meals, meal.name]))
        grouped.set(key, current)
      })
    })

  return Array.from(grouped.values()).sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category)
    return a.name.localeCompare(b.name)
  })
}
