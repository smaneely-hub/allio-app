import { SwipeCard } from './SwipeCard'

export function SwipeDeck({ items, batchLoading, onAccept, onReject, onEdit }) {
  const topItem = items[0]
  const previewItems = items.slice(1, 3)

  if (items.length === 0) {
    return (
      <div className="flex min-h-[520px] flex-col items-center justify-center gap-4 text-center">
        {batchLoading ? (
          <>
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-400 border-t-transparent" />
            <p className="text-sm text-text-secondary">Generating meal ideas…</p>
          </>
        ) : (
          <>
            <p className="text-4xl">🎉</p>
            <h3 className="font-display text-xl text-text-primary">That's all for now!</h3>
            <p className="text-sm text-text-secondary">Adjust your preferences and generate new ideas.</p>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center text-xs text-text-muted">
        {items.length} idea{items.length !== 1 ? 's' : ''} in queue
        {batchLoading && <span className="ml-2 text-primary-500">• generating more…</span>}
      </div>

      {/* Card stack */}
      <div className="relative mx-auto w-full" style={{ height: 520 }}>
        {/* Background preview cards */}
        {previewItems.map((item, i) => (
          <div
            key={item.meal.id || item.meal.name}
            className="absolute inset-0 rounded-3xl border border-divider bg-white"
            style={{
              transform: `translateY(${(i + 1) * 10}px) scale(${1 - (i + 1) * 0.04})`,
              zIndex: -i - 1,
              transition: 'transform 0.3s ease',
            }}
          />
        ))}

        {/* Top interactive card */}
        {topItem && (
          <SwipeCard
            key={topItem.meal.id || topItem.meal.name}
            meal={topItem.meal}
            image={topItem.image}
            onAccept={() => onAccept(topItem.meal)}
            onReject={() => onReject(topItem.meal)}
          />
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-8">
        <button
          type="button"
          onClick={() => topItem && onReject(topItem.meal)}
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-red-200 bg-white text-xl shadow-sm transition hover:border-red-400 hover:bg-red-50 active:scale-95"
          aria-label="Skip this meal"
        >
          ✕
        </button>
        <button
          type="button"
          onClick={() => topItem && onEdit(topItem.meal)}
          className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-warm-200 bg-white text-sm shadow-sm transition hover:border-warm-400 active:scale-95"
          aria-label="Refine constraints"
        >
          ✏️
        </button>
        <button
          type="button"
          onClick={() => topItem && onAccept(topItem.meal)}
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary-300 bg-white text-xl shadow-sm transition hover:border-primary-500 hover:bg-primary-50 active:scale-95"
          aria-label="Cook this meal"
        >
          ✓
        </button>
      </div>

      <p className="text-center text-xs text-text-muted">Swipe right to cook · Swipe left to skip · Tap ✓ or ✕</p>
    </div>
  )
}
