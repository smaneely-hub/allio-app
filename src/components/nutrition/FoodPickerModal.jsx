import { useEffect, useMemo, useState } from 'react'
import { searchFoodItems, getRecentFoods, getSavedFoods, saveFoodForUser, removeSavedFoodForUser } from '../../lib/foodSearch'

function FoodRow({ item, saved, onToggleSave, onPick }) {
  return (
    <div className="rounded-2xl border border-divider bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium text-text-primary">{item.name}</div>
          <div className="mt-1 text-xs text-text-secondary">{item.brand ? `${item.brand} • ` : ''}{item.serving_label}</div>
          <div className="mt-2 text-xs text-text-secondary">{item.calories} kcal • {item.protein_g}p / {item.carbs_g}c / {item.fat_g}f</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button type="button" onClick={() => onToggleSave(item)} className="text-xs font-medium text-primary-600">{saved ? 'Unsave' : 'Save'}</button>
          <button type="button" onClick={() => onPick(item)} className="rounded-full bg-primary-600 px-3 py-1.5 text-xs font-medium text-white">Add</button>
        </div>
      </div>
    </div>
  )
}

export function FoodPickerModal({ open, userId, initialSlot = 'breakfast', onClose, onPick }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [recent, setRecent] = useState([])
  const [saved, setSaved] = useState([])
  const [loading, setLoading] = useState(false)
  const [servings, setServings] = useState(1)

  const savedIds = useMemo(() => new Set(saved.map((item) => item.id)), [saved])

  const loadLists = async () => {
    if (!userId) return
    const [recentFoods, savedFoods] = await Promise.all([
      getRecentFoods(userId),
      getSavedFoods(userId),
    ])
    setRecent(recentFoods)
    setSaved(savedFoods)
  }

  useEffect(() => {
    if (!open) return
    setQuery('')
    setServings(1)
    setResults([])
    loadLists().catch(() => {})
  }, [open, userId])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        const found = await searchFoodItems(query)
        if (!cancelled) setResults(found)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run().catch(() => {
      if (!cancelled) {
        setResults([])
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [open, query])

  const handleToggleSave = async (item) => {
    if (!userId) return
    if (savedIds.has(item.id)) {
      await removeSavedFoodForUser(userId, item.id)
    } else {
      await saveFoodForUser(userId, item.id)
    }
    await loadLists()
  }

  const handlePick = (item) => {
    onPick({
      meal_slot: initialSlot,
      name: item.brand ? `${item.brand} ${item.name}` : item.name,
      food_item_id: item.id,
      calories: Number(item.calories || 0) * Number(servings || 1),
      protein_g: Number(item.protein_g || 0) * Number(servings || 1),
      carbs_g: Number(item.carbs_g || 0) * Number(servings || 1),
      fat_g: Number(item.fat_g || 0) * Number(servings || 1),
      notes: `From food list • ${item.serving_label} × ${servings}`,
      source_type: 'food_item',
      serving_count: Number(servings || 1),
    })
  }

  if (!open) return null

  const display = query.trim() ? results : [...saved, ...recent.filter((item) => !savedIds.has(item.id)), ...results.filter((item) => !savedIds.has(item.id) && !recent.find((r) => r.id === item.id))]
  const deduped = display.filter((item, index) => display.findIndex((entry) => entry.id === item.id) === index)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 px-4 py-6">
      <div className="mx-auto max-w-2xl rounded-3xl bg-white p-5 shadow-xl max-h-full overflow-y-auto">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl text-text-primary">Add from foods</h3>
            <p className="mt-1 text-sm text-text-secondary">Search common, branded, and saved foods.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-divider px-3 py-1 text-sm text-text-secondary">✕</button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px]">
          <input className="input w-full" placeholder="Search foods, brands, restaurants..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <input type="number" min="1" step="0.5" className="input w-full" value={servings} onChange={(e) => setServings(e.target.value)} placeholder="Servings" />
        </div>

        {!query.trim() && saved.length ? <div className="mt-4"><div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Saved</div></div> : null}
        {!query.trim() && recent.length ? <div className="mt-1 mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Recent and common foods</div> : null}

        <div className="mt-3 space-y-3">
          {loading ? <div className="text-sm text-text-secondary">Searching foods…</div> : null}
          {!loading && deduped.length === 0 ? <div className="text-sm text-text-secondary">No foods found yet. Try another search.</div> : null}
          {deduped.map((item) => (
            <FoodRow key={item.id} item={item} saved={savedIds.has(item.id)} onToggleSave={handleToggleSave} onPick={handlePick} />
          ))}
        </div>
      </div>
    </div>
  )
}
