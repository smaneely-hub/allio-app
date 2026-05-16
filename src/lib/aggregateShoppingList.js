import { expandRecurringMeals, getStartOfWeek, parseIsoLocalDate } from './planner'
import { buildGroupedShoppingItems, CATEGORY_LABELS, CATEGORY_ORDER, groupItemsByCategory } from './shoppingListUtils'

const DAY_TO_INDEX = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6,
}

function normalizeShoppingDay(value = 'Sunday') {
  const key = String(value || '').trim().toLowerCase()
  return DAY_TO_INDEX[key] != null ? key : 'sunday'
}

function getShoppingWindow({ referenceDate = new Date(), shoppingDay = 'Sunday' } = {}) {
  const dayKey = normalizeShoppingDay(shoppingDay)
  const shoppingIndex = DAY_TO_INDEX[dayKey]
  const base = new Date(referenceDate)
  base.setHours(0, 0, 0, 0)
  const jsDay = (base.getDay() + 6) % 7
  const diffToLastShoppingDay = (jsDay - shoppingIndex + 7) % 7
  const windowStart = new Date(base)
  windowStart.setDate(base.getDate() - diffToLastShoppingDay)
  windowStart.setHours(0, 0, 0, 0)
  const windowEnd = new Date(windowStart)
  windowEnd.setDate(windowStart.getDate() + 7)
  windowEnd.setHours(0, 0, 0, 0)
  return { windowStart, windowEnd }
}

export function filterMealsForShoppingWindow(meals = [], { shoppingDay = 'Sunday', referenceDate = new Date() } = {}) {
  const { windowStart, windowEnd } = getShoppingWindow({ shoppingDay, referenceDate })
  return (meals || []).filter((meal) => {
    const date = parseIsoLocalDate(meal?.date)
    if (!date) return true
    return date >= windowStart && date < windowEnd
  })
}

export function aggregateShoppingList(mealPlan, staplesOnHand = '', options = {}) {
  const meals = mealPlan?.meals || mealPlan || []
  const datedMeals = meals
    .map((meal) => parseIsoLocalDate(meal?.date))
    .filter(Boolean)
    .sort((a, b) => a.getTime() - b.getTime())
  const windowAnchor = datedMeals[0] || new Date()
  const expandedMeals = expandRecurringMeals(meals, getStartOfWeek(windowAnchor), 7)
  const windowedMeals = options?.shoppingDay
    ? filterMealsForShoppingWindow(expandedMeals, { shoppingDay: options.shoppingDay, referenceDate: options.referenceDate || new Date() })
    : expandedMeals
  // Non-cooking meals don't contribute ingredients to the grocery list.
  const cookingMeals = windowedMeals.filter((meal) => !['eat_out', 'takeout', 'delivery'].includes(meal?.meal_source || 'generated'))
  return buildGroupedShoppingItems(cookingMeals, staplesOnHand)
}

export function shareListAsText(items, weekOf = '') {
  let text = `Allio Shopping List${weekOf ? ` — ${weekOf}` : ''}\n\n`
  const byCategory = groupItemsByCategory(items)

  for (const category of CATEGORY_ORDER) {
    if (!byCategory[category]?.length) continue

    text += `${String(CATEGORY_LABELS[category] || 'Other').toUpperCase()}\n`
    for (const item of byCategory[category]) {
      const checked = item.checked ? '[x]' : '[ ]'
      const usages = item.used_in?.map((usage) => usage.replace('_', ' ')).join(', ') || ''
      text += `${checked} ${item.name} — ${item.quantity} ${item.unit}`
      if (usages) text += ` (${usages})`
      text += `\n`
    }
    text += `\n`
  }

  return text
}
