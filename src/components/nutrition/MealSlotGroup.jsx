import { MealLogRow } from './MealLogRow'

export function MealSlotGroup({ title, items, onAdd, onAddFood, onEdit }) {
  const subtotal = items.reduce((sum, item) => sum + Number(item.calories || 0), 0)
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm border border-divider">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl text-text-primary">{title}</h3>
          <p className="text-sm text-text-secondary">{subtotal} kcal</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={onAddFood} className="text-sm font-medium text-text-secondary">Add food</button>
          <button type="button" onClick={onAdd} className="text-sm font-medium text-primary-600">+ Add</button>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {items.length ? items.map((item) => <MealLogRow key={item.id} item={item} onClick={onEdit} />) : <div className="text-sm text-text-muted">Nothing logged here yet.</div>}
      </div>
    </section>
  )
}
