import { useEffect, useState, useMemo } from 'react'
import { normalizeRecipe } from '../lib/recipeSchema'
import { InstructionText, TimerTrayOverlay } from './TimerChip'
import { formatIngredientAmount } from '../utils/formatFractions'

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
    prepTime: meal?.prepTime ?? meal?.prep_time_minutes,
    cookTime: meal?.cookTime ?? meal?.cook_time_minutes,
    totalTime: meal?.totalTime ?? meal?.total_time_minutes,
    ingredientGroups: meal?.ingredientGroups,
    instructionGroups: meal?.instructionGroups,
    substitutions: meal?.substitutions,
    nutrition: meal?.nutrition,
    tags: meal?.tags ?? meal?.recipeTags,
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
      <div className="sticky top-0 z-10 border-b border-divider bg-bg-soft/95 px-4 pb-3 pt-3 backdrop-blur-sm">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 mb-2">
            <button
              type="button"
              onClick={onExit}
              className="rounded-full border border-divider bg-surface-card px-3 py-1.5 text-xs font-semibold text-text-secondary transition hover:bg-warm-50"
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

      <div className="mx-auto max-w-2xl space-y-5 px-4 py-5" style={{ paddingBottom: '96px', boxSizing: 'border-box' }}>
          <header className="rounded-[28px] bg-surface-card px-5 py-5 shadow-lg">
            {recipe.imageUrl ? (
              <div className="mb-4 overflow-hidden rounded-2xl">
                <img src={recipe.imageUrl} alt={recipe.title} className="h-56 w-full object-cover" loading="lazy" />
              </div>
            ) : null}
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">Cooking mode</div>
            <h1 className="mt-2 font-display text-3xl leading-tight text-text-primary sm:text-4xl">{recipe.title}</h1>
            {recipe.description ? <p className="mt-3 text-[15px] leading-7 text-text-secondary">{recipe.description}</p> : null}

            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
              <span className="rounded-full bg-warm-100 px-3 py-1.5">Prep {recipe.prepTime || 0} min</span>
              <span className="rounded-full bg-warm-100 px-3 py-1.5">Cook {recipe.cookTime || 0} min</span>
              <span className="rounded-full bg-warm-100 px-3 py-1.5">Total {recipe.totalTime || (recipe.prepTime + recipe.cookTime)} min</span>
              {recipe.yield ? <span className="rounded-full bg-warm-100 px-3 py-1.5">{recipe.yield}</span> : null}
              <span className="rounded-full border border-primary-100 bg-primary-50 px-3 py-1.5 font-semibold text-primary-700">{recipe.difficulty}</span>
            </div>
          </header>

          <section className="rounded-[24px] border border-divider bg-surface-card px-5 py-5 shadow-sm">
            <h2 className="mb-4 font-display text-xl text-text-primary">Ingredients</h2>
            <div className="space-y-5">
              {recipe.ingredientGroups.map((group, gi) => (
                <div key={`${group.label || 'ig'}-${gi}`}>
                  {group.label ? (
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">{group.label}</div>
                  ) : null}
                  <ul className="space-y-3">
                    {group.ingredients.map((ing, idx) => {
                      const key = `${gi}-${idx}`
                      const checked = Boolean(checkedIngredients[key])
                      const amountText = formatIngredientAmount(ing.amount)
                      return (
                        <li key={key}>
                          <button
                            type="button"
                            onClick={() => toggleIngredient(key)}
                            className={`flex w-full items-start gap-3 rounded-2xl px-1 py-1 text-left transition ${checked ? 'opacity-45' : 'opacity-100'}`}
                          >
                            <span className={`mt-1 h-5 w-5 shrink-0 rounded-full border ${checked ? 'border-primary-500 bg-primary-500' : 'border-divider bg-surface-card'}`} />
                            <span className={`block text-[15px] leading-7 ${checked ? 'line-through' : ''}`}>
                              <strong className="font-semibold text-text-primary">{[amountText, ing.unit].filter(Boolean).join(' ')}</strong>
                              {amountText || ing.unit ? ' ' : ''}
                              <span className="text-text-primary">{ing.item}</span>
                              {ing.note ? <span className="text-text-secondary"> ({ing.note})</span> : null}
                              {ing.optional ? <span className="text-text-muted"> (optional)</span> : null}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border border-divider bg-surface-card px-5 py-5 shadow-sm">
            <h2 className="mb-4 font-display text-xl text-text-primary">Instructions</h2>
            <div className="space-y-6">
              {allSteps.map((step, i) => {
                const checked = checkedSteps.has(i)
                const showGroupLabel = step.groupLabel &&
                  (i === 0 || allSteps[i - 1].groupLabel !== step.groupLabel)
                return (
                  <div key={i}>
                    {showGroupLabel && (
                      <div className={`mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted ${i > 0 ? 'mt-6' : ''}`}>
                        {step.groupLabel}
                      </div>
                    )}
                    <div className={`flex gap-4 rounded-2xl px-1 py-1 transition ${checked ? 'opacity-55' : 'opacity-100'}`} style={{ boxSizing: 'border-box' }}>
                      <button
                        type="button"
                        onClick={() => toggleStep(i)}
                        className="flex w-full items-start gap-4 text-left"
                      >
                        <span className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition ${
                          checked
                            ? 'bg-primary-500 text-white'
                            : 'bg-warm-100 text-text-primary'
                        }`}>
                          {checked ? '✓' : i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`break-words text-[15px] leading-7 [overflow-wrap:anywhere] ${checked ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                            <InstructionText text={step.text} contextKey={`cook-${meal.id || meal.name}-${i}`} />
                          </p>
                          {step.tip && !checked && (
                            <div className="mt-3 rounded-2xl bg-warm-100 px-4 py-3 text-sm leading-6 text-text-secondary">
                              <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Tip</div>
                              {step.tip}
                            </div>
                          )}
                        </div>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

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
