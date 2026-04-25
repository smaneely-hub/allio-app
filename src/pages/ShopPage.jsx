import { useEffect, useMemo, useState } from 'react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useSubscription } from '../hooks/useSubscription'
import { shareListAsText } from '../lib/aggregateShoppingList'
import { formatShoppingListEmail } from '../lib/formatShoppingListEmail'
import { EmptyState } from '../components/LoadingStates'
import { UpgradePrompt } from '../components/UpgradePrompt'
import { AdSlot } from '../components/AdSlot'
import { useShoppingList } from '../hooks/useShoppingList'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../lib/shoppingListUtils'

const categoryColors = {
  produce: { border: '#22C55E', bg: 'bg-green-50' },
  dairy: { border: '#3B82F6', bg: 'bg-blue-50' },
  meat: { border: '#F97316', bg: 'bg-orange-50' },
  pantry: { border: '#EAB308', bg: 'bg-yellow-50' },
  frozen: { border: '#06B6D4', bg: 'bg-cyan-50' },
  bakery: { border: '#D97706', bg: 'bg-amber-50' },
  other: { border: '#6B7280', bg: 'bg-gray-50' },
}

/** Render the household shopping list with grouped aisle sections. */
export function ShopPage() {
  useDocumentTitle('Shopping List | Allio')
  const { user } = useAuth()
  const { isPremium, trackUsage } = useSubscription()
  const today = new Date().toISOString().split('T')[0]
  const { shoppingList, loading, saveItems } = useShoppingList(user?.id, today)
  const displayGroups = useMemo(() => {
    return CATEGORY_ORDER.reduce((acc, category) => {
      const items = (shoppingList?.items || [])
        .map((item, index) => ({ ...item, __itemKey: `${item.name}-${item.unit}-${index}` }))
        .filter((item) => (item.category || 'other') === category)
      if (items.length) acc[category] = items
      return acc
    }, {})
  }, [shoppingList])
  const [openCategories, setOpenCategories] = useState({})
  const [emailing, setEmailing] = useState(false)
  const [upgradeFeature, setUpgradeFeature] = useState(null)

  useEffect(() => {
    const categoriesWithItems = CATEGORY_ORDER.filter((category) => displayGroups[category]?.length)
    if (!categoriesWithItems.length) {
      setOpenCategories({})
      return
    }

    setOpenCategories((prev) => {
      const next = { ...prev }
      for (const category of categoriesWithItems) {
        if (!(category in next)) next[category] = true
      }
      return next
    })
  }, [displayGroups])

  const progress = useMemo(() => {
    const items = shoppingList?.items || []
    const checked = items.filter((item) => item.checked).length
    return {
      checked,
      total: items.length,
      percent: items.length > 0 ? Math.round((checked / items.length) * 100) : 0,
      label: `${items.length} items (${checked} checked)`
    }
  }, [shoppingList])

  const toggleItem = async (itemKey) => {
    const items = (shoppingList?.items || []).map((item, index) => {
      const key = `${item.name}-${item.unit}-${index}`
      return key === itemKey ? { ...item, checked: !item.checked } : item
    })
    await saveItems(items)
  }

  const clearAllChecks = async () => {
    const items = (shoppingList?.items || []).map((item) => ({ ...item, checked: false }))
    await saveItems(items)
    toast.success('All items unchecked')
  }

  const handleShare = async () => {
    if (!isPremium) {
      setUpgradeFeature('shopping_share')
      return
    }

    const text = shareListAsText(shoppingList?.items || [], today)
    await navigator.clipboard.writeText(text)
    toast.success('Shopping list copied!')
  }

  const handleEmailShop = async () => {
    if (!isPremium) {
      setUpgradeFeature('email_delivery')
      return
    }

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
        await trackUsage('email_sent')
      }
    } catch (err) {
      console.error('[ShopPage] Email error:', err)
      toast.error("Couldn't send email. Try again.")
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
            {[1, 2, 3].map((i) => (
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
          body="Generate a meal on Tonight's Meal to create your shopping list."
          ctaLabel="Generate meal"
          ctaLink="/tonight"
        />
      </div>
    )
  }

  return (
    <div className="px-3 pb-24 md:px-0 pt-2">
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <div>
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

      <div className="card p-4 mb-3 shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-text-secondary">
              {progress.label}
            </div>
          </div>
          <button
            type="button"
            onClick={clearAllChecks}
            className="rounded-full border border-divider bg-white px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-warm-50"
          >
            Uncheck All
          </button>
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-text-secondary font-medium">{progress.checked} of {progress.total} checked</span>
          <span className="text-text-muted">{progress.percent}%</span>
        </div>
        <div className="h-2 bg-primary-100 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${progress.percent}%` }} />
        </div>
      </div>

      {!isPremium && (
        <div className="mb-3">
          <AdSlot size="banner" position="shop_middle" />
        </div>
      )}

      {CATEGORY_ORDER.filter((category) => displayGroups[category]?.length).map((category) => {
        const items = displayGroups[category]
        const colors = categoryColors[category] || categoryColors.other
        const isOpen = openCategories[category] !== false
        const checkedCount = items.filter((item) => item.checked).length

        return (
          <div key={category} className="mb-3">
            <button
              type="button"
              onClick={() => setOpenCategories((prev) => ({ ...prev, [category]: !prev[category] }))}
              className="w-full card p-3 flex items-center justify-between hover:shadow-md transition-shadow duration-200"
              style={{ borderLeft: `4px solid ${colors.border}` }}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-text-primary">{CATEGORY_LABELS[category] || 'Other'}</span>
                <span className="bg-green-100 text-green-700 rounded-full px-2 py-0.5 text-xs font-semibold">
                  {items.length}
                </span>
              </div>
              <span className="text-text-muted text-sm font-medium">
                {checkedCount}/{items.length} ✓
              </span>
            </button>

            {isOpen && (
              <div className={`mt-1 rounded-xl ${colors.bg}`}>
                {items.map((item) => {
                    return (
                      <button
                        key={item.__itemKey}
                        type="button"
                        onClick={() => toggleItem(item.__itemKey)}
                        className={`w-full flex items-center gap-3 p-3 text-left border-b border-white/50 last:border-0 transition-all duration-150 ${
                          item.checked ? 'opacity-60' : 'opacity-100'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
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
                              {item.used_in.map((usage) => usage.replace('_', ' ')).join(', ')}
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-warm-500 bg-warm-100 rounded-full px-2 flex-shrink-0">
                          {item.quantity} {item.unit}
                        </div>
                      </button>
                    )
                  })}
              </div>
            )}
          </div>
        )
      })}

      <div className="flex gap-3 mt-4">
        <button type="button" onClick={handleShare} className="btn-primary flex-1">
          Copy list
        </button>
      </div>

      {!isPremium && (
        <div className="mt-4">
          <AdSlot size="banner" position="shop_bottom" />
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-divider">
        <div className="text-center mb-4">
          <div className="text-sm font-medium text-text-secondary mb-3">Shop these ingredients</div>
          <div className="flex justify-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">Kroger</div>
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">Instacart</div>
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">Walmart</div>
          </div>
        </div>
        <p className="text-xs text-text-muted text-center">Grocery ordering coming soon</p>
      </div>

      <UpgradePrompt
        feature={upgradeFeature}
        onClose={() => {
          setUpgradeFeature(null)
        }}
      />
    </div>
  )
}
