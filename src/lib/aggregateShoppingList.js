// Shopping list aggregation engine

// Normalize ingredient name for grouping
function normalizeName(name) {
  if (!name) return ''
  return name
    .toLowerCase()
    .trim()
    .replace(/^(fresh |large |small |medium |boneless |skinless )+/, '')
}

// Map common synonyms
const synonymMap = {
  'chicken breast': 'chicken breasts',
  'chicken thigh': 'chicken thighs',
  'chicken leg': 'chicken legs',
  'tomatoes': 'tomato',
  'ground turkey': 'ground meat',
  'ground beef': 'ground meat',
  'green onion': 'green onions',
  'scallion': 'green onions',
}

// Map ingredient to category based on keywords
function categorize(item) {
  const name = item.toLowerCase()
  
  const categories = {
    produce: ['apple', 'banana', 'orange', 'lemon', 'lime', 'tomato', 'onion', 'garlic', 'potato', 'carrot', 'broccoli', 'spinach', 'lettuce', 'cucumber', 'pepper', 'celery', 'mushroom', 'avocado', 'cilantro', 'parsley', 'basil', 'ginger', 'berry', 'grape', 'melon', 'mango', 'peach', 'pear', 'cabbage', 'zucchini', 'squash', 'asparagus', 'green bean', 'corn', 'pea', 'leek', 'shallot', 'beet', 'radish', 'arugula', 'kale', 'chard'],
    protein: ['chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'tofu', 'tempeh', 'turkey', 'lamb', 'bacon', 'sausage', 'ham', 'egg', 'steak', 'ground'],
    dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'sour cream', 'cottage', 'parmesan', 'mozzarella', 'cheddar', 'feta', 'ricotta'],
    pantry: ['pasta', 'rice', 'noodle', 'bread', 'flour', 'sugar', 'oil', 'vinegar', 'sauce', 'stock', 'broth', 'can', 'bean', 'lentil', 'chickpea', 'oat', 'cereal', 'honey', 'syrup', 'spice', 'seasoning', 'salt', 'pepper', 'stock', 'broth'],
    frozen: ['frozen', 'ice cream'],
    bakery: ['bread', 'bagel', 'muffin', 'croissant', 'bun', 'roll', 'tortilla'],
  }
  
  for (const [cat, keywords] of Object.entries(categories)) {
    if (keywords.some(kw => name.includes(kw))) {
      return cat
    }
  }
  return 'other'
}

// Main aggregation function
export function aggregateShoppingList(mealPlan, staplesOnHand = '') {
  // Parse staples on hand
  const staples = staplesOnHand
    .toLowerCase()
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  
  // Extract all ingredients from non-leftover meals
  const ingredientUsage = {} // { name: { quantity, unit, category, usages: [] } }
  
  const meals = mealPlan?.meals || mealPlan || []
  
  for (const meal of meals) {
    // Skip leftovers - they don't need shopping
    if (meal.is_leftover || meal.is_leftover === true) continue
    
    const dayMeal = `${meal.day}_${meal.meal}`
    const ingredients = meal.ingredients || []
    
    for (const ing of ingredients) {
      // Skip staples
      if (staples.some(s => ing.item?.toLowerCase().includes(s))) continue
      
      const normalized = normalizeName(ing.item)
      const key = `${normalized}_${ing.unit || 'piece'}`
      
      if (ingredientUsage[key]) {
        ingredientUsage[key].quantity += Number(ing.quantity) || 1
        ingredientUsage[key].usages.push(dayMeal)
      } else {
        ingredientUsage[key] = {
          name: ing.item,
          quantity: Number(ing.quantity) || 1,
          unit: ing.unit || 'piece',
          category: ing.category || categorize(ing.item),
          usages: [dayMeal],
        }
      }
    }
  }
  
  // Convert to array and sort
  const items = Object.values(ingredientUsage).sort((a, b) => {
    // Sort by category first, then alphabetically
    if (a.category !== b.category) {
      const catOrder = ['produce', 'protein', 'dairy', 'pantry', 'frozen', 'bakery', 'other']
      return catOrder.indexOf(a.category) - catOrder.indexOf(b.category)
    }
    return a.name.localeCompare(b.name)
  })
  
  // Format usages for display
  return items.map(item => ({
    ...item,
    used_in: item.usages,
    checked: false,
  }))
}

// Generate plain text share format
export function shareListAsText(items, weekOf = '') {
  const categoryHeaders = {
    produce: 'PRODUCE',
    protein: 'PROTEIN',
    dairy: 'DAIRY',
    pantry: 'PANTRY',
    frozen: 'FROZEN',
    bakery: 'BAKERY',
    other: 'OTHER',
  }
  
  let text = `Allio Shopping List${weekOf ? ` — ${weekOf}` : ''}\n\n`
  
  // Group by category
  const byCategory = {}
  for (const item of items) {
    const cat = item.category || 'other'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(item)
  }
  
  // Output in category order
  const catOrder = ['produce', 'protein', 'dairy', 'pantry', 'frozen', 'bakery', 'other']
  
  for (const cat of catOrder) {
    if (!byCategory[cat]?.length) continue
    
    text += `${categoryHeaders[cat]}\n`
    for (const item of byCategory[cat]) {
      const checked = item.checked ? '[x]' : '[ ]'
      const usages = item.used_in?.map(u => u.replace('_', ' ')).join(', ') || ''
      text += `${checked} ${item.name} — ${item.quantity} ${item.unit}`
      if (usages) text += ` (${usages})`
      text += `\n`
    }
    text += `\n`
  }
  
  return text
}