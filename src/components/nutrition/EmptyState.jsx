export function EmptyState({ onAdd }) {
  return (
    <div className="rounded-3xl border border-dashed border-divider bg-white p-6 text-center">
      <div className="font-display text-2xl text-text-primary">No meals logged yet</div>
      <p className="mt-2 text-sm text-text-secondary">Cook from the planner or add something manually to start tracking today.</p>
      <button type="button" onClick={onAdd} className="btn-primary mt-4 text-sm">Add a meal</button>
    </div>
  )
}
