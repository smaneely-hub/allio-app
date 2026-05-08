import { useMemo } from 'react'
import { normalizeRecipe } from '../lib/recipeSchema'
import { formatIngredientAmount } from '../utils/formatFractions'
import { InstructionText } from './TimerChip'

/**
 * Shared meal detail body used by both Quick Meal and Planner surfaces.
 *
 * Renders: ingredients (grouped), instructions (grouped with timer chips + step tips),
 * enrichment sections (visual cues, tips, common mistakes, easy swaps), nutrition,
 * and an optional Start Cooking button.
 *
 * Does NOT render: image, title, meta time pills, why_this_meal, or tag pills —
 * each caller controls those since layout/styling differs per surface.
 *
 * @param {object}   meal              - Raw or normalized meal record
 * @param {string}   contextKeyPrefix  - Prefix for InstructionText timer keys (ensures uniqueness)
 * @param {number}   scale             - Ingredient scale multiplier (default 1; integer/decimal amounts only)
 * @param {Function} onStartCooking    - If provided, renders a Start Cooking button
 */
export function MealDetailBody({ meal, contextKeyPrefix = 'meal', scale = 1, onStartCooking }) {
  const recipe = useMemo(() => normalizeRecipe({
    ...meal,
    title: meal?.title || meal?.name,
    prepTime: meal?.prep_time_minutes,
    cookTime: meal?.cook_time_minutes,
    totalTime: meal?.total_time_minutes,
    ingredientGroups: meal?.ingredientGroups,
    instructionGroups: meal?.instructionGroups,
    ingredients: meal?.ingredients,
    instructions: meal?.instructions,
    directions: meal?.directions,
    method: meal?.method,
    substitutions: meal?.substitutions,
    nutrition: meal?.nutrition,
    tags: meal?.recipeTags,
    sourceNote: meal?.sourceNote,
  }), [meal])

  const visualCues = Array.isArray(meal?.visual_cues) ? meal.visual_cues : []
  const tips = Array.isArray(meal?.tips) && meal.tips.length > 0 ? meal.tips : (recipe.tips?.length ? recipe.tips : [])
  const commonMistakes = Array.isArray(meal?.common_mistakes) ? meal.common_mistakes : []
  const easySwaps = Array.isArray(meal?.easy_swaps) ? meal.easy_swaps : []
  const nutrition = meal?.nutrition || recipe?.nutrition || null

  const hasIngredients = recipe.ingredientGroups?.length > 0
  const hasInstructions = recipe.instructionGroups?.length > 0

  return (
    <div className="space-y-5">
      {/* Ingredients */}
      {hasIngredients ? (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-ink-primary">Ingredients</h3>
          <div className="space-y-4">
            {recipe.ingredientGroups.map((group, gi) => (
              <div key={`${group.label || 'ingredients'}-${gi}`}>
                {group.label ? (
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink-secondary">{group.label}</div>
                ) : null}
                <ul className="space-y-1">
                  {group.ingredients.map((ingredient, i) => {
                    const rawAmount = ingredient?.amount ?? ''
                    const scaledAmount = scale !== 1 && rawAmount && Number.isFinite(Number(rawAmount))
                      ? formatIngredientAmount(Number(rawAmount) * scale)
                      : rawAmount
                    const line = [scaledAmount, ingredient?.unit, ingredient?.item || ingredient?.name].filter(Boolean).join(' ')
                    return (
                      <li key={`${gi}-${i}-${ingredient.item}`} className="text-sm text-ink-primary">
                        {line || 'Ingredient'}
                        {ingredient.note ? <span className="text-ink-secondary"> ({ingredient.note})</span> : null}
                        {ingredient.optional ? <span className="text-ink-secondary"> (optional)</span> : null}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Instructions — grouped, numbered globally, with timer chips and step tips */}
      {hasInstructions ? (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-ink-primary">Instructions</h3>
          <div className="space-y-6">
            {(() => {
              let stepCounter = 0
              return recipe.instructionGroups.map((group, gi) => (
                <div key={`${group.label || 'instructions'}-${gi}`}>
                  {group.label ? (
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-ink-secondary">{group.label}</div>
                  ) : null}
                  <ol className="space-y-4">
                    {group.steps.map((step, i) => {
                      stepCounter += 1
                      const counter = stepCounter
                      return (
                        <li key={`${gi}-${i}`} className="flex gap-3">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-warm-100 text-xs font-semibold text-text-primary tabular-nums">
                            {counter}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-sm leading-7 text-ink-primary [overflow-wrap:anywhere]">
                              <InstructionText text={step.text} contextKey={`${contextKeyPrefix}-${gi}-${i}`} />
                            </p>
                            {step.tip ? (
                              <div className="mt-2 rounded-xl bg-[#f4efe6] px-3 py-2">
                                <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Tip · </span>
                                <span className="text-sm text-ink-secondary">{step.tip}</span>
                              </div>
                            ) : null}
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                </div>
              ))
            })()}
          </div>
        </section>
      ) : null}

      {/* Visual cues */}
      {visualCues.length > 0 ? (
        <div className="rounded-xl bg-yellow-50 p-3">
          <h4 className="mb-1 text-xs font-semibold text-yellow-800">👀 Look for</h4>
          <ul className="space-y-1 text-sm text-yellow-700">
            {visualCues.map((cue, i) => <li key={i}>• {cue}</li>)}
          </ul>
        </div>
      ) : null}

      {/* Tips */}
      {tips.length > 0 ? (
        <div className="rounded-xl bg-blue-50 p-3">
          <h4 className="mb-1 text-xs font-semibold text-blue-800">💡 Tips</h4>
          <ul className="space-y-1 text-sm text-blue-700">
            {tips.map((tip, i) => <li key={i}>• {tip}</li>)}
          </ul>
        </div>
      ) : null}

      {/* Common mistakes */}
      {commonMistakes.length > 0 ? (
        <div className="rounded-xl bg-red-50 p-3">
          <h4 className="mb-1 text-xs font-semibold text-red-800">⚠️ Avoid</h4>
          <ul className="space-y-1 text-sm text-red-700">
            {commonMistakes.map((m, i) => <li key={i}>• {m}</li>)}
          </ul>
        </div>
      ) : null}

      {/* Easy swaps */}
      {easySwaps.length > 0 ? (
        <div className="rounded-xl bg-green-50 p-3">
          <h4 className="mb-1 text-xs font-semibold text-green-800">🔄 Easy swaps</h4>
          <ul className="space-y-1 text-sm text-green-700">
            {easySwaps.map((s, i) => <li key={i}>• {s}</li>)}
          </ul>
        </div>
      ) : null}

      {/* Nutrition snapshot */}
      {nutrition ? (
        <div className="rounded-2xl bg-surface-card p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-secondary">Nutrition per serving</div>
          <div className="grid grid-cols-4 gap-2">
            {(['calories', 'protein', 'carbs', 'fat']).map((key) => (
              <div key={key} className="text-center">
                <div className="text-xs text-ink-secondary capitalize">{key}</div>
                <div className="text-sm font-semibold text-ink-primary">{nutrition[key] || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Start Cooking button */}
      {hasInstructions && onStartCooking ? (
        <button
          type="button"
          onClick={onStartCooking}
          className="w-full cursor-pointer rounded-2xl bg-text-primary py-4 text-base font-semibold text-white transition-colors duration-150 hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
        >
          👨‍🍳 Start Cooking
        </button>
      ) : null}
    </div>
  )
}
