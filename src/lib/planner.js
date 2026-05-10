import { normalizeRecipe } from './recipeSchema'

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_SHORT = {
  Monday: 'mon',
  Tuesday: 'tue',
  Wednesday: 'wed',
  Thursday: 'thu',
  Friday: 'fri',
  Saturday: 'sat',
  Sunday: 'sun',
}
const DAY_FROM_SHORT = Object.fromEntries(Object.entries(DAY_SHORT).map(([full, short]) => [short, full]))

export const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack']

export function getStartOfWeek(date = new Date()) {
  const next = new Date(date)
  const day = next.getDay()
  const diff = day === 0 ? -6 : 1 - day
  next.setDate(next.getDate() + diff)
  next.setHours(0, 0, 0, 0)
  return next
}

export function addDays(date, amount) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

export function formatIsoLocalDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseIsoLocalDate(value) {
  const text = String(value || '').trim()
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  date.setHours(0, 0, 0, 0)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDayLabel(date, today = new Date()) {
  const isToday = date.toDateString() === today.toDateString()
  const base = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return isToday ? `Today, ${base}` : `${date.toLocaleDateString('en-US', { weekday: 'long' })}, ${base}`
}

export function formatWeekLabel(weekStart) {
  const weekEnd = addDays(weekStart, 6)
  const start = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const end = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `This Week, ${start} – ${end}`
}

export function normalizeMealSlotName(value = '') {
  const normalized = String(value).trim().toLowerCase().replace(/\s+/g, '_')
  if (normalized === 'breakfast') return 'breakfast'
  if (normalized === 'lunch') return 'lunch'
  if (normalized === 'dinner') return 'dinner'
  if (normalized === 'snack') return 'snack'
  return normalized || 'dinner'
}

export function normalizeDayName(value = '') {
  const raw = String(value).trim()
  if (DAY_ORDER.includes(raw)) return raw

  const lower = raw.toLowerCase()
  const short = lower.slice(0, 3)
  return DAY_FROM_SHORT[short] || 'Monday'
}

export function getDateForDayName(weekStart, dayName) {
  const index = DAY_ORDER.indexOf(normalizeDayName(dayName))
  return addDays(weekStart, Math.max(index, 0))
}

export function getMealItemCalories(item = {}) {
  return Number(item.calories || item.kcal || item.nutrition?.calories || 0) || 0
}

export function getMealCalories(meal = {}) {
  if (Number(meal.calories)) return Number(meal.calories)
  if (Array.isArray(meal.items) && meal.items.length > 0) {
    return meal.items.reduce((sum, item) => sum + getMealItemCalories(item), 0)
  }
  return 0
}

export function getMealMacros(meal = {}) {
  const base = meal.nutrition || {}
  const items = Array.isArray(meal.items) ? meal.items : []

  if (items.length > 0) {
    return items.reduce(
      (acc, item) => ({
        carbs: acc.carbs + (Number(item.carbs || item.nutrition?.carbs || 0) || 0),
        fat: acc.fat + (Number(item.fat || item.nutrition?.fat || 0) || 0),
        protein: acc.protein + (Number(item.protein || item.nutrition?.protein || 0) || 0),
      }),
      { carbs: 0, fat: 0, protein: 0 },
    )
  }

  return {
    carbs: Number(meal.carbs || base.carbs || 0) || 0,
    fat: Number(meal.fat || base.fat || 0) || 0,
    protein: Number(meal.protein || base.protein || 0) || 0,
  }
}

export function normalizeIngredient(ingredient = {}, index = 0) {
  return {
    id: ingredient.id || `ingredient-${index}`,
    name: ingredient.name || ingredient.item || 'Ingredient',
    descriptor: ingredient.descriptor || ingredient.note || '',
    quantity: ingredient.quantity ?? '',
    unit: ingredient.unit || '',
    grams: ingredient.grams ?? ingredient.gram_amount ?? null,
    image_url: ingredient.image_url || ingredient.image || null,
  }
}

export function normalizeMealItems(meal = {}) {
  if (Array.isArray(meal.items) && meal.items.length > 0) {
    return meal.items.map((item, index) => ({
      id: item.id || `${meal.id || meal.name || 'meal'}-item-${index}`,
      title: item.title || item.name || meal.name || 'Meal item',
      subtitle: item.subtitle || item.brand || item.descriptor || '',
      amount: item.amount || item.serving_amount || item.serving || '',
      calories: getMealItemCalories(item),
      image_url: item.image_url || item.image || meal.image_url || null,
      descriptor: item.descriptor || '',
      nutrition: {
        carbs: Number(item.carbs || item.nutrition?.carbs || 0) || 0,
        fat: Number(item.fat || item.nutrition?.fat || 0) || 0,
        protein: Number(item.protein || item.nutrition?.protein || 0) || 0,
      },
    }))
  }

  return [{
    id: meal.id || `${meal.day || 'day'}-${meal.meal || 'meal'}`,
    title: meal.name || 'Meal',
    subtitle: meal.why_this_works || meal.notes || '',
    amount: meal.amount_to_eat || `${meal.servings || 1} serving${meal.servings === 1 ? '' : 's'}`,
    calories: getMealCalories(meal),
    image_url: meal.image_url || null,
    descriptor: meal.notes || '',
    nutrition: getMealMacros(meal),
  }]
}

function flattenMealIngredients(recipe) {
  return recipe.ingredientGroups.flatMap((group, groupIndex) =>
    group.ingredients.map((ingredient, index) => ({
      id: `${groupIndex}-${index}-${ingredient.item || 'ingredient'}`,
      name: ingredient.item || 'Ingredient',
      descriptor: ingredient.note || '',
      quantity: ingredient.amount || '',
      unit: ingredient.unit || '',
      grams: null,
      image_url: null,
    })),
  )
}

function flattenMealDirections(recipe) {
  return recipe.instructionGroups.flatMap((group) =>
    group.steps.map((step) => ({ text: step.text, tip: step.tip || '' })),
  )
}

export function normalizeMeal(meal = {}, weekStart = getStartOfWeek()) {
  const slot = normalizeMealSlotName(meal.meal || meal.meal_type || meal.slot || '')
  const existingDate = meal?.date ? parseIsoLocalDate(meal.date) : null
  const hasStoredDate = existingDate && !Number.isNaN(existingDate.getTime())
  if (hasStoredDate) existingDate.setHours(0, 0, 0, 0)
  const derivedDayName = hasStoredDate
    ? normalizeDayName(existingDate.toLocaleDateString('en-US', { weekday: 'long' }))
    : normalizeDayName(meal.day)
  const dayName = derivedDayName
  const mealDate = hasStoredDate ? existingDate : getDateForDayName(weekStart, dayName)
  const recipe = normalizeRecipe({
    ...meal,
    title: meal.title || meal.name,
    prepTime: meal.prep_time_minutes,
    cookTime: meal.cook_time_minutes,
    totalTime: meal.total_time_minutes,
    ingredientGroups: meal.ingredientGroups,
    instructionGroups: meal.instructionGroups,
    ingredients: meal.ingredients,
    instructions: meal.instructions,
    nutrition: meal.nutrition,
  })
  const items = normalizeMealItems({ ...meal, nutrition: meal.nutrition || recipe.nutrition })
  const macros = recipe.nutrition || getMealMacros(meal)
  const calories = getMealCalories({ ...meal, nutrition: recipe.nutrition || meal.nutrition }) || recipe.nutrition?.calories || 0

  return {
    ...meal,
    id: meal.id || `${formatIsoLocalDate(mealDate)}-${slot}`,
    day: DAY_SHORT[dayName],
    day_name: dayName,
    date: formatIsoLocalDate(mealDate),
    meal: slot,
    slot,
    title: recipe.title || meal.title || meal.name || 'Meal',
    image_url: meal.image_url || items[0]?.image_url || null,
    amount_to_eat: meal.amount_to_eat || 1,
    amount_unit: meal.amount_unit || 'serving',
    servings: Number(meal.servings || meal.recipe_servings || 1) || 1,
    prep_time_minutes: recipe.prepTime || Number(meal.prep_time_minutes || 0) || 0,
    cook_time_minutes: recipe.cookTime || Number(meal.cook_time_minutes || 0) || 0,
    calories,
    nutrition: macros,
    difficulty: recipe.difficulty,
    description: recipe.description,
    ingredientGroups: recipe.ingredientGroups,
    instructionGroups: recipe.instructionGroups,
    items,
    ingredients: flattenMealIngredients(recipe),
    directions: Array.isArray(meal.directions) && meal.directions.length > 0
      ? meal.directions
      : flattenMealDirections(recipe),
    notes: meal.notes || '',
    user_note: meal.user_note || '',
    locked: Boolean(meal.locked),
    recurring: Boolean(meal.recurring),
    recurrence: meal.recurrence || { type: 'none' },
    source_meal_id: meal.source_meal_id || null,
    isGenerated: true,
  }
}

export function buildPlannerDays({ start = new Date(), count = 7, meals = [], dayNotes = {} } = {}) {
  const windowStart = new Date(start)
  windowStart.setHours(0, 0, 0, 0)

  // Trust the meal's stored slot/date instead of remapping it against the
  // current visible window. Remapping against windowStart can move a correctly
  // saved Friday meal onto a different visible day.
  const normalizedMeals = meals.map((meal) => {
    const normalized = normalizeMeal(meal, windowStart)
    const storedDate = parseIsoLocalDate(meal?.date)

    if (storedDate && !Number.isNaN(storedDate.getTime())) {
      storedDate.setHours(0, 0, 0, 0)
      const storedDayName = normalizeDayName(storedDate.toLocaleDateString('en-US', { weekday: 'long' }))
      return {
        ...normalized,
        day: DAY_SHORT[storedDayName],
        day_name: storedDayName,
        date: formatIsoLocalDate(storedDate),
      }
    }

    return normalized
  })

  const expandedMeals = expandRecurringMeals(normalizedMeals, windowStart, count)

  return Array.from({ length: count }, (_, index) => {
    const date = addDays(windowStart, index)
    const dayName = normalizeDayName(date.toLocaleDateString('en-US', { weekday: 'long' }))
    const short = DAY_SHORT[dayName]
    const dayDateStr = formatIsoLocalDate(date)
    const mealsForDay = expandedMeals.filter((meal) =>
      meal.date ? meal.date === dayDateStr : meal.day === short
    )
    const mealGroups = MEAL_SLOTS.map((slot) => {
      const slotMeals = mealsForDay.filter((meal) => meal.slot === slot)
      return {
        slot,
        label: slot.charAt(0).toUpperCase() + slot.slice(1),
        calories: slotMeals.reduce((sum, meal) => sum + getMealCalories(meal), 0),
        meals: slotMeals,
      }
    })

    const totalCalories = mealsForDay.reduce((sum, meal) => sum + getMealCalories(meal), 0)
    const nutrition = mealsForDay.reduce(
      (acc, meal) => ({
        carbs: acc.carbs + (meal.nutrition?.carbs || 0),
        fat: acc.fat + (meal.nutrition?.fat || 0),
        protein: acc.protein + (meal.nutrition?.protein || 0),
      }),
      { carbs: 0, fat: 0, protein: 0 },
    )

    const displayDayName = date.toLocaleDateString('en-US', { weekday: 'long' })

    return {
      key: short,
      dayName: displayDayName,
      shortLabel: displayDayName.slice(0, 3),
      date,
      dateLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      notes: dayNotes?.[short] || dayNotes?.[dayName] || '',
      mealGroups,
      meals: mealsForDay,
      totalCalories,
      nutrition,
      plannedMealSlots: mealGroups.filter((group) => group.meals.length > 0).length,
      totalMealSlots: MEAL_SLOTS.length,
      isPlanned: mealsForDay.length > 0,
    }
  })
}

export function buildPlannerWeek({ weekStart = new Date(), meals = [], dayNotes = {} } = {}) {
  return buildPlannerDays({ start: getStartOfWeek(weekStart), count: 7, meals, dayNotes })
}

// ── Recurrence expansion ─────────────────────────────────────────────────────

const RECURRENCE_TYPES = ['none', 'daily', 'weekdays', 'weekly', 'monthly', 'yearly']

export function normalizeRecurrenceType(value) {
  return RECURRENCE_TYPES.includes(value) ? value : 'none'
}

function doesRecurOn(recurrenceType, anchorDate, targetDate) {
  switch (recurrenceType) {
    case 'daily': return true
    case 'weekdays': {
      const dow = targetDate.getDay()
      return dow >= 1 && dow <= 5
    }
    case 'weekly': return targetDate.getDay() === anchorDate.getDay()
    case 'monthly': return targetDate.getDate() === anchorDate.getDate()
    case 'yearly':
      return (
        targetDate.getMonth() === anchorDate.getMonth() &&
        targetDate.getDate() === anchorDate.getDate()
      )
    default: return false
  }
}

// Expand recurring meals to fill the window [windowStart, windowStart+count).
// Returns a flat list of base meals + virtual occurrence objects.
// Virtual occurrences are never stored — they exist only for rendering.
export function expandRecurringMeals(meals, windowStart, count) {
  const result = []
  for (const meal of meals) {
    result.push(meal)
    const recType = meal.recurrence?.type || 'none'
    if (recType === 'none') continue
    const anchorDate = parseIsoLocalDate(meal.date)
    if (!anchorDate) continue

    for (let i = 0; i < count; i++) {
      const occDate = addDays(windowStart, i)
      const occDateStr = formatIsoLocalDate(occDate)
      if (occDateStr === meal.date) continue
      if (occDate < anchorDate) continue
      if (!doesRecurOn(recType, anchorDate, occDate)) continue

      const fullDayName = occDate.toLocaleDateString('en-US', { weekday: 'long' })
      const occDayName = normalizeDayName(fullDayName)
      result.push({
        ...meal,
        id: `${meal.id}--recur-${occDateStr}`,
        date: occDateStr,
        day: DAY_SHORT[occDayName],
        day_name: occDayName,
        is_occurrence: true,
        occurrence_source_id: meal.id,
      })
    }
  }
  return result
}

export { DAY_ORDER, DAY_SHORT }
