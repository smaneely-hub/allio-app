// Stock image URLs for different meal types
const MEAL_IMAGES = {
  // Proteins
  chicken: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800&q=80',
  beef: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800&q=80',
  pork: 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=800&q=80',
  fish: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&q=80',
  salmon: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=80',
  shrimp: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800&q=80',
  tofu: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80',
  
  // Pasta & Italian
  pasta: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80',
  spaghetti: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80',
  lasagna: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=800&q=80',
  pizza: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80',
  
  // Asian
  'stir fry': 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&q=80',
  'fried rice': 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&q=80',
  noodles: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&q=80',
  soup: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=80',
  curry: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800&q=80',
  teriyaki: 'https://images.unsplash.com/photo-1609183480237-ccbb522b47de?w=800&q=80',
  
  // Mexican
  taco: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800&q=80',
  burrito: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&q=80',
  quesadilla: 'https://images.unsplash.com/photo-1618040996337-56904b7850b9?w=800&q=80',
  enchilada: 'https://images.unsplash.com/photo-1534352956036-cd81e27dd615?w=800&q=80',
  
  // Healthy/Salads
  salad: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
  bowl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80',
  sandwich: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=80',
  wrap: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&q=80',
  
  // Comfort
  stew: 'https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=800&q=80',
  casserole: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&q=80',
  
  // Breakfast for dinner
  eggs: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&q=80',
  pancakes: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80',
  'french toast': 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=800&q=80',
  
  // Default
  default: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=800&q=80',
}

// Get image URL based on meal name or type
export function getMealImage(mealName, mealType = 'dinner') {
  if (!mealName) return MEAL_IMAGES.default
  
  const nameLower = mealName.toLowerCase()
  
  // Check for keyword matches
  for (const [keyword, imageUrl] of Object.entries(MEAL_IMAGES)) {
    if (keyword !== 'default' && nameLower.includes(keyword)) {
      return imageUrl
    }
  }
  
  // Return default
  return MEAL_IMAGES.default
}

export function normalizeMealRecord(meal = {}, fallback = {}) {
  const safeDay = typeof (meal.day ?? fallback.day) === 'string' ? String(meal.day ?? fallback.day).trim().toLowerCase() : 'mon'
  const safeMeal = typeof (meal.meal ?? fallback.meal) === 'string' ? String(meal.meal ?? fallback.meal).trim().toLowerCase() : 'dinner'
  const safeName = typeof (meal.name ?? fallback.name) === 'string' && String(meal.name ?? fallback.name).trim()
    ? String(meal.name ?? fallback.name).trim()
    : 'Generated meal'

  const rawIngredients = Array.isArray(meal.ingredients) ? meal.ingredients : []
  const rawInstructions = Array.isArray(meal.instructions) ? meal.instructions : []

  // Get image URL - prefer explicit image, then derive from name
  const imageUrl = meal.image || getMealImage(safeName, safeMeal)

  return {
    id: typeof meal.id === 'string' && meal.id ? meal.id : `${safeDay}-${safeMeal}`,
    day: safeDay || 'mon',
    meal: safeMeal || 'dinner',
    name: safeName,
    image: imageUrl,
    description: typeof meal.description === 'string' ? meal.description : '',
    why_this_meal: typeof meal.why_this_meal === 'string' ? meal.why_this_meal : '',
    notes: typeof meal.notes === 'string' ? meal.notes : '',
    ingredients: rawIngredients.map((ingredient) => {
      if (typeof ingredient === 'string') return ingredient
      if (ingredient && typeof ingredient === 'object') {
        return [ingredient.quantity, ingredient.unit, ingredient.name || ingredient.item].filter(Boolean).join(' ').trim()
      }
      return ''
    }).filter(Boolean),
    instructions: rawInstructions.map((step) => {
      if (typeof step === 'string') return step
      if (step && typeof step === 'object' && typeof step.text === 'string') return step.text
      return ''
    }).filter(Boolean),
    tips: Array.isArray(meal.tips) ? meal.tips.filter(t => typeof t === 'string') : [],
    visual_cues: Array.isArray(meal.visual_cues) ? meal.visual_cues.filter(c => typeof c === 'string') : [],
    common_mistakes: Array.isArray(meal.common_mistakes) ? meal.common_mistakes.filter(m => typeof m === 'string') : [],
    easy_swaps: Array.isArray(meal.easy_swaps) ? meal.easy_swaps.filter(s => typeof s === 'string') : [],
    tags: Array.isArray(meal.tags) ? meal.tags.filter(t => typeof t === 'string') : [],
    prep_time_minutes: Number(meal.prep_time_minutes || 0) || 0,
    cook_time_minutes: Number(meal.cook_time_minutes || 0) || 0,
    servings: Number(meal.servings || 1) || 1,
    locked: Boolean(meal.locked),
    user_note: typeof meal.user_note === 'string' ? meal.user_note : '',
    swapped: Boolean(meal.swapped),
    original_name: typeof meal.original_name === 'string' ? meal.original_name : null,
  }
}

export function normalizeMealPlan(plan = {}, fallbackSlots = []) {
  const meals = Array.isArray(plan.meals) ? plan.meals : []
  return {
    meals: meals.map((meal, index) => normalizeMealRecord(meal, fallbackSlots[index] || fallbackSlots[0] || {})),
  }
}
