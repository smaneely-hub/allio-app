import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { groupItemsByCategory } from '../lib/shoppingListUtils'

/** Load and persist the shopping list for the active week. */
export function useShoppingList(userId, weekOf) {
  const [shoppingList, setShoppingList] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refreshShoppingList = useCallback(async () => {
    if (!userId || !weekOf) {
      setShoppingList(null)
      setLoading(false)
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: loadError } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('user_id', userId)
        .eq('week_of', weekOf)
        .maybeSingle()

      if (loadError) throw loadError
      setShoppingList(data)
      return data
    } catch (err) {
      setError(err)
      toast.error(err.message || 'Could not load shopping list')
      return null
    } finally {
      setLoading(false)
    }
  }, [userId, weekOf])

  useEffect(() => {
    refreshShoppingList()
  }, [refreshShoppingList])

  const saveItems = useCallback(async (items) => {
    if (!shoppingList?.id) return null

    const { data, error: saveError } = await supabase
      .from('shopping_lists')
      .update({ items })
      .eq('id', shoppingList.id)
      .select('*')
      .single()

    if (saveError) {
      toast.error(saveError.message)
      throw saveError
    }

    setShoppingList(data)
    return data
  }, [shoppingList?.id])

  const groupedItems = useMemo(() => groupItemsByCategory(shoppingList?.items || []), [shoppingList])

  return {
    shoppingList,
    groupedItems,
    loading,
    error,
    refreshShoppingList,
    saveItems,
  }
}
