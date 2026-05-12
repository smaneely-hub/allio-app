import { flattenRecipeIngredients, flattenRecipeInstructions, normalizeRecipe } from './recipeSchema'

const VALID_FREQUENCIES = ['none', 'daily', 'weekly', 'monthly', 'yearly']
const VALID_END_TYPES = ['never', 'date', 'count']
const VALID_WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const LEGACY_FREQ_MAP = { none: 'none', daily: 'daily', weekdays: 'weekly', weekly: 'weekly', monthly: 'monthly', yearly: 'yearly' }
const LEGACY_WEEKDAY_MAP = { weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'] }

function normalizeRecurrenceField(value) {
  if (!value || typeof value !== 'object') {
    return { frequency: 'none', interval: 1, byWeekday: [], endType: 'never', endDate: null, endCount: null, exdates: [] }
  }

  // Legacy Phase 1: { type: 'daily' } → V2 format
  if (value.type && !value.frequency) {
    const legacyType = String(value.type)
    const frequency = VALID_FREQUENCIES.includes(LEGACY_FREQ_MAP[legacyType]) ? LEGACY_FREQ_MAP[legacyType] : 'none'
    return {
      frequency,
      interval: 1,
      byWeekday: LEGACY_WEEKDAY_MAP[legacyType] || [],
      endType: 'never',
      endDate: null,
      endCount: null,
      exdates: [],
    }
  }

  const frequency = VALID_FREQUENCIES.includes(value.frequency) ? value.frequency : 'none'
  const interval = Math.max(1, Math.floor(Number(value.interval) || 1))
  const byWeekday = Array.isArray(value.byWeekday) ? value.byWeekday.filter((d) => VALID_WEEKDAYS.includes(d)) : []
  const endType = VALID_END_TYPES.includes(value.endType) ? value.endType : 'never'
  const endDate = typeof value.endDate === 'string' ? value.endDate : null
  const endCount = value.endCount != null && Number(value.endCount) >= 1 ? Number(value.endCount) : null
  const exdates = Array.isArray(value.exdates) ? value.exdates.filter((d) => typeof d === 'string') : []

  return { frequency, interval, byWeekday, endType, endDate, endCount, exdates }
}

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
    id: typeof meal.id === 'string' && meal.id ? meal.id : (typeof meal.date === 'string' && meal.date ? `${meal.date}-${safeMeal}` : `${safeDay}-${safeMeal}`),
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
    date: (typeof meal.date === 'string' && meal.date) ? meal.date : (typeof fallback.date === 'string' && fallback.date ? fallback.date : null),
    recurrence: normalizeRecurrenceField(meal.recurrence ?? fallback.recurrence),
    recurring: (() => {
      const rec = normalizeRecurrenceField(meal.recurrence ?? fallback.recurrence)
      return rec.frequency !== 'none'
    })(),
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
