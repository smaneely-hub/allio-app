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
}

export function ManualLogModal({ open, initialSlot = 'breakfast', item, onClose, onSave, onDelete, saving }) {
  const [form, setForm] = useState(DEFAULT_FORM)

  useEffect(() => {
    if (!open) return
    setForm(item ? {
      meal_slot: item.meal_slot || 'breakfast',
      log_date: item.log_date || '',
      name: item.entry_name || '',
      calories: item.calories ?? '',
      protein_g: item.protein_g ?? '',
      carbs_g: item.carbs_g ?? '',
      fat_g: item.fat_g ?? '',
      notes: item.notes || '',
    } : {
      ...DEFAULT_FORM,
      meal_slot: initialSlot,
      log_date: new Date().toISOString().slice(0, 10),
    })
  }, [open, item, initialSlot])

  if (!open) return null

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
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">Calories</label>
            <input type="number" className="input w-full" value={form.calories} onChange={(e) => setForm((c) => ({ ...c, calories: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">Protein</label>
            <input type="number" className="input w-full" value={form.protein_g} onChange={(e) => setForm((c) => ({ ...c, protein_g: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">Carbs</label>
            <input type="number" className="input w-full" value={form.carbs_g} onChange={(e) => setForm((c) => ({ ...c, carbs_g: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">Fat</label>
            <input type="number" className="input w-full" value={form.fat_g} onChange={(e) => setForm((c) => ({ ...c, fat_g: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-text-primary">Notes</label>
            <textarea className="input w-full resize-none" rows={3} value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} />
          </div>
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
