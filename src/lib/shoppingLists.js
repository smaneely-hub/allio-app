import { supabase } from './supabase'
import { parseIngredient } from './shoppingListUtils'

// Module-level cache: prevents multiple concurrent callers from racing the same userId.
const ensureDefaultInFlight = new Map()

export async function ensureDefaultShoppingList(userId) {
  if (!userId) return null

  if (ensureDefaultInFlight.has(userId)) {
    return ensureDefaultInFlight.get(userId)
  }

  const promise = _ensureDefaultShoppingListInner(userId)
    .finally(() => ensureDefaultInFlight.delete(userId))

  ensureDefaultInFlight.set(userId, promise)
  return promise
}

async function _ensureDefaultShoppingListInner(userId) {
  console.log('[ensureDefault] enter', { userId })

  const { data: existing, error: existingError } = await supabase
    .from('shopping_lists')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (existingError) {
    console.error('[ensureDefault] existing select failed', existingError)
    throw existingError
  }
  if (existing) {
    console.log('[ensureDefault] found existing default', existing.id)
    return existing
  }

  console.log('[ensureDefault] no default found, checking for any list')
  const { data: firstList, error: firstListError } = await supabase
    .from('shopping_lists')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (firstListError) {
    console.error('[ensureDefault] firstList select failed', firstListError)
    throw firstListError
  }
  if (firstList?.id) {
    if (firstList.is_default) return firstList
    console.log('[ensureDefault] found non-default list, will UPDATE to default:', firstList.id)
    const { data: updated, error: updateError } = await supabase
      .from('shopping_lists')
      .update({ is_default: true })
      .eq('id', firstList.id)
      .select('*')
      .single()
    if (updateError) {
      console.warn('[ensureDefault] update failed, attempting recovery', updateError)
      if (updateError.code === '23505') {
        return await _recoverDefaultList(userId)
      }
      throw updateError
    }
    return updated
  }

  console.log('[ensureDefault] no list, inserting')
  const { data: created, error: createError } = await supabase
    .from('shopping_lists')
    .insert({ user_id: userId, name: 'My Shopping List', is_default: true })
    .select('*')
    .single()
  if (createError) {
    console.warn('[ensureDefault] insert failed, attempting recovery', createError)
    if (createError.code === '23505') {
      return await _recoverDefaultList(userId)
    }
    throw createError
  }
  return created
}

async function _recoverDefaultList(userId) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: winner, error: winnerError } = await supabase
      .from('shopping_lists')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .maybeSingle()
    if (winnerError) {
      console.error('[recoverDefault] winner read failed', winnerError)
      throw winnerError
    }
    if (winner) {
      console.log('[recoverDefault] found winner default on attempt', attempt)
      return winner
    }

    const { data: anyList, error: anyListError } = await supabase
      .from('shopping_lists')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (anyListError) {
      console.error('[recoverDefault] anyList read failed', anyListError)
      throw anyListError
    }
    if (anyList) {
      console.log('[recoverDefault] no default visible but found anyList on attempt', attempt, anyList.id)
      return anyList
    }

    await new Promise((r) => setTimeout(r, 50 * (attempt + 1)))
  }
  throw new Error(`ensureDefaultShoppingList: 23505 conflict but no row visible after retries (userId=${userId})`)
}

export async function getDefaultShoppingList(userId) {
  if (!userId) return null
  return ensureDefaultShoppingList(userId)
}

export async function getShoppingListItems(listId) {
  if (!listId) return []

  const { data, error } = await supabase
    .from('shopping_list_items')
    .select('*')
    .eq('list_id', listId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export function buildShoppingItemRows(meal, staplesOnHand = '', source = 'tonight') {
  const staples = String(staplesOnHand)
    .toLowerCase()
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  const ingredients = Array.isArray(meal?.ingredients)
    ? meal.ingredients
    : Array.isArray(meal?.ingredientGroups)
      ? meal.ingredientGroups.flatMap((group) => Array.isArray(group?.ingredients) ? group.ingredients : [])
      : []

  return ingredients
    .map((rawIngredient) => parseIngredient(rawIngredient))
    .filter(Boolean)
    .filter((parsed) => !staples.some((staple) => parsed.normalizedName.includes(staple)))
    .map((parsed) => ({
      name: parsed.name,
      quantity: parsed.quantity ? String(parsed.quantity) : '',
      category: parsed.category,
      checked: false,
      source,
    }))
}

function mergeQuantities(existingQuantity, nextQuantity) {
  const left = String(existingQuantity || '').trim()
  const right = String(nextQuantity || '').trim()
  if (!left) return right
  if (!right) return left
  if (left.toLowerCase() === right.toLowerCase()) return left
  return `${left} + ${right}`
}

export async function addItemsToShoppingList({ userId, listId = null, items = [], source = 'tonight' }) {
  if (!userId) throw new Error('User is required to add shopping items.')
  if (!Array.isArray(items) || items.length === 0) return []

  const targetList = listId ? { id: listId } : await ensureDefaultShoppingList(userId)
  if (!targetList?.id) throw new Error('No shopping list available.')

  const existingItems = await getShoppingListItems(targetList.id)
  const uncheckedMap = new Map()
  for (const item of existingItems) {
    if (item.checked) continue
    const key = String(item.name || '').trim().toLowerCase()
    if (!key) continue
    if (!uncheckedMap.has(key)) uncheckedMap.set(key, item)
  }

  for (const rawItem of items) {
    const name = String(rawItem?.name || '').trim()
    if (!name) continue
    const key = name.toLowerCase()
    const existing = uncheckedMap.get(key)

    if (existing) {
      const { error } = await supabase
        .from('shopping_list_items')
        .update({
          quantity: mergeQuantities(existing.quantity, rawItem.quantity),
          category: rawItem.category || existing.category,
          source: existing.source || source,
        })
        .eq('id', existing.id)

      if (error) throw error
      uncheckedMap.delete(key)
      continue
    }

    const { data, error } = await supabase
      .from('shopping_list_items')
      .insert({
        list_id: targetList.id,
        user_id: userId,
        name,
        quantity: String(rawItem.quantity || '').trim() || null,
        category: rawItem.category || 'other',
        checked: Boolean(rawItem.checked),
        source: rawItem.source || source,
      })
      .select('*')
      .single()

    if (error) throw error
    uncheckedMap.set(key, data)
  }

  return getShoppingListItems(targetList.id)
}
