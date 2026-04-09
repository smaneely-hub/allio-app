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

export function normalizeMeal(meal = {}, weekStart = getStartOfWeek()) {
  const slot = normalizeMealSlotName(meal.meal || meal.meal_type || meal.slot || '')
  const dayName = normalizeDayName(meal.day)
  const mealDate = getDateForDayName(weekStart, dayName)
  const items = normalizeMealItems(meal)
  const macros = getMealMacros(meal)
  const calories = getMealCalories(meal)

  return {
    ...meal,
    id: meal.id || `${DAY_SHORT[dayName]}-${slot}`,
    day: DAY_SHORT[dayName],
    day_name: dayName,
    date: mealDate.toISOString().slice(0, 10),
    meal: slot,
    slot,
    title: meal.title || meal.name || 'Meal',
    image_url: meal.image_url || items[0]?.image_url || null,
    amount_to_eat: meal.amount_to_eat || 1,
    amount_unit: meal.amount_unit || 'serving',
    servings: Number(meal.servings || meal.recipe_servings || 1) || 1,
    prep_time_minutes: Number(meal.prep_time_minutes || 0) || 0,
    cook_time_minutes: Number(meal.cook_time_minutes || 0) || 0,
    calories,
    nutrition: macros,
    items,
    ingredients: (meal.ingredients || []).map(normalizeIngredient),
    directions: Array.isArray(meal.directions)
      ? meal.directions
      : Array.isArray(meal.instructions)
        ? meal.instructions.map((step) => ({ text: step }))
        : [],
    notes: meal.notes || '',
    user_note: meal.user_note || '',
    locked: Boolean(meal.locked),
    recurring: Boolean(meal.recurring),
    source_meal_id: meal.source_meal_id || null,
    isGenerated: true,
  }
}

export function buildPlannerWeek({ weekStart = getStartOfWeek(), meals = [], dayNotes = {} } = {}) {
  const normalizedMeals = meals.map((meal) => normalizeMeal(meal, weekStart))

  return DAY_ORDER.map((dayName) => {
    const date = getDateForDayName(weekStart, dayName)
    const short = DAY_SHORT[dayName]
    const mealsForDay = normalizedMeals.filter((meal) => meal.day === short)
    const mealGroups = MEAL_SLOTS.map((slot) => {
      const slotMeals = mealsForDay.filter((meal) => meal.slot === slot)
      return {
        slot,
        label: slot.charAt(0).toUpperCase() + slot.slice(1),
        calories: slotMeals.reduce((sum, meal) => sum + getMealCalories(meal), 0),
        meals: slotMeals,
      }
    })

    const plannedMealSlots = mealGroups.filter((group) => group.meals.length > 0).length
    const totalCalories = mealsForDay.reduce((sum, meal) => sum + getMealCalories(meal), 0)
    const nutrition = mealsForDay.reduce(
      (acc, meal) => ({
        carbs: acc.carbs + (meal.nutrition?.carbs || 0),
        fat: acc.fat + (meal.nutrition?.fat || 0),
        protein: acc.protein + (meal.nutrition?.protein || 0),
      }),
      { carbs: 0, fat: 0, protein: 0 },
    )

    return {
      key: short,
      dayName,
      shortLabel: dayName.slice(0, 3),
      date,
      dateLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      notes: dayNotes?.[short] || dayNotes?.[dayName] || '',
      mealGroups,
      meals: mealsForDay,
      totalCalories,
      nutrition,
      plannedMealSlots,
      totalMealSlots: MEAL_SLOTS.length,
      isPlanned: mealsForDay.length > 0,
    }
  })
}

export { DAY_ORDER, DAY_SHORT }
