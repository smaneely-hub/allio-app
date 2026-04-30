import { buildGroupedShoppingItems, CATEGORY_LABELS, CATEGORY_ORDER, groupItemsByCategory } from './shoppingListUtils'

export function aggregateShoppingList(mealPlan, staplesOnHand = '') {
  const meals = mealPlan?.meals || mealPlan || []
  // Non-cooking meals don't contribute ingredients to the grocery list.
  const cookingMeals = meals.filter((meal) => !['eat_out', 'takeout', 'delivery'].includes(meal?.meal_source || 'generated'))
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
