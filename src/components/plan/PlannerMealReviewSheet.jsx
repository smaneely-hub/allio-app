import { SwipeCard } from '../SwipeCard'

/**
 * Full-screen review sheet shown after a Planner meal is generated or swapped.
 * Uses SwipeCard for swipe-to-accept / swipe-to-reject parity with Quick Meal.
 *
 * onAccept → keep the generated meal (already persisted)
 * onTryAnother → swap for a different meal (caller handles the swap call)
 */
export function PlannerMealReviewSheet({ meal, onAccept, onTryAnother, loading }) {
  if (!meal) return null

  const mealImage = {
    url: meal.image_url || meal.image || null,
    photographer: null,
    photographerUrl: null,
  }

  return (
    <div className="fixed inset-0 z-[150]">
      {/* Tapping the backdrop keeps the meal (same as "accept") */}
      <div className="absolute inset-0 bg-black/60" onClick={onAccept} />

      {/* Full-height content layer */}
      <div className="pointer-events-none absolute inset-0 flex flex-col">
        {/* Header bar */}
        <div className="pointer-events-auto flex shrink-0 items-center justify-between border-b border-surface-muted bg-white px-4 py-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-primary-700">
              {loading ? 'Finding another…' : 'New meal — swipe or tap'}
            </span>
          </div>
          <button
            type="button"
            onClick={onAccept}
            style={{ touchAction: 'manipulation' }}
            className="cursor-pointer rounded-full border border-surface-muted bg-white px-4 py-1.5 text-sm font-medium text-ink-primary transition-colors duration-150 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
          >
            Keep ✓
          </button>
        </div>

        {/* Card area — fills remaining viewport height */}
        <div className="pointer-events-auto relative flex-1 overflow-hidden">
          {loading ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-white">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-400 border-t-transparent" />
              <p className="text-sm text-text-secondary">Finding another option…</p>
            </div>
          ) : (
            <SwipeCard
              key={meal.id || meal.name}
              meal={meal}
              image={mealImage}
              onAccept={onAccept}
              onReject={onTryAnother}
            />
          )}
        </div>
      </div>
    </div>
  )
}
