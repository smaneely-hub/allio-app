import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { createShoppingList, listShoppingLists, renameShoppingList, setDefaultShoppingList } from '../lib/shoppingLists'

export function useShoppingLists(userId) {
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refreshLists = useCallback(async () => {
    if (!userId) {
      setLists([])
      setLoading(false)
      return []
    }

    setLoading(true)
    setError(null)
    try {
      const nextLists = await listShoppingLists(userId)
      setLists(nextLists)
      return nextLists
    } catch (err) {
      setError(err)
      toast.error(err.message || 'Could not load shopping lists')
      return []
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    refreshLists()
  }, [refreshLists])

  const createList = useCallback(async (name, options = {}) => {
    const created = await createShoppingList(userId, name, options)
    const nextLists = await refreshLists()
    return nextLists.find((list) => list.id === created.id) || created
  }, [refreshLists, userId])

  const renameList = useCallback(async (listId, name) => {
    const updated = await renameShoppingList(userId, listId, name)
    await refreshLists()
    return updated
  }, [refreshLists, userId])

  const makeDefault = useCallback(async (listId) => {
    const updated = await setDefaultShoppingList(userId, listId)
    await refreshLists()
    return updated
  }, [refreshLists, userId])

  return {
    lists,
    loading,
    error,
    refreshLists,
    createList,
    renameList,
    makeDefault,
  }
}
