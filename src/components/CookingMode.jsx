import { useEffect, useState, useMemo } from 'react'
import { normalizeRecipe } from '../lib/recipeSchema'

// Requests a screen wake lock and re-acquires it on tab visibility change.
// Fails silently — not supported on iOS < 16.4 or if permission is denied.
function useWakeLock() {
  useEffect(() => {
    let wakeLock = null

    const acquire = async () => {
      if (!('wakeLock' in navigator)) return
      try {
        wakeLock = await navigator.wakeLock.request('screen')
      } catch {
        // Denied or browser doesn't support it — cooking continues fine
      }
    }

    const onVisibilityChange = () => {
      // Re-acquire after user switches back to the tab/app
      if (document.visibilityState === 'visible') acquire()
    }

    acquire()
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      wakeLock?.release().catch(() => {})
    }
  }, [])
}

export function CookingMode({ meal, image, onExit }) {
  useWakeLock()

  const recipe = useMemo(() => normalizeRecipe({
    ...meal,
    title: meal?.title || meal?.name,
    prepTime: meal?.prep_time_minutes,
    cookTime: meal?.cook_time_minutes,
    totalTime: meal?.total_time_minutes,
    ingredientGroups: meal?.ingredientGroups,
    instructionGroups: meal?.instructionGroups,
    substitutions: meal?.substitutions,
    nutrition: meal?.nutrition,
    tags: meal?.recipeTags,
    sourceNote: meal?.sourceNote,
  }), [meal])

  // Flatten steps from all instruction groups into a single ordered list
  const allSteps = useMemo(() => {
    const steps = []
    for (const group of recipe.instructionGroups) {
      for (const step of group.steps) {
        steps.push({ ...step, groupLabel: group.label || null })
      }
    }
    return steps
  }, [recipe.instructionGroups])

  const [stepIndex, setStepIndex] = useState(0)
  const [checkedIngredients, setCheckedIngredients] = useState({})
  const [showIngredients, setShowIngredients] = useState(false)

  const currentStep = allSteps[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === allSteps.length - 1

  const toggleIngredient = (key) =>
    setCheckedIngredients((prev) => ({ ...prev, [key]: !prev[key] }))

  if (allSteps.length === 0) {
    return (
      <div className="flex min-h-[520px] flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-text-secondary">No instructions found for this recipe.</p>
        <button type="button" onClick={onExit}
          className="rounded-full bg-primary-500 px-6 py-2 text-sm font-semibold text-white">
          Exit
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-[520px] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-divider pb-3">
        <button
          type="button"
          onClick={onExit}
          className="rounded-full border border-divider bg-white px-3 py-1.5 text-xs font-semibold text-text-secondary transition hover:bg-warm-50"
        >
          ← Exit
        </button>
        <div className="min-w-0 flex-1 px-3 text-center">
          <div className="text-xs font-semibold uppercase tracking-wide text-primary-700">Now cooking</div>
          <div className="truncate text-sm font-semibold text-text-primary">{recipe.title}</div>
        </div>
        <button
          type="button"
          onClick={() => setShowIngredients((s) => !s)}
          className="shrink-0 rounded-full border border-divider bg-white px-3 py-1.5 text-xs font-semibold text-text-secondary transition hover:bg-warm-50"
        >
          {showIngredients ? 'Steps' : 'Ingredients'}
        </button>
      </div>

      {showIngredients ? (
        /* Ingredients panel */
        <div className="flex-1 overflow-y-auto py-4">
          <div className="space-y-5">
            {recipe.ingredientGroups.map((group, groupIndex) => (
              <div key={`${group.label || 'ingredients'}-${groupIndex}`}>
                {group.label && (
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{group.label}</div>
                )}
                <ul className="space-y-2">
                  {group.ingredients.map((ingredient, index) => {
                    const key = `${groupIndex}-${index}`
                    const checked = Boolean(checkedIngredients[key])
                    return (
                      <li key={key}>
                        <button
                          type="button"
                          onClick={() => toggleIngredient(key)}
                          className={`flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition ${checked ? 'opacity-40' : ''}`}
                        >
                          <span className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border ${checked ? 'border-primary-500 bg-primary-500' : 'border-divider bg-white'}`} />
                          <span className={`text-sm ${checked ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                            <strong>{[ingredient.amount, ingredient.unit].filter(Boolean).join(' ')}</strong>
                            {(ingredient.amount || ingredient.unit) ? ' ' : ''}
                            {ingredient.item}
                            {ingredient.note ? <span className="text-text-secondary"> ({ingredient.note})</span> : null}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Step-by-step view */
        <div className="flex flex-1 flex-col py-4">
          {/* Progress bar */}
          <div className="mb-4">
            <div className="mb-1 flex justify-between text-xs text-text-muted">
              <span>Step {stepIndex + 1} of {allSteps.length}</span>
              {currentStep.groupLabel && (
                <span className="font-medium text-primary-600">{currentStep.groupLabel}</span>
              )}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-warm-100">
              <div
                className="h-full rounded-full bg-primary-400 transition-all duration-300"
                style={{ width: `${((stepIndex + 1) / allSteps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Step content */}
          <div className="flex-1 rounded-2xl bg-warm-50 p-5">
            <p className="text-lg leading-8 text-text-primary">{currentStep.text}</p>
            {currentStep.tip && (
              <div className="mt-4 rounded-xl bg-primary-50 px-4 py-3">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">Tip</div>
                <p className="text-sm text-primary-800">{currentStep.tip}</p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              disabled={isFirst}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-divider bg-white text-lg text-text-secondary transition hover:border-warm-300 disabled:opacity-30"
              aria-label="Previous step"
            >
              ←
            </button>

            {isLast ? (
              <button
                type="button"
                onClick={onExit}
                className="flex-1 rounded-full bg-primary-500 py-3 text-sm font-semibold text-white transition hover:bg-primary-600 active:scale-95"
              >
                Done cooking
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStepIndex((i) => Math.min(allSteps.length - 1, i + 1))}
                className="flex-1 rounded-full bg-primary-500 py-3 text-sm font-semibold text-white transition hover:bg-primary-600 active:scale-95"
              >
                Next step →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sign-up nudge at the bottom */}
      <div className="mt-4 rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3">
        <p className="text-xs text-primary-800">
          Want this saved to your meal plan?{' '}
          <a href="/login" className="font-semibold underline">Create a free account →</a>
        </p>
      </div>
    </div>
  )
}
