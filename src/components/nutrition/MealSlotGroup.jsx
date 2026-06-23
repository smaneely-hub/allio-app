import { useState } from 'react'
import { MealLogRow } from './MealLogRow'

export function MealSlotGroup({ title, items, onAdd, onAddFood, onEdit }) {
  const [expanded, setExpanded] = useState(false)
  const subtotal = items.reduce((sum, item) => sum + Number(item.calories || 0), 0)
  const protein = Math.round(items.reduce((sum, item) => sum + Number(item.protein_g || 0), 0) * 10) / 10
  const carbs = Math.round(items.reduce((sum, item) => sum + Number(item.carbs_g || 0), 0) * 10) / 10
  const fat = Math.round(items.reduce((sum, item) => sum + Number(item.fat_g || 0), 0) * 10) / 10

  return (
    <section className="rounded-3xl border border-divider bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg text-text-primary">{title}</h3>
            <span className="text-xs text-text-muted">{expanded ? '▲' : '▼'}</span>
          </div>
          <p className="mt-1 text-sm text-text-secondary">{subtotal} kcal • P {protein}g • C {carbs}g • F {fat}g</p>
        </button>
        <div className="flex items-center gap-3 pl-2">
          <button type="button" onClick={onAddFood} className="text-sm font-medium text-text-secondary">Add food</button>
          <button type="button" onClick={onAdd} className="text-sm font-medium text-primary-600">+ Add</button>
        </div>
      </div>
      {expanded ? (
        <div className="mt-4 space-y-3">
          {items.length ? items.map((item) => <MealLogRow key={item.id} item={item} onClick={onEdit} />) : <div className="text-sm text-text-muted">Nothing logged here yet.</div>}
        </div>
      ) : null}
    </section>
  )
}
