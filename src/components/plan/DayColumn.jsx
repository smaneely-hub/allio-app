export function DayColumn({ day, meals, onSlotClick }) {
  return (
    <div className="card p-4">
      <div className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-warm-900">{day}</div>
      <div className="space-y-3">
        {meals?.length ? (
          meals.map((meal, idx) => (
            <div key={idx} className="rounded-xl border border-warm-200 p-3 hover:border-warm-300 cursor-pointer">
              <div className="font-medium text-warm-900">{meal.name}</div>
              <div className="text-xs text-warm-400">{meal.meal}</div>
            </div>
          ))
        ) : (
          <button onClick={onSlotClick} className="w-full rounded-xl border-2 border-dashed border-warm-200 p-4 text-sm text-warm-400 hover:border-warm-300 hover:text-warm-700">
            + Add meal
          </button>
        )}
      </div>
    </div>
  )
}