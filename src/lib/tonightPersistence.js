import { addItemsToShoppingList, buildShoppingItemRows, ensureDefaultShoppingList, getShoppingListItems } from './shoppingLists'
import { aggregateShoppingList } from './aggregateShoppingList'

const PLANNER_SOURCES = new Set(['planner'])

export function buildShoppingItemsFromMeal(meal, staplesOnHand = '') {
  return buildShoppingItemRows(meal, staplesOnHand, 'tonight')
}

export async function upsertShoppingListForDate({ userId, householdId, weekOf, items, listId = null }) {
  const targetListId = listId || (await ensureDefaultShoppingList(userId))?.id
  if (!targetListId) return []

  const existingItems = await getShoppingListItems(targetListId)

  const plannerKeepers = (existingItems || []).filter((item) => !PLANNER_SOURCES.has(String(item.source || '').trim().toLowerCase()))
  const nextPlannerItems = (items || []).map((item) => ({
    name: item.name,
    quantity: item.quantity != null ? String(item.quantity).trim() || null : null,
    unit: item.unit != null ? String(item.unit).trim() : '',
    category: item.category,
    checked: Boolean(item.checked),
    source: item.source || 'planner',
  }))

  const { supabase } = await import('./supabase.js')
  const existingPlannerIds = (existingItems || [])
    .filter((item) => PLANNER_SOURCES.has(String(item.source || '').trim().toLowerCase()))
    .map((item) => item.id)
  if (existingPlannerIds.length > 0) {
    const { error } = await supabase
      .from('shopping_list_items')
      .delete()
      .in('id', existingPlannerIds)
    if (error) throw error
  }

  if (nextPlannerItems.length === 0) return plannerKeepers

  return addItemsToShoppingList({
    userId,
    listId: targetListId,
    items: nextPlannerItems,
    source: 'planner',
  })
}

export async function syncPlannerShoppingList({ userId, listId = null }) {
  if (!userId) return []

  const { supabase } = await import('./supabase.js')
  const [{ data: mealPlan, error: mealPlanError }, { data: household, error: householdError }] = await Promise.all([
    supabase
      .from('meal_plans')
      .select('draft_plan, plan')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('households')
      .select('id, staples_on_hand')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle(),
  ])

  if (mealPlanError) throw mealPlanError
  if (householdError) throw householdError
  if (!household?.id) return []

  const meals = mealPlan?.draft_plan?.meals || mealPlan?.plan?.meals || []
  const items = aggregateShoppingList({ meals }, household.staples_on_hand || '', {})

  return upsertShoppingListForDate({
    userId,
    householdId: household.id,
    weekOf: new Date().toISOString().split('T')[0],
    items,
    listId,
  })
}
