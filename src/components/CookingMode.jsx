import { useEffect, useState, useMemo } from 'react'
import { normalizeRecipe } from '../lib/recipeSchema'
import { InstructionText, TimerTrayOverlay } from './TimerChip'

// Screen wake lock — prevents device from sleeping while cooking.
// Fails silently on unsupported browsers or if permission is denied.
function useWakeLock() {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return undefined

    let released = false
    let wakeLock = null

    const attachReleaseListener = (sentinel) => {
      sentinel.addEventListener('release', () => {
        wakeLock = null
        if (!released && document.visibilityState === 'visible') {
          void acquire()
        }
      })
    }

    async function acquire() {
      if (released || document.visibilityState !== 'visible') return
      try {
        const sentinel = await navigator.wakeLock.request('screen')
        wakeLock = sentinel
        attachReleaseListener(sentinel)
      } catch {
        // Unsupported, denied, or temporarily unavailable.
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void acquire()
      }
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      released = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      wakeLock?.release().catch(() => {})
    }
  }, [])
}


export function CookingMode({ meal, onExit }) {
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

  const allSteps = useMemo(() => {
    const steps = []
    for (const group of recipe.instructionGroups) {
      for (const step of group.steps) {
        steps.push({ ...step, groupLabel: group.label || null })
      }
    }
    return steps
  }, [recipe.instructionGroups])

  const [checkedSteps, setCheckedSteps] = useState(new Set())
  const [checkedIngredients, setCheckedIngredients] = useState({})
  const [showIngredients, setShowIngredients] = useState(false)

  const toggleStep = (i) => setCheckedSteps(prev => {
    const next = new Set(prev)
    next.has(i) ? next.delete(i) : next.add(i)
    return next
  })

  const toggleIngredient = (key) =>
    setCheckedIngredients(prev => ({ ...prev, [key]: !prev[key] }))


  if (allSteps.length === 0) {
    return (
      <div className="flex min-h-[520px] flex-col items-center justify-center gap-4 text-center">
        <p className="text-text-secondary">No instructions found for this recipe.</p>
        <button type="button" onClick={onExit}
          className="rounded-full bg-primary-500 px-6 py-2 text-sm font-semibold text-white">
          Exit
        </button>
      </div>
    )
  }

  const doneCount = checkedSteps.size
  const totalCount = allSteps.length

  return (
    <div className="flex w-full max-w-full flex-col overflow-x-hidden" style={{ boxSizing: 'border-box' }}>
      <div className="sticky top-0 z-10 bg-white pb-3 border-b border-divider">
          <div className="flex items-center justify-between mb-2">
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
            <span className="shrink-0 text-xs font-medium text-text-muted tabular-nums">
              {doneCount}/{totalCount}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-warm-100">
            <div
              className="h-full rounded-full bg-primary-400 transition-all duration-500"
              style={{ width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>

      <div className="space-y-5 py-4" style={{ paddingBottom: '96px', boxSizing: 'border-box' }}>
          {/* Ingredients accordion */}
          <div className="rounded-2xl border border-divider overflow-hidden">
            <button
              type="button"
              onClick={() => setShowIngredients(s => !s)}
              className="flex w-full items-center justify-between px-4 py-3 bg-warm-50 hover:bg-warm-100 transition text-left"
            >
              <span className="text-sm font-semibold text-text-primary">Ingredients</span>
              <span className="text-xs text-text-muted">{showIngredients ? '▲ Hide' : '▼ Show'}</span>
            </button>
            {showIngredients && (
              <div className="p-4 space-y-4">
                {recipe.ingredientGroups.map((group, gi) => (
                  <div key={`${group.label || 'ig'}-${gi}`}>
                    {group.label && (
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{group.label}</div>
                    )}
                    <ul className="space-y-1">
                      {group.ingredients.map((ing, idx) => {
                        const key = `${gi}-${idx}`
                        const checked = Boolean(checkedIngredients[key])
                        return (
                          <li key={key}>
                            <button
                              type="button"
                              onClick={() => toggleIngredient(key)}
                              className={`flex w-full items-start gap-3 rounded-xl px-2 py-1.5 text-left transition ${checked ? 'opacity-40' : 'hover:bg-warm-50'}`}
                            >
                              <span className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 transition ${checked ? 'border-primary-500 bg-primary-500' : 'border-divider'}`} />
                              <span className={`break-words text-sm [overflow-wrap:anywhere] ${checked ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                                <strong>{[ing.amount, ing.unit].filter(Boolean).join(' ')}</strong>
                                {(ing.amount || ing.unit) && ' '}
                                {ing.item}
                                {ing.note && <span className="text-text-secondary"> ({ing.note})</span>}
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* All instructions — continuous scroll, checkable */}
          <div>
            <div className="mb-3 text-sm font-semibold text-text-primary">Instructions</div>
            <div className="space-y-2">
              {allSteps.map((step, i) => {
                const checked = checkedSteps.has(i)
                const showGroupLabel = step.groupLabel &&
                  (i === 0 || allSteps[i - 1].groupLabel !== step.groupLabel)
                return (
                  <div key={i}>
                    {showGroupLabel && (
                      <div className={`mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted ${i > 0 ? 'mt-4' : ''}`}>
                        {step.groupLabel}
                      </div>
                    )}
                    <div className={`w-full max-w-full overflow-x-hidden rounded-xl border transition-colors ${checked ? 'border-primary-100 bg-primary-50' : 'border-divider bg-white'}`} style={{ boxSizing: 'border-box' }}>
                      <button
                        type="button"
                        onClick={() => toggleStep(i)}
                        className="flex w-full items-start gap-3 p-4 text-left"
                      >
                        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition ${
                          checked
                            ? 'border-primary-500 bg-primary-500 text-white'
                            : 'border-divider bg-white text-text-muted'
                        }`}>
                          {checked ? '✓' : i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`break-words text-sm leading-6 [overflow-wrap:anywhere] ${checked ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                            <InstructionText text={step.text} contextKey={`cook-${meal.id || meal.name}-${i}`} />
                          </p>
                          {step.tip && !checked && (
                            <div className="mt-2 rounded-lg bg-primary-50 px-3 py-2">
                              <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Tip · </span>
                              <span className="text-xs text-primary-800">{step.tip}</span>
                            </div>
                          )}
                        </div>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sign-up nudge */}
          <div className="rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3">
            <p className="text-xs text-primary-800">
              Want this saved to your meal plan?{' '}
              <a href="/login" className="font-semibold underline">Create a free account →</a>
            </p>
          </div>
      </div>

      <TimerTrayOverlay />
    </div>
  )
}
