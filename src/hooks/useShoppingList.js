import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { groupItemsByCategory } from '../lib/shoppingListUtils'
import { addItemsToShoppingList, ensureDefaultShoppingList, getShoppingListItems, listShoppingLists } from '../lib/shoppingLists'

export function useShoppingList(userId, listId = null) {
  const [shoppingList, setShoppingList] = useState(null)
  const [items, setItems] = useState([])
  const [availableLists, setAvailableLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refreshShoppingList = useCallback(async () => {
    if (!userId) {
      setShoppingList(null)
      setItems([])
      setAvailableLists([])
      setLoading(false)
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const lists = await listShoppingLists(userId)
      setAvailableLists(lists)

      let targetList = null

      if (listId) {
        targetList = lists.find((entry) => entry.id === listId) || null
      }

      if (!targetList) {
        targetList = lists.find((entry) => entry.is_default) || null
      }

      if (!targetList) {
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
      setAvailableLists([])
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

  useEffect(() => {
    if (!userId) return undefined

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'hidden') return
      refreshShoppingList()
    }

    window.addEventListener('focus', handleVisibilityOrFocus)
    window.addEventListener('pageshow', handleVisibilityOrFocus)
    document.addEventListener('visibilitychange', handleVisibilityOrFocus)

    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus)
      window.removeEventListener('pageshow', handleVisibilityOrFocus)
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
    }
  }, [refreshShoppingList, userId])

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

  const updateItem = useCallback(async (itemId, updates) => {
    const currentItem = items.find((item) => item.id === itemId)
    if (!currentItem) return null

    const nextName = String(updates?.name ?? currentItem.name ?? '').trim()
    if (!nextName) throw new Error('Item name is required')

    const payload = {
      name: nextName,
      quantity: String(updates?.quantity ?? currentItem.quantity ?? '').trim() || null,
      category: updates?.category || currentItem.category || 'other',
      checked: typeof updates?.checked === 'boolean' ? updates.checked : currentItem.checked,
      source: updates?.source || currentItem.source || 'manual',
    }

    const { data, error: updateError } = await supabase
      .from('shopping_list_items')
      .update(payload)
      .eq('id', itemId)
      .select('*')
      .single()

    if (updateError) {
      toast.error(updateError.message)
      throw updateError
    }

    const nextItems = items.map((item) => item.id === itemId ? data : item)
    setItems(nextItems)
    return data
  }, [items])

  const deleteItem = useCallback(async (itemId) => {
    const { error: deleteError } = await supabase
      .from('shopping_list_items')
      .delete()
      .eq('id', itemId)

    if (deleteError) {
      toast.error(deleteError.message)
      throw deleteError
    }

    const nextItems = items.filter((item) => item.id !== itemId)
    setItems(nextItems)
    return nextItems
  }, [items])

  const groupedItems = useMemo(() => groupItemsByCategory(items || []), [items])

  return {
    shoppingList,
    items,
    groupedItems,
    availableLists,
    loading,
    error,
    refreshShoppingList,
    toggleItem,
    clearChecked,
    addItem,
    updateItem,
    deleteItem,
  }
}
