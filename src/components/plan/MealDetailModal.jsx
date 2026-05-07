import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { normalizeRecipe } from '../../lib/recipeSchema'
import { formatIngredientAmount } from '../../utils/formatFractions'

function CloseIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M18 6 6 18" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m6 6 12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MinusIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PlusIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 5v14" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BackArrowIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M19 12H5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m12 5-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function formatQuantity(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return value || ''
  return formatIngredientAmount(number)
}

function normalizeDirections(meal, recipe) {
  const raw = meal?.directions ?? meal?.steps ?? meal?.instructions ?? meal?.method ?? recipe?.instructionGroups ?? []

  if (typeof raw === 'string') {
    return raw.split(/\r?\n+/).map((step) => step.trim()).filter(Boolean)
  }

  if (Array.isArray(raw)) {
    return raw.map((step) => {
      if (typeof step === 'string') return step.trim()
      return String(step?.text ?? step?.instruction ?? step?.step ?? '').trim()
    }).filter(Boolean)
  }

  if (Array.isArray(recipe?.instructionGroups)) {
    return recipe.instructionGroups.flatMap((group) => (group?.steps || []).map((step) => step?.text).filter(Boolean))
  }

  return []
}

function normalizeIngredients(recipe) {
  return recipe.ingredientGroups.flatMap((group) => group.ingredients || [])
}

export function MealDetailModal({ meal, isOpen, onClose, onStartCooking }) {
  const [servings, setServings] = useState(1)

  useEffect(() => {
    if (meal?.servings) setServings(Math.min(12, Math.max(1, Number(meal.servings) || 1)))
  }, [meal])

  // Escape key closes the modal reliably regardless of stacking context
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

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
  }), [meal])

  const baseServings = Math.max(1, Number(meal?.servings || recipe?.yield?.match(/\d+/)?.[0] || 1) || 1)
  const scale = servings / baseServings
  const ingredients = useMemo(() => normalizeIngredients(recipe), [recipe])
  const directions = useMemo(() => normalizeDirections(meal, recipe), [meal, recipe])
  const image = meal?.image_url || meal?.image || recipe?.imageUrl || null
  const title = meal?.title || meal?.name || 'Meal'

  // Enrichment fields from AI-generated meals (gracefully absent for catalog/manual meals)
  const whyNote = meal?.why_this_meal || null
  const flatTags = Array.isArray(meal?.tags) ? meal.tags.filter(Boolean) : []
  const visualCues = Array.isArray(meal?.visual_cues) ? meal.visual_cues : []
  const tips = Array.isArray(meal?.tips) ? meal.tips : (recipe?.tips?.length ? recipe.tips : [])
  const commonMistakes = Array.isArray(meal?.common_mistakes) ? meal.common_mistakes : []
  const easySwaps = Array.isArray(meal?.easy_swaps) ? meal.easy_swaps : []
  const nutrition = meal?.nutrition || recipe?.nutrition || null

  if (!isOpen || !meal) return null

  const content = (
    <div className="fixed inset-0 z-[200] bg-black/45" onClick={onClose}>
      {/* Flex column so the mobile back bar sits above the scrollable content */}
      <div
        className="absolute inset-x-0 bottom-0 top-0 flex flex-col md:items-center md:justify-center md:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile sticky back header — always visible while scrolling */}
        <div className="flex shrink-0 items-center gap-3 border-b border-surface-muted bg-white px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={onClose}
            style={{ touchAction: 'manipulation' }}
            className="flex cursor-pointer items-center gap-1.5 rounded-md text-sm font-medium text-ink-primary transition-colors duration-150 hover:text-stone-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
            aria-label="Back to plan"
          >
            <BackArrowIcon className="h-4 w-4" />
            Back
          </button>
          <span className="flex-1 truncate text-sm font-semibold text-ink-primary">{title}</span>
        </div>

        {/* Scrollable card area */}
        <div className="flex-1 overflow-y-auto w-full md:flex md:items-center md:justify-center">
          <div className="min-h-full bg-white md:min-h-0 md:w-full md:max-w-2xl md:overflow-hidden md:rounded-[28px]">
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-muted">
              {image ? <img src={image} alt={title} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-surface-muted" />}
              {/* Desktop-only close button overlaid on image */}
              <button
                type="button"
                onClick={onClose}
                className="absolute left-4 top-4 hidden h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/80 p-2 text-ink-primary backdrop-blur transition-colors duration-150 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 md:flex"
                aria-label="Close meal detail"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-4 pb-8 pt-5 md:px-6">
              {/* Title and timer pills */}
              <div>
                <h2 className="font-display text-2xl text-ink-primary">{title}</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {recipe.prepTime > 0 ? <span className="rounded-full bg-warm-50 px-3 py-1 text-xs text-ink-secondary">Prep {recipe.prepTime} min</span> : null}
                  {recipe.cookTime > 0 ? <span className="rounded-full bg-warm-50 px-3 py-1 text-xs text-ink-secondary">Cook {recipe.cookTime} min</span> : null}
                  {recipe.totalTime > 0 ? <span className="rounded-full bg-warm-50 px-3 py-1 text-xs text-ink-secondary">Total {recipe.totalTime} min</span> : null}
                  {recipe.tags?.mealType ? <span className="rounded-full bg-warm-50 px-3 py-1 text-xs text-ink-secondary">{recipe.tags.mealType}</span> : (meal?.meal ? <span className="rounded-full bg-warm-50 px-3 py-1 text-xs text-ink-secondary">{meal.meal}</span> : null)}
                </div>
              </div>

              {/* Why this meal — shown when AI provides a rationale */}
              {whyNote ? (
                <div className="rounded-xl border border-primary-100 bg-gradient-to-r from-primary-50 to-teal-50 p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-base leading-none mt-0.5">💡</span>
                    <div className="flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary-800">Why this meal</p>
                      <p className="mt-1 text-sm text-primary-700">{whyNote}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Flat tag pills */}
              {flatTags.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {flatTags.map((tag, i) => (
                    <span key={`${tag}-${i}`} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">{tag}</span>
                  ))}
                </div>
              ) : null}

              {/* Servings adjuster */}
              <div className="flex items-center justify-between rounded-2xl bg-surface-card px-4 py-3">
                <span className="text-sm font-semibold text-ink-primary">Servings</span>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setServings((current) => Math.max(1, current - 1))} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-surface-muted p-2 text-ink-primary transition-colors duration-150 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2" aria-label="Decrease servings">
                    <MinusIcon className="h-4 w-4" />
                  </button>
                  <span className="min-w-[2ch] text-center text-sm font-semibold tabular-nums text-ink-primary">{servings}</span>
                  <button type="button" onClick={() => setServings((current) => Math.min(12, current + 1))} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-surface-muted p-2 text-ink-primary transition-colors duration-150 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2" aria-label="Increase servings">
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Ingredients */}
              <section>
                <h3 className="mb-3 text-sm font-semibold text-ink-primary">Ingredients</h3>
                <div className="divide-y divide-surface-muted overflow-hidden rounded-2xl bg-white">
                  {ingredients.length > 0 ? ingredients.map((ingredient, index) => {
                    const amount = ingredient?.amount || ingredient?.quantity || ''
                    const scaledAmount = amount && !Number.isNaN(Number(amount)) ? formatQuantity(Number(amount) * scale) : amount
                    const line = [scaledAmount, ingredient?.unit || '', ingredient?.item || ingredient?.name || 'Ingredient'].filter(Boolean).join(' ')
                    return (
                      <div key={`${ingredient?.item || ingredient?.name || 'ingredient'}-${index}`} className="px-1 py-3 text-sm text-ink-primary">
                        <span className="tabular-nums">{line}</span>
                      </div>
                    )
                  }) : <div className="px-1 py-3 text-sm text-ink-secondary">No ingredients listed</div>}
                </div>
              </section>

              {/* Directions */}
              <section>
                <h3 className="mb-3 text-sm font-semibold text-ink-primary">Directions</h3>
                <ol className="space-y-4 pl-5 text-sm leading-7 text-ink-primary">
                  {directions.length > 0 ? directions.map((step, index) => (
                    <li key={`${index}-${step.slice(0, 24)}`} className="pl-1 marker:font-semibold marker:text-ink-secondary">{step}</li>
                  )) : <li className="list-none text-sm text-ink-secondary">No instructions returned</li>}
                </ol>
              </section>

              {/* Visual cues — shown when AI provides doneness signals */}
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

              {/* Start Cooking button — only shown when instructions exist and callback provided */}
              {directions.length > 0 && onStartCooking ? (
                <button
                  type="button"
                  onClick={onStartCooking}
                  className="w-full rounded-2xl bg-text-primary py-4 text-base font-semibold text-white transition-colors duration-150 hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 cursor-pointer"
                >
                  👨‍🍳 Start Cooking
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
