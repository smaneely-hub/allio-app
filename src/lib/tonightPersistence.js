import { addItemsToShoppingList, buildShoppingItemRows } from './shoppingLists'

export function buildShoppingItemsFromMeal(meal, staplesOnHand = '') {
  return buildShoppingItemRows(meal, staplesOnHand, 'tonight')
}

export async function upsertShoppingListForDate({ userId, householdId, weekOf, items }) {
  return addItemsToShoppingList({
    userId,
    items: (items || []).map((item) => ({
      name: item.name,
      quantity: item.quantity,
      category: item.category,
      checked: Boolean(item.checked),
      source: item.source || 'planner',
    })),
    source: 'planner',
  })
}
