import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { ShopSkeleton, EmptyState } from '../components/LoadingStates'

export function ShopPage() {
  const { user } = useAuth()
  const [shoppingList, setShoppingList] = useState(null)
  const [loading, setLoading] = useState(true)
  const [openCategories, setOpenCategories] = useState({})

  useEffect(() => {
    async function loadShoppingList() {
      if (!user) return
      setLoading(true)
      const { data, error } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        toast.error(error.message)
      } else {
        setShoppingList(data)
      }
      setLoading(false)
    }

    loadShoppingList()
  }, [user])

  const groupedItems = useMemo(() => {
    const items = shoppingList?.items || []
    return items.reduce((acc, item) => {
      const category = item.category || 'other'
      if (!acc[category]) acc[category] = []
      acc[category].push(item)
      return acc
    }, {})
  }, [shoppingList])

  const progress = useMemo(() => {
    const items = shoppingList?.items || []
    const checked = items.filter((item) => item.checked).length
    return { checked, total: items.length }
  }, [shoppingList])

  const saveItems = async (items) => {
    const { data, error } = await supabase
      .from('shopping_lists')
      .update({ items })
      .eq('id', shoppingList.id)
      .select('*')
      .single()

    if (error) {
      toast.error(error.message)
      return
    }

    setShoppingList(data)
  }

  const toggleItem = (itemId) => {
    const nextItems = (shoppingList?.items || []).map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item,
    )
    saveItems(nextItems)
  }

  const clearAllChecks = () => {
    const nextItems = (shoppingList?.items || []).map((item) => ({ ...item, checked: false }))
    saveItems(nextItems)
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-xl px-6">
        <div className="card mb-6">
          <div className="h-8 w-48 bg-warm-200 animate-pulse rounded mb-2"></div>
          <div className="h-4 w-32 bg-warm-200 animate-pulse rounded"></div>
        </div>
        <ShopSkeleton />
      </div>
    )
  }

  if (!shoppingList || !shoppingList.items || shoppingList.items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-6">
        <EmptyState
          emoji="🛒"
          headline="Nothing to shop for yet"
          body="Once you finalize a meal plan, your grocery list will show up here — organized and ready."
          ctaLabel="Go to your meal plan"
          ctaLink="/plan"
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 px-6">
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl text-warm-900">Shopping List</h1>
            <p className="mt-2 text-sm text-warm-700">{progress.checked} of {progress.total} items checked</p>
          </div>
          <button type="button" onClick={clearAllChecks} className="btn-ghost text-sm font-medium">
            Clear all checks
          </button>
        </div>
      </div>

      {Object.entries(groupedItems).map(([category, items]) => (
        <div key={category} className="card">
          <button type="button" onClick={() => setOpenCategories((current) => ({ ...current, [category]: !current[category] }))} className="flex w-full items-center justify-between text-left">
            <span className="font-display text-lg text-warm-900">{category}</span>
            <span className="text-sm text-warm-400">{openCategories[category] === false ? 'Show' : 'Hide'}</span>
          </button>
          {openCategories[category] !== false ? (
            <div className="mt-4 space-y-3">
              {items
                .slice()
                .sort((a, b) => Number(a.checked) - Number(b.checked))
                .map((item) => (
                  <label key={item.id} className={`flex items-start gap-3 rounded-2xl border p-4 ${item.checked ? 'border-warm-200 bg-warm-50 text-warm-400' : 'border-warm-200 bg-white text-warm-800'}`}>
                    <input type="checkbox" checked={Boolean(item.checked)} onChange={() => toggleItem(item.id)} className="mt-1" />
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm">{item.quantity} {item.unit}</div>
                      <div className="mt-1 text-xs">Used in: {(item.meals || []).join(', ')}</div>
                    </div>
                  </label>
                ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
