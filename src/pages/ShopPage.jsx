import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { shareListAsText } from '../lib/aggregateShoppingList'
import { formatShoppingListEmail } from '../lib/formatShoppingListEmail'
import { EmptyState } from '../components/LoadingStates'

// Bold category colors
const categoryColors = {
  produce: { border: '#22C55E', bg: 'bg-green-50' },
  protein: { border: '#F97316', bg: 'bg-orange-50' },
  dairy: { border: '#3B82F6', bg: 'bg-blue-50' },
  pantry: { border: '#EAB308', bg: 'bg-yellow-50' },
  frozen: { border: '#06B6D4', bg: 'bg-cyan-50' },
  bakery: { border: '#D97706', bg: 'bg-amber-50' },
  other: { border: '#6B7280', bg: 'bg-gray-50' },
}

export function ShopPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const scheduleId = searchParams.get('schedule_id')
  const [shoppingList, setShoppingList] = useState(null)
  const [loading, setLoading] = useState(true)
  const [openCategories, setOpenCategories] = useState({})
  const [emailing, setEmailing] = useState(false)

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

  const handleEmailShop = async () => {
    setEmailing(true)
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser?.email) {
        toast.error('Could not find your email')
        return
      }
      
      const weekLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const itemCount = shoppingList?.items?.length || 0
      const html = formatShoppingListEmail(shoppingList?.items || [], weekLabel, 'My Household')
      
      const { error } = await supabase.functions.invoke('send-email', {
        body: { to: authUser.email, subject: `Your Allio shopping list — ${itemCount} items`, html }
      })
      
      if (error?.message?.includes('404') || error?.status === 404) {
        toast.error('Email feature coming soon!')
      } else if (error) {
        throw error
      } else {
        toast.success(`Shopping list sent to ${authUser.email}!`)
      }
    } catch (err) {
      console.error('[ShopPage] Email error:', err)
      toast.error('Couldn\'t send email. Try again.')
    } finally {
      setEmailing(false)
    }
  }

  if (loading) {
    return (
      <div className="px-3 pb-24 md:px-0 pt-2">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 bg-primary-100 rounded"></div>
          <div className="h-4 w-48 bg-primary-100 rounded"></div>
          <div className="card p-4">
            <div className="h-6 w-24 bg-primary-100 rounded mb-3"></div>
            {[1,2,3].map(i => (
              <div key={i} className="h-12 bg-primary-50 rounded mb-2"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!shoppingList?.items?.length) {
    return (
      <div className="px-3 pb-24 pt-2">
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
    <div className="px-3 pb-24 md:px-0 pt-2">
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <div>
            {/* Gradient accent bar */}
            <div className="h-1 w-12 bg-gradient-to-r from-primary-400 via-teal-400 to-purple-400 rounded-full mb-2"></div>
            <h1 className="font-display text-2xl md:text-3xl text-text-primary">Shopping List</h1>
            <p className="text-sm text-text-muted">Week of {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
          </div>
          <button 
            type="button" 
            onClick={handleEmailShop} 
            disabled={emailing} 
            className="text-sm text-primary-500 hover:bg-primary-50 rounded-lg px-3 py-1.5 transition-all duration-150 active:scale-[0.97]"
          >
            {emailing ? 'Sending...' : 'Share'}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="card p-4 mb-3 shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-text-secondary font-medium">{progress.checked} of {progress.total} items</span>
          <span className="text-text-muted">{progress.percent}%</span>
        </div>
        <div className="h-2 bg-primary-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-500 transition-all duration-300"
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
            {/* Category header - thicker border, bolder */}
            <button
              type="button"
              onClick={() => setOpenCategories(prev => ({ ...prev, [category]: !prev[category] }))}
              className="w-full card p-3 flex items-center justify-between hover:shadow-md transition-shadow duration-200"
              style={{ borderLeft: `4px solid ${colors.border}` }}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-base capitalize text-text-primary">{category}</span>
                <span className="bg-green-100 text-green-700 rounded-full px-2 py-0.5 text-xs font-semibold">
                  {items.length}
                </span>
              </div>
              <span className="text-text-muted text-sm font-medium">
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
                      className={`w-full flex items-center gap-3 p-3 text-left border-b border-white/50 last:border-0 transition-all duration-150 ${
                        item.checked ? 'opacity-60' : 'opacity-100'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
                        item.checked ? 'bg-green-500 border-green-500 scale-90' : 'border-warm-300'
                      }`}>
                        {item.checked && <span className="text-white text-xs">✓</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-base font-semibold ${item.checked ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                          {item.name}
                        </div>
                        {item.used_in?.length > 0 && (
                          <div className="text-xs text-text-muted capitalize">
                            {item.used_in.map(u => u.replace('_', ' ')).join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-warm-500 bg-warm-100 rounded-full px-2 flex-shrink-0">
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
      <div className="flex gap-3 mt-4">
        <button 
          type="button" 
          onClick={clearAllChecks} 
          className="btn-ghost text-text-muted hover:bg-warm-100 flex-1"
        >
          Clear all
        </button>
        <button 
          type="button" 
          onClick={handleShare} 
          className="btn-primary flex-1"
        >
          Copy list
        </button>
      </div>
    </div>
  )
}