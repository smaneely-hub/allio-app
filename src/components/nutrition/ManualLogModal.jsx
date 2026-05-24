import { useEffect, useState } from 'react'

const DEFAULT_FORM = {
  meal_slot: 'breakfast',
  log_date: '',
  name: '',
  calories: '',
  protein_g: '',
  carbs_g: '',
  fat_g: '',
  notes: '',
  servings: 1,
  addToPlanner: false,
}

function totalValue(perServing, servings) {
  const s = Number(servings) || 1
  const v = Number(perServing) || 0
  return Math.round(v * s * 10) / 10
}

export function ManualLogModal({ open, initialSlot = 'breakfast', initialName = '', item, onClose, onSave, onDelete, saving }) {
  const [form, setForm] = useState(DEFAULT_FORM)

  useEffect(() => {
    if (!open) return
    if (item) {
      const storedServings = Number(item.servings || 1) || 1
      // Convert stored totals back to per-serving for editing
      const divBy = storedServings > 1 ? storedServings : 1
      setForm({
        meal_slot: item.meal_slot || 'breakfast',
        log_date: item.log_date || '',
        name: item.entry_name || '',
        calories: item.calories != null ? Math.round(Number(item.calories) / divBy) : '',
        protein_g: item.protein_g != null ? Math.round(Number(item.protein_g) / divBy * 10) / 10 : '',
        carbs_g: item.carbs_g != null ? Math.round(Number(item.carbs_g) / divBy * 10) / 10 : '',
        fat_g: item.fat_g != null ? Math.round(Number(item.fat_g) / divBy * 10) / 10 : '',
        notes: item.notes || '',
        servings: storedServings,
        addToPlanner: false,
      })
    } else {
      setForm({ ...DEFAULT_FORM, meal_slot: initialSlot, log_date: new Date().toISOString().slice(0, 10), name: initialName || '' })
    }
  }, [open, item, initialSlot, initialName])

  if (!open) return null

  const servings = Number(form.servings) || 1
  const showTotal = servings !== 1

  const isPlanner = item?.source_type === 'planner'

  return (
    <div className="fixed inset-0 z-50 bg-black/40 px-4 py-6">
      <div className="mx-auto max-w-lg rounded-3xl bg-white p-5 shadow-xl max-h-full overflow-y-auto">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-2xl text-text-primary">{item ? 'Edit log' : 'Add a meal'}</h3>
          <button type="button" onClick={onClose} className="rounded-full border border-divider px-3 py-1 text-sm text-text-secondary">✕</button>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-text-primary">Name</label>
            <input className="input w-full" value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">Meal slot</label>
            <select className="input w-full" value={form.meal_slot} onChange={(e) => setForm((c) => ({ ...c, meal_slot: e.target.value }))}>
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">Date</label>
            <input type="date" className="input w-full" value={form.log_date} onChange={(e) => setForm((c) => ({ ...c, log_date: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-text-primary">Servings</label>
            <input type="number" min="0.5" step="0.5" className="input w-32" value={form.servings} onChange={(e) => setForm((c) => ({ ...c, servings: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Calories{showTotal ? ' per serving' : ''}
            </label>
            <input type="number" className="input w-full" value={form.calories} onChange={(e) => setForm((c) => ({ ...c, calories: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Protein{showTotal ? ' per serving' : ''}
            </label>
            <input type="number" className="input w-full" value={form.protein_g} onChange={(e) => setForm((c) => ({ ...c, protein_g: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Carbs{showTotal ? ' per serving' : ''}
            </label>
            <input type="number" className="input w-full" value={form.carbs_g} onChange={(e) => setForm((c) => ({ ...c, carbs_g: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Fat{showTotal ? ' per serving' : ''}
            </label>
            <input type="number" className="input w-full" value={form.fat_g} onChange={(e) => setForm((c) => ({ ...c, fat_g: e.target.value }))} />
          </div>

          {showTotal ? (
            <div className="sm:col-span-2 rounded-2xl bg-surface px-4 py-3 text-sm text-text-secondary">
              <span className="font-medium text-text-primary">Total ({servings} servings): </span>
              {totalValue(form.calories, servings)} kcal · {totalValue(form.protein_g, servings)}p / {totalValue(form.carbs_g, servings)}c / {totalValue(form.fat_g, servings)}f
            </div>
          ) : null}

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-text-primary">Notes</label>
            <textarea className="input w-full resize-none" rows={3} value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} />
          </div>

          {!isPlanner ? (
            <div className="sm:col-span-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-divider accent-primary-600"
                  checked={form.addToPlanner}
                  onChange={(e) => setForm((c) => ({ ...c, addToPlanner: e.target.checked }))}
                />
                Also add to planner
              </label>
            </div>
          ) : null}
        </div>
        <div className="mt-5 flex items-center justify-between gap-3">
          <div>
            {item ? <button type="button" onClick={() => onDelete(item)} className="text-sm font-medium text-red-600">Delete</button> : null}
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="rounded-full border border-divider px-4 py-2 text-sm">Cancel</button>
            <button type="button" disabled={saving || !form.name || !form.calories} onClick={() => onSave(form)} className="btn-primary text-sm disabled:opacity-50">{saving ? 'Saving…' : item ? 'Save changes' : 'Add meal'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
