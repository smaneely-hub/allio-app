import { useState } from 'react'

export function MealCard({ meal, onToggleLock, onSwap, onSaveNote }) {
  const [expanded, setExpanded] = useState(false)
  const [note, setNote] = useState(meal.user_note || '')
  const [savingNote, setSavingNote] = useState(false)

  const handleSaveNote = async () => {
    setSavingNote(true)
    try {
      await onSaveNote(meal.id, note)
    } finally {
      setSavingNote(false)
    }
  }

  return (
    <div className={`rounded-2xl border p-4 shadow-sm transition-all duration-200 hover:shadow-md ${meal.locked ? 'border-primary-300 bg-primary-50' : meal.is_leftover ? 'border-dashed border-warm-200 bg-warm-50' : 'border-warm-200 bg-white'}`}>
      <div className="h-36 -mx-4 -mt-4 mb-4 flex items-center justify-center rounded-t-2xl bg-gradient-to-br from-primary-50 to-primary-100">
        <span className="text-5xl">🍽️</span>
      </div>
        <button type="button" onClick={() => setExpanded(!expanded)} className="w-full text-left">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-display text-lg text-warm-900">{meal.name}</div>
            <div className="mt-1 text-sm text-warm-400">{meal.servings} servings · prep {meal.prep_time_minutes} min</div>
          </div>
          <div className="text-xs font-medium text-warm-400">{expanded ? 'Collapse' : 'Expand'}</div>
        </div>
      </button>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => onToggleLock(meal.id, !meal.locked)} className="btn-ghost text-xs font-medium">
          {meal.locked ? '🔒 Unlock' : '🔓 Lock / Accept'}
        </button>
        <button type="button" onClick={() => onSwap(meal)} className="btn-ghost text-xs font-medium">
          🔄 Swap
        </button>
      </div>

      <div className="mt-4 space-y-2">
        <label className="text-xs font-medium uppercase tracking-wide text-warm-400">Meal note</label>
        <div className="flex gap-2">
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Add a note for this meal"
            className="input text-sm"
          />
          <button type="button" onClick={handleSaveNote} disabled={savingNote} className="btn-primary text-sm px-3">
            {savingNote ? '...' : 'Save'}
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="mt-4 space-y-4 border-t border-warm-200 pt-4 text-sm text-warm-700">
          <div>
            <div className="mb-2 font-medium text-warm-900">Serves</div>
            <div>{(meal.attendees || []).join(', ')}</div>
          </div>
          <div>
            <div className="mb-2 font-medium text-warm-900">Ingredients</div>
            <ul className="list-disc space-y-1 pl-5">
              {(meal.ingredients || []).map((ingredient, index) => (
                <li key={`${meal.id}-ingredient-${index}`}>
                  {ingredient.quantity} {ingredient.unit} {ingredient.item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-2 font-medium text-warm-900">Instructions</div>
            <ol className="list-decimal space-y-1 pl-5">
              {(meal.instructions || []).map((step, index) => (
                <li key={`${meal.id}-step-${index}`}>{step}</li>
              ))}
            </ol>
          </div>
          <div>
            <div className="font-medium text-warm-900">AI notes</div>
            <div>{meal.notes || 'No notes.'}</div>
          </div>
          {meal.swapped ? (
            <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Swapped from: {meal.original_name}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
