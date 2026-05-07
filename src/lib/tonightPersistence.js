import { addItemsToShoppingList, buildShoppingItemRows, ensureDefaultShoppingList, getShoppingListItems } from './shoppingLists'

export function buildShoppingItemsFromMeal(meal, staplesOnHand = '') {
  return buildShoppingItemRows(meal, staplesOnHand, 'tonight')
}

export async function upsertShoppingListForDate({ userId, householdId, weekOf, items }) {
  const list = await ensureDefaultShoppingList(userId)
  const existingItems = await getShoppingListItems(list?.id)

  const plannerKeepers = (existingItems || []).filter((item) => item.source !== 'planner')
  const nextPlannerItems = (items || []).map((item) => ({
    name: item.name,
    quantity: item.quantity,
    category: item.category,
    checked: Boolean(item.checked),
    source: item.source || 'planner',
  }))

  if (list?.id) {
    const { supabase } = await import('./supabase')
    const existingPlannerIds = (existingItems || []).filter((item) => item.source === 'planner').map((item) => item.id)
    if (existingPlannerIds.length > 0) {
      const { error } = await supabase
        .from('shopping_list_items')
        .delete()
        .in('id', existingPlannerIds)
      if (error) throw error
    }
  }

  if (nextPlannerItems.length === 0) return plannerKeepers

  return addItemsToShoppingList({
    userId,
    listId: list?.id || null,
    items: nextPlannerItems,
    source: 'planner',
  })
}
