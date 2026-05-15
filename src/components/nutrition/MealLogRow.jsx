export function MealLogRow({ item, onClick }) {
  return (
    <button type="button" onClick={() => onClick(item)} className="w-full rounded-2xl border border-divider bg-white px-4 py-3 text-left hover:bg-surface transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium text-text-primary">{item.entry_name}</div>
          <div className="mt-1 text-xs text-text-secondary">{Number(item.protein_g || 0)}p / {Number(item.carbs_g || 0)}c / {Number(item.fat_g || 0)}f</div>
          {item.notes ? <div className="mt-1 text-xs text-text-muted">{item.notes}</div> : null}
          {item.status === 'estimate_required' ? <div className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">Estimate required</div> : null}
        </div>
        <div className="shrink-0 text-sm font-semibold text-text-primary">{Number(item.calories || 0)} kcal</div>
      </div>
    </button>
  )
}
