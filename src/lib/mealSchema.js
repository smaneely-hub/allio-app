export function normalizeMealRecord(meal = {}, fallback = {}) {
  const safeDay = typeof (meal.day ?? fallback.day) === 'string' ? String(meal.day ?? fallback.day).trim().toLowerCase() : 'mon'
  const safeMeal = typeof (meal.meal ?? fallback.meal) === 'string' ? String(meal.meal ?? fallback.meal).trim().toLowerCase() : 'dinner'
  const safeName = typeof (meal.name ?? fallback.name) === 'string' && String(meal.name ?? fallback.name).trim()
    ? String(meal.name ?? fallback.name).trim()
    : 'Generated meal'

  const rawIngredients = Array.isArray(meal.ingredients) ? meal.ingredients : []
  const rawInstructions = Array.isArray(meal.instructions) ? meal.instructions : []
  const imageUrl = typeof meal.image === 'string' && meal.image.trim() ? meal.image.trim() : null

  return {
    id: typeof meal.id === 'string' && meal.id ? meal.id : `${safeDay}-${safeMeal}`,
    day: safeDay || 'mon',
    meal: safeMeal || 'dinner',
    name: safeName,
    image: imageUrl,
    description: typeof meal.description === 'string' ? meal.description : '',
    reason: typeof meal.reason === 'string' ? meal.reason : '',
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
    tips: Array.isArray(meal.tips) ? meal.tips.filter((tip) => typeof tip === 'string') : [],
    visual_cues: Array.isArray(meal.visual_cues) ? meal.visual_cues.filter((cue) => typeof cue === 'string') : [],
    common_mistakes: Array.isArray(meal.common_mistakes) ? meal.common_mistakes.filter((mistake) => typeof mistake === 'string') : [],
    easy_swaps: Array.isArray(meal.easy_swaps) ? meal.easy_swaps.filter((swap) => typeof swap === 'string') : [],
    tags: Array.isArray(meal.tags) ? meal.tags.filter((tag) => typeof tag === 'string') : [],
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
