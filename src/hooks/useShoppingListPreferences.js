import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useShoppingListPreferences(userId) {
  const [defaultListId, setDefaultListId] = useState(null)
  const [alwaysAsk, setAlwaysAsk] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    if (!userId) {
      setLoading(false)
      return
    }
    supabase
      .from('user_preferences')
      .select('default_shopping_list_id, always_ask_shopping_list')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!mounted) return
        setDefaultListId(data?.default_shopping_list_id || null)
        setAlwaysAsk(Boolean(data?.always_ask_shopping_list))
        setLoading(false)
      })
      .catch(() => {
        if (!mounted) return
        setLoading(false)
      })
    return () => { mounted = false }
  }, [userId])

  return { defaultListId, alwaysAsk, loading }
}
