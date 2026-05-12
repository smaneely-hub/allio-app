import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
import { useShoppingLists } from '../hooks/useShoppingLists'
import { CATEGORY_LABELS, CATEGORY_ORDER, categorizeIngredient } from '../lib/shoppingListUtils'
import { getSourceBadgeLabel } from '../lib/shoppingLists'

const categoryColors = {
  produce: { border: '#22C55E', bg: 'bg-green-50' },
  dairy: { border: '#3B82F6', bg: 'bg-blue-50' },
  meat: { border: '#F97316', bg: 'bg-orange-50' },
  pantry: { border: '#EAB308', bg: 'bg-yellow-50' },
  frozen: { border: '#06B6D4', bg: 'bg-cyan-50' },
  bakery: { border: '#D97706', bg: 'bg-amber-50' },
  other: { border: '#6B7280', bg: 'bg-gray-50' },
}

function SourceBadge({ source }) {
  const label = getSourceBadgeLabel(source)
  const tone = String(source || '').toLowerCase() === 'planner'
    ? 'bg-blue-100 text-blue-700'
    : String(source || '').toLowerCase() === 'mixed'
      ? 'bg-violet-100 text-violet-700'
      : 'bg-slate-100 text-slate-700'

  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{label}</span>
}

/** Render household shopping lists with multi-list support and planner/manual source cues. */
export function ShopPage() {
  useDocumentTitle('Shopping List | Allio')
  const { user } = useAuth()
  const { isPremium, trackUsage } = useSubscription()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedListId = searchParams.get('list') || null
  const { createList, makeDefault } = useShoppingLists(user?.id)
  const { shoppingList, items, availableLists, loading, toggleItem, clearChecked, addItem, updateItem, deleteItem } = useShoppingList(user?.id, selectedListId)
  const listLabel = shoppingList?.name || 'Shopping List'
  const [newItemName, setNewItemName] = useState('')
  const [newItemQuantity, setNewItemQuantity] = useState('')
  const [newListName, setNewListName] = useState('')
  const [creatingList, setCreatingList] = useState(false)
  const [editingItemId, setEditingItemId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [editingQuantity, setEditingQuantity] = useState('')
  const [openCategories, setOpenCategories] = useState({})
  const [emailing, setEmailing] = useState(false)
  const [upgradeFeature, setUpgradeFeature] = useState(null)

  const displayGroups = useMemo(() => {
    return CATEGORY_ORDER.reduce((acc, category) => {
      const grouped = (items || [])
        .map((item) => ({ ...item, __itemKey: item.id }))
        .filter((item) => (item.category || 'other') === category)
      if (grouped.length) acc[category] = grouped
      return acc
    }, {})
  }, [items])

  useEffect(() => {
    if (!selectedListId && shoppingList?.id) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set('list', shoppingList.id)
        return next
      }, { replace: true })
    }
  }, [selectedListId, setSearchParams, shoppingList?.id])

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
    const checked = (items || []).filter((item) => item.checked).length
    return {
      checked,
      total: items.length,
      percent: items.length > 0 ? Math.round((checked / items.length) * 100) : 0,
      label: `${items.length} items (${checked} checked)`
    }
  }, [items])

  const clearAllChecks = async () => {
    await clearChecked()
    toast.success('Checked items cleared')
  }

  const handleAddItem = async (event) => {
    event.preventDefault()
    if (!newItemName.trim()) return

    await addItem(shoppingList?.id, {
      name: newItemName.trim(),
      quantity: newItemQuantity.trim(),
      category: categorizeIngredient(newItemName),
      source: 'manual',
    })

    setNewItemName('')
    setNewItemQuantity('')
    toast.success('Item added')
  }

  const handleCreateList = async (event) => {
    event.preventDefault()
    if (!newListName.trim()) return
    setCreatingList(true)
    try {
      const created = await createList(newListName.trim())
      setNewListName('')
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set('list', created.id)
        return next
      })
      toast.success('Shopping list created')
    } catch (error) {
      toast.error(error?.message || 'Could not create shopping list')
    } finally {
      setCreatingList(false)
    }
  }

  const handleSelectList = (event) => {
    const nextId = event.target.value
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('list', nextId)
      return next
    })
  }

  const handleMakeDefault = async () => {
    if (!shoppingList?.id) return
    await makeDefault(shoppingList.id)
    toast.success(`${shoppingList.name} is now your default list`)
  }

  const startEditingItem = (item) => {
    setEditingItemId(item.id)
    setEditingName(item.name || '')
    setEditingQuantity(item.quantity || '')
  }

  const cancelEditingItem = () => {
    setEditingItemId(null)
    setEditingName('')
    setEditingQuantity('')
  }

  const saveEditingItem = async (item) => {
    await updateItem(item.id, {
      name: editingName,
      quantity: editingQuantity,
      category: categorizeIngredient(editingName || item.name || ''),
    })
    cancelEditingItem()
    toast.success('Item updated')
  }

  const handleDeleteItem = async (item) => {
    await deleteItem(item.id)
    if (editingItemId === item.id) cancelEditingItem()
    toast.success(`${item.name} removed`)
  }

  const handleShare = async () => {
    if (!isPremium) {
      setUpgradeFeature('shopping_share')
      return
    }

    const text = shareListAsText(items || [], listLabel)
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

      const html = formatShoppingListEmail(items || [], listLabel, 'My Household')

      const { error } = await supabase.functions.invoke('send-email', {
        body: { to: authUser.email, subject: `Your Allio shopping list — ${items?.length || 0} items`, html }
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
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-4 md:px-6 md:pt-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 rounded bg-primary-100"></div>
          <div className="h-4 w-48 rounded bg-primary-100"></div>
          <div className="card p-4">
            <div className="mb-3 h-6 w-24 rounded bg-primary-100"></div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="mb-2 h-12 rounded bg-primary-50"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!shoppingList?.id) {
    return (
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-4 md:px-6 md:pt-6">
        <EmptyState
          emoji="🛒"
          headline="No shopping list yet"
          body="Create your first shopping list to start collecting planned and manual items together."
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-4 md:px-6 md:pt-6">
      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="h-1 w-12 rounded-full bg-gradient-to-r from-primary-400 via-teal-400 to-purple-400 mb-2"></div>
            <h1 className="font-display text-2xl md:text-3xl text-text-primary">{listLabel}</h1>
            <p className="text-sm text-text-muted">Planner items and manual items merge in the same list. Sharing is still copy or email for now.</p>
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

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="rounded-2xl border border-divider bg-white p-3 shadow-sm">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Current list</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select className="input flex-1" value={shoppingList?.id || ''} onChange={handleSelectList}>
                {availableLists.map((list) => (
                  <option key={list.id} value={list.id}>{list.name}{list.is_default ? ' • default' : ''}</option>
                ))}
              </select>
              <button type="button" onClick={handleMakeDefault} className="btn-secondary whitespace-nowrap" disabled={shoppingList?.is_default}>
                {shoppingList?.is_default ? 'Default list' : 'Set default'}
              </button>
            </div>
          </div>

          <form onSubmit={handleCreateList} className="rounded-2xl border border-divider bg-white p-3 shadow-sm">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">New list</label>
            <div className="flex gap-2">
              <input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="input min-w-0"
                placeholder="Weekly groceries"
              />
              <button type="submit" className="btn-primary whitespace-nowrap" disabled={creatingList}>
                {creatingList ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card p-4 mb-3 shadow-sm hover:shadow-md transition-shadow duration-200">
        <form onSubmit={handleAddItem} className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px_auto]">
          <input
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="input w-full"
            placeholder="Add an item"
          />
          <input
            value={newItemQuantity}
            onChange={(e) => setNewItemQuantity(e.target.value)}
            className="input w-full"
            placeholder="Qty"
          />
          <button type="submit" className="btn-primary">Add</button>
        </form>
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
            Clear checked
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

      {!items?.length ? (
        <div className="card p-6 text-sm text-text-muted">
          This list is empty. Planner meals can flow here, and manual items can be added anytime.
        </div>
      ) : CATEGORY_ORDER.filter((category) => displayGroups[category]?.length).map((category) => {
        const categoryItems = displayGroups[category]
        const colors = categoryColors[category] || categoryColors.other
        const isOpen = openCategories[category] !== false
        const checkedCount = categoryItems.filter((item) => item.checked).length

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
                  {categoryItems.length}
                </span>
              </div>
              <span className="text-text-muted text-sm font-medium">
                {checkedCount}/{categoryItems.length} ✓
              </span>
            </button>

            {isOpen && (
              <div className={`mt-1 rounded-xl ${colors.bg}`}>
                {categoryItems.map((item) => {
                  const isEditing = editingItemId === item.id
                  return (
                    <div
                      key={item.__itemKey}
                      className={`w-full border-b border-white/50 last:border-0 transition-all duration-150 ${
                        item.checked ? 'opacity-60' : 'opacity-100'
                      }`}
                    >
                      <div className="flex items-center gap-3 p-3">
                        <button
                          type="button"
                          onClick={() => toggleItem(item.__itemKey)}
                          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
                            item.checked ? 'bg-green-500 border-green-500 scale-90' : 'border-warm-300'
                          }`}
                        >
                          {item.checked && <span className="text-white text-xs">✓</span>}
                        </button>
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div className="space-y-2">
                              <input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="input w-full"
                                placeholder="Item name"
                              />
                              <input
                                value={editingQuantity}
                                onChange={(e) => setEditingQuantity(e.target.value)}
                                className="input w-full"
                                placeholder="Qty"
                              />
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-wrap items-center gap-2">
                                <div className={`text-base font-semibold ${item.checked ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                                  {item.name}
                                </div>
                                <SourceBadge source={item.source} />
                              </div>
                              {item.used_in?.length > 0 && (
                                <div className="text-xs text-text-muted capitalize">
                                  {item.used_in.map((usage) => usage.replace('_', ' ')).join(', ')}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        {!isEditing && (item.quantity || '').trim() ? (
                          <div className="text-sm text-warm-500 bg-warm-100 rounded-full px-2 flex-shrink-0">
                            {item.quantity}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex gap-2 px-3 pb-3">
                        {isEditing ? (
                          <>
                            <button type="button" onClick={() => saveEditingItem(item)} className="rounded-full bg-primary-500 px-3 py-1.5 text-sm font-medium text-white">
                              Save
                            </button>
                            <button type="button" onClick={cancelEditingItem} className="rounded-full border border-divider bg-white px-3 py-1.5 text-sm font-medium text-text-secondary">
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button type="button" onClick={() => startEditingItem(item)} className="rounded-full border border-divider bg-white px-3 py-1.5 text-sm font-medium text-text-secondary">
                              Edit
                            </button>
                            <button type="button" onClick={() => handleDeleteItem(item)} className="rounded-full border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600">
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
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

      <div className="mt-6 rounded-3xl border border-divider bg-surface-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-text-primary">What’s next</h2>
        <ul className="mt-3 space-y-2 text-sm text-text-secondary">
          <li>• Planner destination picker, so meals can be sent to a chosen list before sync</li>
          <li>• List-sharing with household members, instead of copy or email only</li>
          <li>• Shared plan collaboration built on the same household permissions model</li>
        </ul>
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
