export function DayColumn({ day, meals, onSlotClick }) {
  return (
    <div className="card p-4">
      <div className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-text-primary">{day}</div>
      <div className="space-y-3">
        {meals?.length ? (
          meals.map((meal, idx) => (
            <div key={idx} className="rounded-xl border border-divider p-3 hover:border-divider cursor-pointer">
              <div className="font-medium text-text-primary">{meal.name}</div>
              <div className="text-xs text-text-muted">{meal.meal}</div>
            </div>
          ))
        ) : (
          <button onClick={onSlotClick} className="w-full rounded-xl border-2 border-dashed border-divider p-4 text-sm text-text-muted hover:border-divider hover:text-text-primary">
            + Add meal
          </button>
        )}
      </div>
    </div>
  )
}