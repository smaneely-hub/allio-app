import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { groupItemsByCategory } from '../lib/shoppingListUtils'
import { addItemsToShoppingList, ensureDefaultShoppingList, getShoppingListItems } from '../lib/shoppingLists'

export function useShoppingList(userId, listId = null) {
  const [shoppingList, setShoppingList] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refreshShoppingList = useCallback(async () => {
    if (!userId) {
      setShoppingList(null)
      setItems([])
      setLoading(false)
      return null
    }

    setLoading(true)
    setError(null)

    try {
      let targetList = null

      if (listId) {
        const { data, error: listError } = await supabase
          .from('shopping_lists')
          .select('*')
          .eq('id', listId)
          .eq('user_id', userId)
          .maybeSingle()

        if (listError) throw listError
        targetList = data
      } else {
        targetList = await ensureDefaultShoppingList(userId)
      }

      if (!targetList?.id) {
        setShoppingList(null)
        setItems([])
        setLoading(false)
        return null
      }

      const nextItems = await getShoppingListItems(targetList.id)
      setShoppingList(targetList)
      setItems(nextItems)
      return { ...targetList, items: nextItems }
    } catch (err) {
      setShoppingList(null)
      setItems([])
      setError(err)
      toast.error(err.message || 'Could not load shopping list')
      return null
    } finally {
      setLoading(false)
    }
  }, [listId, userId])

  useEffect(() => {
    refreshShoppingList()
  }, [refreshShoppingList])

  const toggleItem = useCallback(async (itemId) => {
    const currentItem = items.find((item) => item.id === itemId)
    if (!currentItem) return null

    const { error: updateError } = await supabase
      .from('shopping_list_items')
      .update({ checked: !currentItem.checked })
      .eq('id', itemId)

    if (updateError) {
      toast.error(updateError.message)
      throw updateError
    }

    const nextItems = items.map((item) => item.id === itemId ? { ...item, checked: !item.checked } : item)
    setItems(nextItems)
    return nextItems
  }, [items])

  const clearChecked = useCallback(async () => {
    if (!shoppingList?.id) return []

    const checkedIds = items.filter((item) => item.checked).map((item) => item.id)
    if (!checkedIds.length) return items

    const { error: deleteError } = await supabase
      .from('shopping_list_items')
      .delete()
      .in('id', checkedIds)

    if (deleteError) {
      toast.error(deleteError.message)
      throw deleteError
    }

    const nextItems = items.filter((item) => !item.checked)
    setItems(nextItems)
    return nextItems
  }, [items, shoppingList?.id])

  const addItem = useCallback(async (targetListId, item) => {
    const name = String(item?.name || '').trim()
    if (!userId || !name) return null

    try {
      const nextItems = await addItemsToShoppingList({
        userId,
        listId: targetListId || shoppingList?.id || null,
        items: [{
          name,
          quantity: String(item?.quantity || '').trim() || null,
          category: item?.category || 'other',
          checked: Boolean(item?.checked),
          source: item?.source || 'manual',
        }],
        source: item?.source || 'manual',
      })

      setItems(nextItems)
      return nextItems?.find((entry) => String(entry?.name || '').trim().toLowerCase() === name.toLowerCase()) || null
    } catch (insertError) {
      toast.error(insertError.message)
      throw insertError
    }
  }, [shoppingList?.id, userId])

  const groupedItems = useMemo(() => groupItemsByCategory(items || []), [items])

  return {
    shoppingList,
    items,
    groupedItems,
    loading,
    error,
    refreshShoppingList,
    toggleItem,
    clearChecked,
    addItem,
  }
}
