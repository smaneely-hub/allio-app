import { useState } from 'react'

const mealTypeStyles = {
  breakfast: { emoji: '🌅', gradient: 'from-yellow-50 to-orange-100' },
  lunch: { emoji: '☀️', gradient: 'from-green-50 to-emerald-100' },
  dinner: { emoji: '🍽️', gradient: 'from-primary-50 to-primary-100' },
  snack: { emoji: '🍎', gradient: 'from-rose-50 to-orange-100' },
}

export function MealCard({ meal, onToggleLock, onSwap, onSaveNote }) {
  const [expanded, setExpanded] = useState(false)
  const [note, setNote] = useState(meal.user_note || '')
  const [savingNote, setSavingNote] = useState(false)

  const mealType = (meal.meal || '').toLowerCase()
  const style = mealTypeStyles[mealType] || mealTypeStyles.dinner

  const handleSaveNote = async () => {
    setSavingNote(true)
    try {
      await onSaveNote(meal.id, note)
    } finally {
      setSavingNote(false)
    }
  }

  // Extract dietary tags from meal metadata
  const dietaryTags = []
  if (meal.vegetarian) dietaryTags.push({ label: 'Vegetarian', color: 'bg-green-100 text-green-700' })
  if (meal.gluten_free) dietaryTags.push({ label: 'GF', color: 'bg-amber-100 text-amber-700' })
  if (meal.dairy_free) dietaryTags.push({ label: 'DF', color: 'bg-blue-100 text-blue-700' })

  return (
    <div className={`rounded-2xl border p-4 shadow-sm transition-all duration-200 hover:shadow-md ${meal.locked ? 'border-primary-300 bg-primary-50' : meal.is_leftover ? 'border-dashed border-warm-200 bg-warm-50' : 'border-warm-200 bg-white'}`}>
      <div className={`h-36 -mx-4 -mt-4 mb-4 flex items-center justify-center rounded-t-2xl bg-gradient-to-br ${style.gradient}`}>
        <span className="text-5xl">{style.emoji}</span>
      </div>
        <button type="button" onClick={() => setExpanded(!expanded)} className="w-full text-left">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-display text-lg text-warm-900">{meal.name}</div>
            {dietaryTags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {dietaryTags.map((tag, i) => (
                  <span key={i} className={`rounded-full px-2 py-0.5 text-xs font-medium ${tag.color}`}>{tag.label}</span>
                ))}
              </div>
            )}
            <div className="mt-1 text-sm text-warm-400">{meal.servings} servings · prep {meal.prep_time_minutes} min</div>
          </div>
          <div className="text-xs font-medium text-warm-400">{expanded ? 'Collapse' : 'Expand'}</div>
        </div>
      </button>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => onToggleLock(meal.id, !meal.locked)} className="btn-ghost text-xs font-medium">
          {meal.locked ? '🔒 Unlock' : '🔓 Lock'}
        </button>
        <button type="button" onClick={() => onSwap(meal)} className="btn-ghost text-xs font-medium">
          🔄 Swap
        </button>
        <button type="button" onClick={() => navigator.clipboard.writeText(meal.name)} className="btn-ghost text-xs font-medium">
          📋 Copy
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4 border-t border-warm-100 pt-4">
          {/* Ingredients */}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-warm-500">Ingredients</div>
            <ul className="space-y-1 text-sm text-warm-700">
              {(meal.ingredients || []).map((ing, i) => (
                <li key={i} className="flex justify-between">
                  <span>{ing.item}</span>
                  <span className="text-warm-400">{ing.quantity} {ing.unit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Instructions */}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-warm-500">Instructions</div>
            <ol className="space-y-2 text-sm text-warm-700">
              {(meal.instructions || []).map((step, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-primary-400 font-medium">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Why this meal - styled as pull quote */}
          {meal.notes && (
            <div className="border-l-2 border-primary-300 pl-3 italic text-warm-600 text-sm">
              <span className="font-medium not-italic text-warm-700">Why this meal:</span> {meal.notes}
            </div>
          )}

          {/* User note */}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-warm-500">Your note</div>
            <textarea
              className="input w-full text-sm"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a personal note..."
            />
            <button type="button" onClick={handleSaveNote} disabled={savingNote} className="btn-secondary mt-2 text-xs">
              {savingNote ? 'Saving...' : 'Save note'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}