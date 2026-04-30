import { flattenRecipeIngredients, flattenRecipeInstructions, normalizeRecipe } from './recipeSchema'

export function normalizeMealRecord(meal = {}, fallback = {}) {
  const safeDay = typeof (meal.day ?? fallback.day) === 'string' ? String(meal.day ?? fallback.day).trim().toLowerCase() : 'mon'
  const safeMeal = typeof (meal.meal ?? fallback.meal) === 'string' ? String(meal.meal ?? fallback.meal).trim().toLowerCase() : 'dinner'
  const mealSource = typeof meal.meal_source === 'string' && meal.meal_source.trim() ? meal.meal_source.trim() : 'generated'
  const sourceLabel = mealSource === 'eat_out' ? 'Eating out' : mealSource === 'takeout' ? 'Takeout' : mealSource === 'delivery' ? 'Delivery' : 'Generated meal'
  const safeName = typeof (meal.name ?? meal.title ?? fallback.name) === 'string' && String(meal.name ?? meal.title ?? fallback.name).trim()
    ? String(meal.name ?? meal.title ?? fallback.name).trim()
    : (typeof meal.place_name === 'string' && meal.place_name.trim() ? meal.place_name.trim() : sourceLabel)

  const imageUrl = typeof meal.image === 'string' && meal.image.trim() ? meal.image.trim() : null
  const recipe = normalizeRecipe({
    ...meal,
    title: meal.title ?? meal.name ?? fallback.name,
    mealType: meal.meal ?? fallback.meal,
  })

  return {
    id: typeof meal.id === 'string' && meal.id ? meal.id : `${safeDay}-${safeMeal}`,
    day: safeDay || 'mon',
    meal: safeMeal || 'dinner',
    meal_source: mealSource,
    source_recipe_id: typeof meal.source_recipe_id === 'string' && meal.source_recipe_id ? meal.source_recipe_id : null,
    place_name: typeof meal.place_name === 'string' && meal.place_name.trim() ? meal.place_name.trim() : null,
    source_note: typeof meal.source_note === 'string' && meal.source_note.trim() ? meal.source_note.trim() : null,
    name: safeName,
    title: recipe.title || safeName,
    slug: recipe.slug,
    image: imageUrl,
    image_url: meal.image_url || imageUrl || null,
    description: recipe.description,
    reason: typeof meal.reason === 'string' ? meal.reason : '',
    why_this_meal: typeof meal.why_this_meal === 'string' ? meal.why_this_meal : '',
    notes: typeof meal.notes === 'string' ? meal.notes : '',
    yield: recipe.yield,
    difficulty: recipe.difficulty,
    ingredientGroups: recipe.ingredientGroups,
    instructionGroups: recipe.instructionGroups,
    ingredients: flattenRecipeIngredients(recipe),
    instructions: flattenRecipeInstructions(recipe),
    tips: recipe.tips,
    substitutions: recipe.substitutions,
    nutrition: recipe.nutrition,
    sourceNote: recipe.sourceNote,
    imagePrompt: recipe.imagePrompt,
    recipeTags: recipe.tags,
    visual_cues: Array.isArray(meal.visual_cues) ? meal.visual_cues.filter((cue) => typeof cue === 'string') : [],
    common_mistakes: Array.isArray(meal.common_mistakes) ? meal.common_mistakes.filter((mistake) => typeof mistake === 'string') : [],
    easy_swaps: Array.isArray(meal.easy_swaps) ? meal.easy_swaps.filter((swap) => typeof swap === 'string') : [],
    tags: Array.isArray(meal.tags) ? meal.tags.filter((tag) => typeof tag === 'string') : [],
    prep_time_minutes: recipe.prepTime,
    cook_time_minutes: recipe.cookTime,
    total_time_minutes: recipe.totalTime,
    servings: Number(meal.servings || recipe.yield.match(/\d+/)?.[0] || 1) || 1,
    locked: Boolean(meal.locked),
    user_note: typeof meal.user_note === 'string' ? meal.user_note : '',
    swapped: Boolean(meal.swapped),
    original_name: typeof meal.original_name === 'string' ? meal.original_name : null,
    created_at: recipe.createdAt,
    updated_at: recipe.updatedAt,
  }
}

export function normalizeMealPlan(plan = {}, fallbackSlots = []) {
  const meals = Array.isArray(plan.meals) ? plan.meals : []
  return {
    meals: meals.map((meal, index) => normalizeMealRecord(meal, fallbackSlots[index] || fallbackSlots[0] || {})),
  }
}
