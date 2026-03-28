import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { shareListAsText } from '../lib/aggregateShoppingList'
import { EmptyState } from '../components/LoadingStates'

const categoryColors = {
  produce: { border: '#4A9B6E', bg: 'bg-green-50' },
  protein: { border: '#D97B5A', bg: 'bg-orange-50' },
  dairy: { border: '#6B9ED6', bg: 'bg-blue-50' },
  pantry: { border: '#C4976B', bg: 'bg-amber-50' },
  frozen: { border: '#8BBDD4', bg: 'bg-sky-50' },
  bakery: { border: '#D4A85B', bg: 'bg-yellow-50' },
  other: { border: '#9C9589', bg: 'bg-warm-50' },
}

export function ShopPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const scheduleId = searchParams.get('schedule_id')
  const [shoppingList, setShoppingList] = useState(null)
  const [loading, setLoading] = useState(true)
  const [openCategories, setOpenCategories] = useState({})

  useEffect(() => {
    async function loadShoppingList() {
      if (!user) return
      setLoading(true)
      
      let query = supabase
        .from('shopping_lists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (scheduleId) {
        query = query.eq('schedule_id', scheduleId)
      }
      
      const { data, error } = await query.maybeSingle()

      if (error) {
        toast.error(error.message)
      } else {
        setShoppingList(data)
        // Auto-open first category
        if (data?.items?.length > 0) {
          const firstCat = data.items[0].category || 'other'
          setOpenCategories({ [firstCat]: true })
        }
      }
      setLoading(false)
    }

    loadShoppingList()
  }, [user, scheduleId])

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
    return { checked, total: items.length, percent: items.length > 0 ? Math.round((checked / items.length) * 100) : 0 }
  }, [shoppingList])

  const saveItems = async (items) => {
    if (!shoppingList?.id) return
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
    const items = (shoppingList?.items || []).map((item) =>
      item.name === itemId ? { ...item, checked: !item.checked } : item,
    )
    saveItems(items)
  }

  const clearAllChecks = () => {
    const items = (shoppingList?.items || []).map((item) => ({ ...item, checked: false }))
    saveItems(items)
    toast.success('All items unchecked')
  }

  const handleShare = () => {
    const text = shareListAsText(shoppingList?.items || [])
    navigator.clipboard.writeText(text)
    toast.success('Shopping list copied!')
  }

  if (loading) {
    return (
      <div className="px-3 pb-24 md:px-0">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 bg-warm-200 rounded"></div>
          <div className="h-4 w-48 bg-warm-200 rounded"></div>
          <div className="card p-4">
            <div className="h-6 w-24 bg-warm-200 rounded mb-3"></div>
            {[1,2,3].map(i => (
              <div key={i} className="h-12 bg-warm-100 rounded mb-2"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!shoppingList?.items?.length) {
    return (
      <div className="px-3 pb-24">
        <EmptyState
          emoji="🛒"
          headline="No shopping list yet"
          body="Finalize a meal plan to generate your shopping list."
          ctaLabel="Go to meal plan"
          ctaLink="/plan"
        />
      </div>
    )
  }

  return (
    <div className="px-3 pb-24 md:px-0">
      {/* Header */}
      <div className="mb-4">
        <h1 className="font-display text-2xl md:text-3xl text-warm-900">Shopping List</h1>
        <p className="text-sm text-warm-500">Week of {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
      </div>

      {/* Progress bar */}
      <div className="card p-4 mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-warm-600">{progress.checked} of {progress.total} items</span>
          <span className="text-warm-500">{progress.percent}%</span>
        </div>
        <div className="h-2 bg-warm-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary-400 transition-all"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      {/* Categories */}
      {Object.entries(groupedItems).map(([category, items]) => {
        const colors = categoryColors[category] || categoryColors.other
        const isOpen = openCategories[category] !== false
        const checkedCount = items.filter(i => i.checked).length
        
        return (
          <div key={category} className="mb-3">
            {/* Category header */}
            <button
              type="button"
              onClick={() => setOpenCategories(prev => ({ ...prev, [category]: !prev[category] }))}
              className="w-full card p-3 flex items-center justify-between"
              style={{ borderLeft: `4px solid ${colors.border}` }}
            >
              <div className="flex items-center gap-2">
                <span className="font-display text-base capitalize text-warm-900">{category}</span>
                <span className="text-xs bg-warm-100 text-warm-600 px-2 py-0.5 rounded-full">
                  {items.length}
                </span>
              </div>
              <span className="text-warm-400 text-sm">
                {checkedCount}/{items.length} ✓
              </span>
            </button>

            {/* Items */}
            {isOpen && (
              <div className={`mt-1 rounded-xl ${colors.bg}`}>
                {items
                  .sort((a, b) => a.checked - b.checked)
                  .map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleItem(item.name)}
                      className={`w-full flex items-center gap-3 p-3 text-left border-b border-warm-100 last:border-0 transition-opacity ${
                        item.checked ? 'opacity-50' : 'opacity-100'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        item.checked ? 'bg-primary-400 border-primary-400' : 'border-warm-300'
                      }`}>
                        {item.checked && <span className="text-white text-xs">✓</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm ${item.checked ? 'line-through text-warm-400' : 'text-warm-900'}`}>
                          {item.name}
                        </div>
                        {item.used_in?.length > 0 && (
                          <div className="text-xs text-warm-400">
                            {item.used_in.map(u => u.replace('_', ' ')).join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-warm-500 flex-shrink-0">
                        {item.quantity} {item.unit}
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Bottom actions */}
      <div className="flex gap-3 mt-6">
        <button type="button" onClick={clearAllChecks} className="btn-secondary flex-1">
          Clear checks
        </button>
        <button type="button" onClick={handleShare} className="btn-primary flex-1">
          📋 Share list
        </button>
      </div>
    </div>
  )
}