import { supabase } from './supabase'
import { buildGroupedShoppingItems } from './shoppingListUtils'

export function buildShoppingItemsFromMeal(meal, staplesOnHand = '') {
  return buildGroupedShoppingItems([meal], staplesOnHand)
}

export async function upsertShoppingListForDate({ userId, householdId, weekOf, items }) {
  const { data: existingList, error: loadError } = await supabase
    .from('shopping_lists')
    .select('id')
    .eq('user_id', userId)
    .eq('week_of', weekOf)
    .maybeSingle()

  if (loadError) throw loadError

  if (existingList?.id) {
    const { error } = await supabase
      .from('shopping_lists')
      .update({ household_id: householdId, items })
      .eq('id', existingList.id)

    if (error) throw error
    return existingList.id
  }

  const { data, error } = await supabase
    .from('shopping_lists')
    .insert({
      user_id: userId,
      household_id: householdId,
      week_of: weekOf,
      items,
    })
    .select('id')
    .single()

  if (error) throw error
  return data?.id || null
}
